import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { images, selectedModel } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0 || !selectedModel) {
      return NextResponse.json({ error: '이미지와 모델 정보가 누락되었습니다.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY!);
    const modelId = selectedModel.includes('models/') ? selectedModel : `models/${selectedModel}`;
    const model = genAI.getGenerativeModel({ model: modelId });

    // 🌟 [최적화] 정확도를 위한 낮은 온도 설정 및 JSON 모드 강제
    const generationConfig = {
      temperature: 0.1,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096, // 31일치 데이터를 충분히 담을 수 있는 크기
      responseMimeType: "application/json",
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const allParts: any[] = images.map((image: any) => ({
      inlineData: { mimeType: image.mimeType, data: image.imageBase64 },
    }));

    allParts.push({
      text: `
        명령: 이미지 속 사원 1명의 12월 전체 출퇴근 기록을 추출하여 '압축된 JSON' 배열로 반환하라.
        
        [필독 지침]
        1. 성명 인식: 성명란의 글자를 정확히 읽을 것. 특히 '엔니'를 '언니'로 오인하지 마라.
        2. 이미지 구성: 제공된 2장의 이미지는 각각 상반기(1~15일)와 하반기(16~31일) 기록이다. 두 장의 데이터를 합쳐서 하나의 통합 배열로 만들어라.
        3. 필기 우선: 도장 옆에 볼펜으로 수정된 숫자(예: 10:30)가 있다면 해당 숫자를 도장보다 우선하여 기록하라.
        4. 압축 출력: 토큰 절약을 위해 JSON 결과값에서 줄바꿈, 공백, 들여쓰기를 절대 사용하지 말고 모든 데이터를 한 줄(Minified)로 붙여서 출력하라.
        
        형식: [{"name":"이름","day":"DD","sh":"HH","sm":"mm","eh":"HH","em":"mm"}]
      `,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: allParts }],
      generationConfig,
      safetySettings,
    });

    const response = await result.response;
    const text = response.text();
    console.log("AI Response (Raw):", text);

    let parsedShifts = [];
    let jsonString = text.trim();
    let isTruncated = false; // 🌟 잘림 여부 플래그

    try {
      parsedShifts = JSON.parse(jsonString);
    } catch (parseError) {
      console.warn("JSON 파싱 실패. 잘린 데이터 복구 시도 중...");
      isTruncated = true; // 복구 로직 진입 시 플래그 설정

      const startIndex = jsonString.indexOf('[');
      if (startIndex !== -1) {
        let potentialJson = jsonString.substring(startIndex);
        let lastValidIndex = -1;

        for (let i = potentialJson.length - 1; i >= 0; i--) {
          if (potentialJson[i] === '}' || potentialJson[i] === ']') {
            lastValidIndex = i;
            break;
          }
        }

        if (lastValidIndex !== -1) {
          potentialJson = potentialJson.substring(0, lastValidIndex + 1);
          potentialJson = potentialJson.replace(/,\s*$/, ""); 
          if (potentialJson.endsWith('}')) {
            potentialJson += ']';
          }
          try {
            parsedShifts = JSON.parse(potentialJson);
            console.log("잘린 JSON 복구 성공");
          } catch (e) {
            parsedShifts = [];
          }
        }
      }
    }

    // 🌟 [2차 방어선] 이름 보정 로직 (AI가 '언니'라고 응답해도 '엔니'로 강제 수정)
    const correctedShifts = (parsedShifts || []).map((s: any) => ({
      ...s,
      name: s.name === '언니' ? '엔니' : s.name
    }));

    return NextResponse.json(correctedShifts, {
      headers: isTruncated ? { 'X-AI-Response-Truncated': 'true' } : {}
    });

  } catch (error: any) {
    console.error("Gemini API 상세 에러:", error);
    if (error.status === 503 || error.message?.includes('503') || error.message?.includes('overloaded')) {
      return NextResponse.json(
        { error: "현재 서버 사용량이 많습니다. 시스템이 곧 자동으로 재시도합니다." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: error.message || "분석 중 알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
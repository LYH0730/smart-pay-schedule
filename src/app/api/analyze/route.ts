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
        명령: 제공된 2장의 이미지(출퇴근 카드 앞/뒷면)에서 사원의 성명과 일자별 출퇴근 기록을 추출하여 통합된 JSON으로 반환하라.

        [필독 지침]
        1. 이미지 구성: 2장의 이미지는 각각 상반기(1~15일)와 하반기(16~31일) 기록이다. 하나의 'attendance' 객체로 합쳐라.
        2. 성명 인식: 이미지 최상단의 이름을 정확히 읽어라. ('엔니'를 '언니'로 오인 주의)
        3. 1:1 행(Row) 매칭 (매우 중요): 인접한 날짜(예: 9일과 10일)의 데이터가 위아래로 섞이거나 병합되지 않도록 주의하라. 맨 왼쪽의 '날짜 숫자'와 완벽하게 동일한 가로 선상에 있는 시간만 해당 날짜에 넣어라.
        4. 시간 추출 패턴 주의: 도장에 찍힌 '날짜(DD)+시간(HH:mm)' (예: '0216:55')에서 앞의 세로 숫자(02)는 무시하고 뒤의 시간(16:55)만 추출하라. 볼펜 수정이 있다면 최우선으로 하라.
        5. 데이터 구조 단순화 (중요): 시/분을 나누지 말고 "HH:mm" 형태의 단일 문자열로 출력하라. 출근은 "s", 퇴근은 "e" 키를 사용하라. (예: {"s":"10:25", "e":"16:55"})
        6. 1~31일 고정 슬롯: 데이터가 없는 날짜는 빈 배열([])로 처리하여 31개 키를 무조건 모두 포함하라.
        7. 압축 출력: 공백과 줄바꿈 없는 한 줄(Minified)로 출력하라.

        형식: {"name":"이름","attendance":{"1":[],"2":[{"s":"10:25","e":"16:55"}],"31":[]}}
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

    let analyzedData: any = null;
    let jsonString = text.trim();
    let isTruncated = false;

    try {
      analyzedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.warn("JSON 파싱 실패. 잘린 데이터 복구 시도 중...");
      isTruncated = true;

      const startIndex = jsonString.indexOf('{');
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
          // 객체가 닫히지 않았을 경우를 대비한 최소한의 보정
          if (!potentialJson.endsWith('}')) {
            potentialJson += '}}'; 
          }
          try {
            analyzedData = JSON.parse(potentialJson);
            console.log("잘린 JSON 복구 성공");
          } catch (e) {
            analyzedData = null;
          }
        }
      }
    }

    // 이름 보정 및 기본 구조 보장
    if (analyzedData) {
      if (analyzedData.name === '언니') analyzedData.name = '엔니';
      if (!analyzedData.attendance) analyzedData.attendance = {};
    }

    return NextResponse.json(analyzedData, {
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
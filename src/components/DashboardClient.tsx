"use client";

import { useState, useEffect, useMemo } from 'react';
import imageCompression from 'browser-image-compression';
import { Shift, WeeklyPayrollSummary } from '../types';
import PaySummary from './PaySummary';
import { createClient } from '@/lib/supabase/client';
import {
  calculateMonthlyPayroll,
  getAutoBreakMinutes
} from '../lib/payroll-utils';
import { generateMockShifts } from '../lib/mock-data';

// Sub-components
import GlobalSettings from './dashboard/GlobalSettings';
import ImageUploader from './dashboard/ImageUploader';
import ShiftTable from './dashboard/ShiftTable';
import DevTools from './dashboard/DevTools';

interface DashboardClientProps {
  selectedYear: number;
  selectedMonth: number;
  selectedModel: string;
  onAnalyzedMonthYearChange: ({ year, month }: { year: number; month: number; }) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 503 || error.status === 429)) {
      console.warn(`서버 과부하. ${delay}ms 후 재시도합니다... (남은 횟수: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export default function DashboardClient({
  selectedYear,
  selectedMonth,
  selectedModel,
  onAnalyzedMonthYearChange
}: DashboardClientProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [useCompression, setUseCompression] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState('');

  const [hourlyWage, setHourlyWage] = useState(10320);
  const [breakThreshold, setBreakThreshold] = useState(480);
  const [breakDeduction, setBreakDeduction] = useState(60);
  const [calculatedPaySummary, setCalculatedPaySummary] = useState<WeeklyPayrollSummary[]>([]);
  const [shopName, setShopName] = useState("나의 가게");
  const supabase = createClient();

  // Load shop name from Supabase on mount
  useEffect(() => {
    const loadShopName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('shop_name')
        .eq('id', user.id)
        .single();

      if (data?.shop_name) {
        setShopName(data.shop_name);
      }
    };

    loadShopName();
  }, []);

  const handleShopNameChange = async (newName: string) => {
    setShopName(newName); 

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ shop_name: newName })
      .eq('id', user.id);
  };

  // 🌟 인라인 추가 폼 상태 관리
  const [addingState, setAddingState] = useState<string | null>(null); 
  const [newShiftData, setNewShiftData] = useState({
    day: '', start_hour: '', start_minute: '', end_hour: '', end_minute: '', break_minutes: ''
  });

  useEffect(() => {
    setShifts(prevShifts => prevShifts.map(s => {
      if (s.is_break_manual) return s;
      const newAutoBreak = getAutoBreakMinutes(
        s.start_hour, s.start_minute, s.end_hour, s.end_minute, 
        breakThreshold, breakDeduction
      );
      return { ...s, break_minutes: newAutoBreak };
    }));
  }, [breakThreshold, breakDeduction]);

  useEffect(() => {
    setHourlyWage(selectedYear === 2026 ? 10320 : 10030);
  }, [selectedYear]);

  const displayedShifts = useMemo(() => {
    const sortedShifts = [...shifts].sort((a, b) => {
      return parseInt(a.day) - parseInt(b.day);
    });
    
    return sortedShifts.map(s => ({
      ...s,
      date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${s.day.padStart(2, '0')}`
    }));
  }, [shifts, selectedYear, selectedMonth]);

  const groupedData = useMemo(() => {
    const groups = displayedShifts.reduce((acc, s) => {
      if (!acc[s.name]) acc[s.name] = [];
      acc[s.name].push(s);
      return acc;
    }, {} as Record<string, any[]>);

    if (addingState && !groups[addingState]) {
      groups[addingState] = [];
    }

    return groups;
  }, [displayedShifts, addingState]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (!useCompression) {
      setSelectedFiles(files);
      const previews: string[] = [];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            previews.push(e.target.result as string);
            if (previews.length === files.length) setFilePreviews(previews);
          }
        };
        reader.readAsDataURL(file);
      });
      return;
    }

    setIsCompressing(true);
    setError(null);

    try {
      const processed = await Promise.all(files.map(async (file) => {
        try {
          if (file.size < 1 * 1024 * 1024) {
            const previewUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = (e) => resolve(e.target?.result as string);
            });
            return { file, preview: previewUrl };
          }

          const options = {
            maxSizeMB: 3,             
            maxWidthOrHeight: 3072,   
            useWebWorker: true,
            initialQuality: 0.9,      
          };

          const compressedFile = await imageCompression(file, options);
          const previewUrl = await imageCompression.getDataUrlFromFile(compressedFile);
          return { file: compressedFile, preview: previewUrl };
        } catch (err) {
          console.error(`Compression failed for ${file.name}, using original.`, err);
          const previewUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => resolve(e.target?.result as string);
          });
          return { file, preview: previewUrl };
        }
      }));

      setSelectedFiles(processed.map(p => p.file));
      setFilePreviews(processed.map(p => p.preview));

    } catch (err) {
      console.error("Image processing error:", err);
      setError("이미지 최적화 중 오류가 발생했습니다. 원본 모드로 다시 시도해보세요.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleAnalyzeAll = async () => {
    if (selectedFiles.length === 0) return setError("분석할 이미지를 선택하세요.");
    setAddingState(null); 
    setIsLoading(true);
    setError(null);
    setShifts([]);

    try {
      const pairs: File[][] = [];
      for (let i = 0; i < selectedFiles.length; i += 2) {
        pairs.push(selectedFiles.slice(i, i + 2));
      }

      for (const pairFiles of pairs) {
        const imageParts = await Promise.all(
          pairFiles.map(async (f) => ({
            imageBase64: await fileToBase64(f),
            mimeType: f.type
          }))
        );

        try {
          const response = await retryWithBackoff(async () => {
            const res = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ images: imageParts, selectedModel }),
            });
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            return res;
          }, 3, 3000);

          const isTruncated = response.headers.get('X-AI-Response-Truncated') === 'true';

          let analyzed;
          try {
            analyzed = await response.json();
          } catch (parseError) {
            console.error("JSON 파싱 에러:", parseError);
            throw new Error("JSON_PARSE_FAILED");
          }
          
          setShifts(prev => [...prev, ...analyzed.map((s: any) => {
            const clean = (val: any) => (val === null || val === "null" || val === undefined) ? "" : String(val);
            const sh = clean(s.sh).padStart(2, '0');
            const sm = clean(s.sm).padStart(2, '0');
            const eh = clean(s.eh).padStart(2, '0');
            const em = clean(s.em).padStart(2, '0');

            return {
              id: `shift-${s.name}-${s.day}-${Math.random()}`,
              name: s.name,
              day: clean(s.day).padStart(2, '0'),
              date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${clean(s.day).padStart(2, '0')}`,
              start_hour: sh, 
              start_minute: sm,
              end_hour: eh, 
              end_minute: em,
              break_minutes: getAutoBreakMinutes(sh, sm, eh, em, breakThreshold, breakDeduction),
              is_break_manual: false,
              is_paid_break: false
            };
          })]);

          if (isTruncated) {
            setError(`⚠️ 경고: AI 응답이 중간에 잘려 일부 데이터가 누락되었을 수 있습니다. (자동 복구됨)
            
            분석 결과를 꼼꼼히 확인해주시고, 데이터가 많이 빠졌다면 다음을 시도해보세요:
            1. 상단의 모델 선택 메뉴에서 다른 모델을 선택해보세요.
            2. '빠른 전송 (압축 ON)' 체크를 해제하고 다시 시도해보세요.
            3. 누락된 기록은 하단의 '근무 기록 추가' 버튼으로 직접 입력할 수 있습니다.`);
          }

        } catch (e: any) {
          console.error("페어 분석 실패:", e);
          if (e.message === "JSON_PARSE_FAILED") {
            setError(`⚠️ AI 응답이 불완전하여 분석에 실패했습니다.
            
            💡 해결 방법:
            1. 상단의 모델 선택 메뉴에서 다른 모델을 선택해보세요.
            2. '빠른 전송 (압축 ON)' 체크를 해제하고 다시 시도해보세요.
            3. 누락된 기록은 하단의 '근무 기록 추가' 버튼으로 직접 입력할 수 있습니다.`);
          } else {
            setError("일부 카드 분석에 실패했습니다.");
          }
        }
        await new Promise(res => setTimeout(res, 3000));
      }
    } catch (err: any) {
      if (err.message !== "JSON_PARSE_FAILED") {
        setError("분석 프로세스 도중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculatePay = () => {
    if (displayedShifts.length === 0) return;

    const duplicateMessages: string[] = [];
    Object.entries(groupedData).forEach(([name, employeeShifts]) => {
      const shiftsByDay: Record<string, Shift[]> = {};
      employeeShifts.forEach(s => {
        if (!shiftsByDay[s.day]) shiftsByDay[s.day] = [];
        shiftsByDay[s.day].push(s);
      });

      const dayMessages: string[] = [];
      Object.keys(shiftsByDay)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(day => {
          const dayShifts = shiftsByDay[day];
          if (dayShifts.length > 1) {
            const times = dayShifts.map(s => 
              `[${s.start_hour}:${s.start_minute}~${s.end_hour}:${s.end_minute}]`
            ).join(', ');
            dayMessages.push(`  - ${day}일: ${times}`);
          }
        });

      if (dayMessages.length > 0) {
        duplicateMessages.push(`👤 ${name} 사원:\n${dayMessages.join('\n')}`);
      }
    });

    if (duplicateMessages.length > 0) {
      const message = `⚠️ 하루 2회 이상 근무 기록이 발견되었습니다.\n(시간을 확인하여 중복 입력인지, 분할 근무인지 확인하세요)\n\n${duplicateMessages.join('\n\n')}\n\n내용이 맞다면 [확인]을, 입력 실수라면 [취소]를 누른 뒤 수정해주세요.`;
      if (!confirm(message)) return;
    }

    const summary = calculateMonthlyPayroll(displayedShifts, hourlyWage, selectedYear, selectedMonth);
    setCalculatedPaySummary(summary);
  };

  const startAdding = (employeeName: string) => {
    setAddingState(employeeName);
    setNewShiftData({
      day: '', 
      start_hour: '', start_minute: '', 
      end_hour: '', end_minute: '', 
      break_minutes: ''
    });
  };

  const cancelAdding = () => {
    setAddingState(null);
  };

  const confirmAdding = () => {
    if (!addingState) return;
    if (!newShiftData.day) {
      alert("날짜를 입력해주세요.");
      return;
    }

    const newShift: Shift = {
      id: `manual-${Date.now()}`,
      name: addingState,
      day: newShiftData.day,
      date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${newShiftData.day.padStart(2, '0')}`,
      start_hour: newShiftData.start_hour.padStart(2, '0'),
      start_minute: newShiftData.start_minute.padStart(2, '0'),
      end_hour: newShiftData.end_hour.padStart(2, '0'),
      end_minute: newShiftData.end_minute.padStart(2, '0'),
      break_minutes: Number(newShiftData.break_minutes),
      is_break_manual: false, 
      is_paid_break: false
    };

    newShift.break_minutes = getAutoBreakMinutes(
      newShift.start_hour, newShift.start_minute, 
      newShift.end_hour, newShift.end_minute, 
      breakThreshold, breakDeduction
    );

    setShifts(prev => [...prev, newShift]);
    setAddingState(null); 
  };

  const handleShiftDelete = (shiftId: string) => {
    if (confirm("정말 이 근무 기록을 삭제하시겠습니까?")) {
      setShifts(prev => prev.filter(s => s.id !== shiftId));
    }
  };

  const handleShiftUpdate = (shiftId: string, field: keyof Shift, value: any) => {
    setShifts(prev => prev.map(s => {
      if (s.id !== shiftId) return s;
      const updated = { ...s, [field]: value };
      
      if (field === 'break_minutes') updated.is_break_manual = true;
      if (['start_hour', 'start_minute', 'end_hour', 'end_minute'].includes(field as string) && !updated.is_break_manual) {
        updated.break_minutes = getAutoBreakMinutes(updated.start_hour, updated.start_minute, updated.end_hour, updated.end_minute, breakThreshold, breakDeduction);
      }
      return updated;
    }));
  };

  const handleNameUpdate = (oldName: string, newName: string) => {
    if (!newName || oldName === newName) return;
    setShifts(prev => prev.map(s => 
      s.name === oldName ? { ...s, name: newName } : s
    ));
  };

  const handleDevGenerate = (scenario: 'under-15' | 'full-time' | 'random') => {
    setAddingState(null); 
    const mockShifts = generateMockShifts(selectedYear, selectedMonth, scenario);
    const shiftsWithBreak = mockShifts.map(s => ({
      ...s,
      date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${s.day.padStart(2, '0')}`,
      break_minutes: getAutoBreakMinutes(s.start_hour, s.start_minute, s.end_hour, s.end_minute, breakThreshold, breakDeduction)
    }));
    setShifts(shiftsWithBreak);
    setCalculatedPaySummary([]); 
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen font-sans text-slate-900 relative">
      <header className="mb-10 text-center">
        <div className="inline-flex items-center justify-center gap-2 group cursor-pointer w-full">
          <input 
            type="text" 
            value={shopName} 
            onChange={(e) => handleShopNameChange(e.target.value)} 
            className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight text-center bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-orange-500 outline-none transition-all w-full max-w-[90vw]"
            placeholder="가게 이름을 입력하세요"
          />
          <span className="text-xl opacity-0 group-hover:opacity-50 transition-opacity hidden md:inline">✏️</span>
        </div>
        <p className="text-slate-500 font-medium mt-2">
          <span className="text-orange-500 font-bold">Smart Pay</span> 급여 정산 시스템
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <GlobalSettings 
            hourlyWage={hourlyWage}
            setHourlyWage={setHourlyWage}
            breakThreshold={breakThreshold}
            setBreakThreshold={setBreakThreshold}
            breakDeduction={breakDeduction}
            setBreakDeduction={setBreakDeduction}
          />

          <ImageUploader 
            useCompression={useCompression}
            setUseCompression={setUseCompression}
            isCompressing={isCompressing}
            isLoading={isLoading}
            handleFileChange={handleFileChange}
            filePreviews={filePreviews}
            setModalImageSrc={setModalImageSrc}
            setIsModalOpen={setIsModalOpen}
            selectedFilesCount={selectedFiles.length}
            onAnalyze={handleAnalyzeAll}
            error={error}
          />
        </aside>

        <main className="lg:col-span-2 space-y-8">
          {shifts.length > 0 || addingState ? (
            <ShiftTable 
              shiftsLength={shifts.length}
              addingState={addingState}
              groupedData={groupedData}
              onStartAdding={startAdding}
              onHandleNameUpdate={handleNameUpdate}
              onShiftUpdate={handleShiftUpdate}
              onShiftDelete={handleShiftDelete}
              newShiftData={newShiftData}
              setNewShiftData={setNewShiftData}
              onConfirmAdding={confirmAdding}
              onCancelAdding={cancelAdding}
              onCalculatePay={handleCalculatePay}
            />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 gap-4">
              <div className="text-center">
                <p className="font-bold text-lg text-slate-500">데이터가 없습니다.</p>
                <p className="text-sm">근무표 사진을 업로드하거나 수동으로 시작하세요.</p>
              </div>
              <button 
                onClick={() => startAdding("직원")}
                className="px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-600 font-bold hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all flex items-center gap-2"
              >
                <span className="text-lg">✏️</span> 수동 입력 시작하기
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 🧾 급여 정산 리포트 */}
      {calculatedPaySummary.length > 0 && (
        <section className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <PaySummary 
            weeklySummaries={calculatedPaySummary} 
            hourlyWage={hourlyWage} 
            employeeName={shifts.length > 0 ? shifts[0].name : "직원"}
            allShifts={shifts}
            year={selectedYear}
            month={selectedMonth}
            shopName={shopName}
          />
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-2 px-4 border-b border-slate-100 bg-white z-10 shrink-0">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">이미지 미리보기</span>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-full p-1.5 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4 bg-slate-50 flex-1 flex items-start justify-center">
              <img src={modalImageSrc} alt="Full size preview" className="max-w-full h-auto rounded-lg shadow-sm" />
            </div>
          </div>
        </div>
      )}

      <DevTools onGenerate={handleDevGenerate} />
    </div>
  );
}
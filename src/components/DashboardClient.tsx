"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react'; 
import imageCompression from 'browser-image-compression';
import { WeeklyPayrollSummary } from '../types';
import PaySummary from './PaySummary';
import { getAutoBreakMinutes } from '../lib/payroll-utils';
import { calculatePayrollServer } from '@/app/actions/payroll';
import { generateMockShifts } from '../lib/mock-data';
import { getShopName } from '@/app/actions/user'; // 🌟 getShopName 추가

// Sub-components
import GlobalSettings from './dashboard/GlobalSettings';
import ImageUploader from './dashboard/ImageUploader';
import AttendanceTable from './dashboard/AttendanceTable';
import DevTools from './dashboard/DevTools';
import ShopNameEditor from './ShopNameEditor'; 

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
  fn: (signal?: AbortSignal) => Promise<T>,
  retries: number = 3,
  delay: number = 2000,
  signal?: AbortSignal
): Promise<T> {
  try {
    return await fn(signal);
  } catch (error: any) {
    if (signal?.aborted) throw new Error('AbortError');
    if (retries > 0 && (error.status === 503 || error.status === 429)) {
      console.warn(`서버 과부하. ${delay}ms 후 재시도합니다... (남은 횟수: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2, signal);
    }
    throw error;
  }
}

const createInitialAttendance = () => {
  return Array.from({ length: 31 }, (_, i) => i + 1).reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {} as Record<number, any[]>);
};

export default function DashboardClient({
  selectedYear,
  selectedMonth,
  selectedModel,
  onAnalyzedMonthYearChange
}: DashboardClientProps) {
  const { data: session } = useSession(); 
  const [attendanceData, setAttendanceData] = useState<Record<number, any[]>>(createInitialAttendance());
  const [employeeName, setEmployeeName] = useState<string>("직원");
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(40);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    Object.entries(attendanceData).forEach(([dayStr, records]) => {
      const day = parseInt(dayStr);
      if (day <= lastDayOfMonth) {
        records.forEach((r, i) => {
          const prefix = `${day}-${i}`;
          if (r.sh && (parseInt(r.sh) < 0 || parseInt(r.sh) > 23)) newErrors[`${prefix}-sh`] = "0~23시 사이여야 합니다.";
          if (r.sm && (parseInt(r.sm) < 0 || parseInt(r.sm) > 59)) newErrors[`${prefix}-sm`] = "0~59분 사이여야 합니다.";
          if (r.eh && (parseInt(r.eh) < 0 || parseInt(r.eh) > 23)) newErrors[`${prefix}-eh`] = "0~23시 사이여야 합니다.";
          if (r.em && (parseInt(r.em) < 0 || parseInt(r.em) > 59)) newErrors[`${prefix}-em`] = "0~59분 사이여야 합니다.";

          if (r.sh && r.eh && r.brk) {
            const startMins = parseInt(r.sh) * 60 + parseInt(r.sm || "0");
            const endMins = parseInt(r.eh) * 60 + parseInt(r.em || "0");
            let diff = endMins - startMins;
            if (diff < 0) diff += 24 * 60; 
            if (parseInt(r.brk) > diff) newErrors[`${prefix}-brk`] = "휴게 시간이 근무 시간보다 깁니다.";
          }
        });
      }
    });
    setErrors(newErrors);
  }, [attendanceData, selectedYear, selectedMonth]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => Math.max(0, prev - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [isLoading, countdown]);

  useEffect(() => {
    setAttendanceData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(day => {
        next[Number(day)] = next[Number(day)].map(r => {
          if (r.isManual) return r;
          return { ...r, brk: String(getAutoBreakMinutes(r.sh, r.sm, r.eh, r.em, breakThreshold, breakDeduction)) };
        });
      });
      return next;
    });
  }, [breakThreshold, breakDeduction]);

  // 🌟 세션 로드 시 DB에서 최신 가게 이름 가져오기
  useEffect(() => {
    const fetchShopName = async () => {
      if (session?.user) {
        // 1. 일단 세션에 있는 이름 먼저 보여줌 (빠른 로딩)
        if (session.user.name) {
          setShopName(session.user.name);
        }
        
        // 2. 서버에서 최신 데이터 가져와서 업데이트 (정확성)
        const res = await getShopName((session.user as any).id);
        if (res.success && res.name) {
          setShopName(res.name);
        }
      }
    };
    fetchShopName();
  }, [session]);

  useEffect(() => {
    setHourlyWage(selectedYear === 2026 ? 10320 : 10030);
  }, [selectedYear]);

  // ... (handleFileChange, handleAnalyzeAll 등 기존 함수들 유지) ...
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setIsCompressing(true);
    setError(null);
    try {
      const processed = await Promise.all(files.map(async (file) => {
        if (file.size < 1 * 1024 * 1024) return { file, preview: await fileToBase64(file).then(b => `data:${file.type};base64,${b}`) };
        const options = { maxSizeMB: 3, maxWidthOrHeight: 3072, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        return { file: compressedFile, preview: await imageCompression.getDataUrlFromFile(compressedFile) };
      }));
      setSelectedFiles(processed.map(p => p.file));
      setFilePreviews(processed.map(p => p.preview));
    } catch (err) { setError("이미지 처리 중 오류 발생"); } finally { setIsCompressing(false); }
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setCountdown(40);
      setError("사용자에 의해 분석이 취소되었습니다.");
    }
  };

  const handleAnalyzeAll = async () => {
    if (selectedFiles.length === 0) return setError("분석할 이미지를 선택하세요.");
    setAttendanceData(createInitialAttendance());
    setHasStarted(true);
    setIsLoading(true);
    setCountdown(40);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const imageParts = await Promise.all(selectedFiles.slice(0, 2).map(async (f) => ({ imageBase64: await fileToBase64(f), mimeType: f.type })));
      const response = await retryWithBackoff(async (signal) => {
        return fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: imageParts, selectedModel }), signal });
      }, 3, 2000, abortControllerRef.current.signal);
      
      if (!response.ok) throw new Error(`API_ERROR_${response.status}`);
      const data = await response.json();
      
      if (data.name) setEmployeeName(data.name);
      if (data.attendance) {
        const processedAttendance: Record<number, any[]> = {};
        Object.keys(data.attendance).forEach(dayKey => {
          const day = parseInt(dayKey);
          processedAttendance[day] = (data.attendance[dayKey] || []).map((r: any) => {
            const sParts = (r.s || "").split(':'), eParts = (r.e || "").split(':');
            const sh = sParts[0] || "", sm = sParts[1] || "", eh = eParts[0] || "", em = eParts[1] || "";
            return { id: `ai-${day}-${Math.random().toString(36).substr(2, 9)}`, sh, sm, eh, em, brk: String(getAutoBreakMinutes(sh, sm, eh, em, breakThreshold, breakDeduction)), isManual: false };
          });
        });
        setAttendanceData(prev => ({ ...prev, ...processedAttendance }));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.message !== 'AbortError') setError("이미지 분석 실패");
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleUpdateRecord = (day: number, index: number, field: string, value: string) => {
    setAttendanceData(prev => {
      const dayRecords = [...(prev[day] || [])];
      if (dayRecords.length === 0) dayRecords.push({ id: `manual-${day}-${Date.now()}`, sh: "", sm: "", eh: "", em: "", brk: "0", isManual: false });
      if (dayRecords[index]) {
        const updated = { ...dayRecords[index], [field]: value };
        if (field === 'brk') updated.isManual = true;
        if (['sh', 'sm', 'eh', 'em'].includes(field) && !updated.isManual) {
          updated.brk = String(getAutoBreakMinutes(updated.sh, updated.sm || "00", updated.eh, updated.em || "00", breakThreshold, breakDeduction));
        }
        dayRecords[index] = updated;
      }
      return { ...prev, [day]: dayRecords };
    });
  };

  const handleDeleteRecord = (day: number, index: number) => {
    setAttendanceData(prev => {
      const dayRecords = [...(prev[day] || [])];
      if (index === 0 && dayRecords.length <= 1) return { ...prev, [day]: [] };
      dayRecords.splice(index, 1);
      return { ...prev, [day]: dayRecords };
    });
  };

  const handleAddRecord = (day: number) => {
    setAttendanceData(prev => {
      const dayRecords = [...(prev[day] || [])];
      dayRecords.push({ id: `add-${day}-${Date.now()}`, sh: "", sm: "", eh: "", em: "", brk: "0", isManual: false });
      return { ...prev, [day]: dayRecords };
    });
  };

  const handleCalculatePay = async () => {
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const invalidDaysWithData: number[] = [];
    Object.entries(attendanceData).forEach(([dayStr, records]) => {
      const day = parseInt(dayStr);
      if (day > lastDayOfMonth && records.length > 0) invalidDaysWithData.push(day);
    });

    if (invalidDaysWithData.length > 0) {
      const message = `⚠️ 날짜 오류 감지\n\n${selectedYear}년 ${selectedMonth + 1}월은 ${lastDayOfMonth}일까지입니다.\n존재하지 않는 날짜(${invalidDaysWithData.sort((a, b) => a - b).join(', ')}일)의 기록은 정산에서 제외됩니다. 계속하시겠습니까?`;
      if (!confirm(message)) return;
    }

    const validShifts: any[] = [];
    Object.entries(attendanceData).forEach(([dayStr, records]) => {
      const day = parseInt(dayStr);
      if (day > lastDayOfMonth) return;
      records.forEach((r: any) => {
        if (r.sh && r.eh) {
          const sh = r.sh.padStart(2, '0'), sm = (r.sm || "00").padStart(2, '0'), eh = r.eh.padStart(2, '0'), em = (r.em || "00").padStart(2, '0');
          validShifts.push({ id: r.id || `shift-${day}-${Math.random()}`, name: employeeName, day: String(day).padStart(2, '0'), date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, start_hour: sh, start_minute: sm, end_hour: eh, end_minute: em, break_minutes: parseInt(r.brk || "0"), is_break_manual: r.isManual, is_paid_break: false });
        }
      });
    });
    
    if (validShifts.length === 0) return alert("계산할 유효한 데이터가 없습니다.");
    
    setIsLoading(true);
    try {
      const result = await calculatePayrollServer(validShifts, hourlyWage, selectedYear, selectedMonth);
      if (result.success && result.data) {
        setCalculatedPaySummary(result.data.summaries);
      } else {
        alert(result.error || "급여 계산 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("Calculation error:", err);
      alert("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevGenerate = (scenario: 'under-15' | 'full-time' | 'random') => {
    const mockShifts = generateMockShifts(selectedYear, selectedMonth, scenario);
    const newAttendance = createInitialAttendance();
    mockShifts.forEach(s => {
      const day = parseInt(s.day);
      if (!newAttendance[day]) newAttendance[day] = [];
      newAttendance[day].push({ id: `mock-${day}-${Math.random()}`, sh: s.start_hour, sm: s.start_minute, eh: s.end_hour, em: s.end_minute, brk: String(getAutoBreakMinutes(s.start_hour, s.start_minute, s.end_hour, s.end_minute, breakThreshold, breakDeduction)), isManual: false });
    });
    setAttendanceData(newAttendance);
    setHasStarted(true);
  };

  const flattenedShiftsForSummary = useMemo(() => {
    const shifts: any[] = [];
    Object.entries(attendanceData).forEach(([dayStr, records]) => {
      const day = parseInt(dayStr);
      records.forEach(r => { if (r.sh && r.eh) shifts.push({ ...r, day, name: employeeName, start_hour: r.sh.padStart(2, '0'), start_minute: (r.sm || "00").padStart(2, '0'), end_hour: r.eh.padStart(2, '0'), end_minute: (r.em || "00").padStart(2, '0'), date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, break_minutes: parseInt(r.brk || "0") }); });
    });
    return shifts;
  }, [attendanceData, employeeName, selectedYear, selectedMonth]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans text-slate-900 relative">
      <header className="mb-10 text-center">
        {/* 🌟 기존 input을 ShopNameEditor로 교체 */}
        {session?.user ? (
          <ShopNameEditor 
            userId={(session.user as any).id} 
            initialName={shopName} 
          />
        ) : (
          // 세션 로딩 중일 때 스켈레톤 UI
          <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse mx-auto" />
        )}
        <p className="text-slate-500 font-medium mt-2"><span className="text-orange-500 font-bold">Smart Pay</span> 급여 정산 시스템</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        <aside className="lg:col-span-3 space-y-6">
          <GlobalSettings hourlyWage={hourlyWage} setHourlyWage={setHourlyWage} breakThreshold={breakThreshold} setBreakThreshold={setBreakThreshold} breakDeduction={breakDeduction} setBreakDeduction={setBreakDeduction} />
          <ImageUploader useCompression={useCompression} setUseCompression={setUseCompression} isCompressing={isCompressing} isLoading={isLoading} handleFileChange={handleFileChange} filePreviews={filePreviews} setModalImageSrc={setModalImageSrc} setIsModalOpen={setIsModalOpen} selectedFilesCount={selectedFiles.length} onAnalyze={handleAnalyzeAll} error={error} />
        </aside>
        
        {/* ... 나머지 JSX (main 등) ... */}
        <main className="lg:col-span-7 relative">
          {!hasStarted ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6"><span className="text-4xl">📝</span></div>
              <h3 className="text-2xl font-black text-slate-800 mb-3">근무 기록을 시작하세요</h3>
              <p className="text-slate-500 mb-8 max-w-sm">사진을 업로드하여 <b>AI 분석</b>을 시작하거나,<br/>직접 입력을 원하시면 아래 버튼을 눌러주세요.</p>
              <div className="w-full max-w-sm">
                <button onClick={() => setHasStarted(true)} className="w-full px-6 py-4 bg-white border-2 border-orange-500 text-orange-600 rounded-2xl font-bold hover:bg-orange-50 transition-all shadow-sm flex items-center justify-center gap-2"><span className="text-xl">✏️</span> 수동 입력 시작하기</button>
              </div>
            </div>
          ) : (
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md rounded-3xl animate-in fade-in duration-300">
                  <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                    <svg className="absolute w-full h-full -rotate-90">
                      <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                      <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * (40 - countdown)) / 40} className="text-orange-500 transition-all duration-1000 ease-linear" />
                    </svg>
                    <span className="text-4xl font-black text-slate-800">{countdown}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">AI가 분석 중입니다</h3>
                  <p className="text-slate-500 text-sm mb-8 animate-pulse">잠시만 기다려 주세요. 꼼꼼하게 읽고 있습니다...</p>
                  <button onClick={handleCancelAnalysis} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-full text-xs font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm active:scale-95">분석 중단하기</button>
                </div>
              )}

              <AttendanceTable 
                attendanceData={attendanceData} 
                employeeName={employeeName} 
                onUpdateName={setEmployeeName} 
                onUpdateRecord={handleUpdateRecord} 
                onDeleteRecord={handleDeleteRecord} 
                onAddRecord={handleAddRecord} 
                onCalculatePay={handleCalculatePay} 
                selectedYear={selectedYear} 
                selectedMonth={selectedMonth}
                errors={errors} // 🌟 에러 정보 전달
              />
            </div>
          )}
        </main>
      </div>

      {calculatedPaySummary.length > 0 && (
        <section className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <PaySummary weeklySummaries={calculatedPaySummary} hourlyWage={hourlyWage} employeeName={employeeName} allShifts={flattenedShiftsForSummary as any} year={selectedYear} month={selectedMonth} shopName={shopName} />
        </section>
      )}

      <DevTools onGenerate={handleDevGenerate} />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-2 px-4 border-b border-slate-100 bg-white z-10 shrink-0">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">이미지 미리보기</span>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-full p-1.5 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="overflow-y-auto p-4 bg-slate-50 flex-1 flex items-start justify-center"><img src={modalImageSrc} alt="Full size preview" className="max-w-full h-auto rounded-lg shadow-sm" /></div>
          </div>
        </div>
      )}
    </div>
  );
}
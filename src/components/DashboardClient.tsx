"use client";

import { useState, useEffect, useMemo } from 'react';
import imageCompression from 'browser-image-compression';
import { Shift, WeeklyPayrollSummary } from '../types';
import PaySummary from './PaySummary';
import { 
  calculateMonthlyPayroll, 
  calculateShiftDurationMinutes, 
  formatMinutesToHM, 
  getAutoBreakMinutes 
} from '../lib/payroll-utils';
import { generateMockShifts } from '../lib/mock-data';

interface DashboardClientProps {
  selectedYear: number;
  selectedMonth: number;
  selectedModel: string;
  onAnalyzedMonthYearChange: ({ year, month }: { year: number; month: number; }) => void;
}

// 헤더용 이름 수정 컴포넌트 (포커스 해제 시 저장)
function EditableHeaderName({ initialValue, onCommit }: { initialValue: string, onCommit: (newValue: string) => void }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (value.trim() !== initialValue) {
      onCommit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex items-center gap-2 group">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="bg-transparent text-white font-bold text-lg outline-none border-b border-transparent focus:border-orange-500 focus:bg-slate-800 transition-all w-auto min-w-[60px] max-w-[150px]"
      />
      <span className="text-slate-500 text-sm group-hover:text-slate-300 transition-colors">✏️</span>
    </div>
  );
}

// 시각적 피드백을 강화한 커스텀 입력 셀
function EditableCell({ value, onUpdate, className = "" }: { value: string, onUpdate: (newValue: string) => void, className?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onUpdate(e.target.value)}
      className={`w-full bg-transparent p-1 rounded transition-all focus:bg-white focus:ring-2 focus:ring-orange-400 outline-none text-center font-medium ${className}`}
    />
  );
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000
): Promise<T> => {
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
};

export default function DashboardClient({ selectedYear, selectedMonth, selectedModel }: DashboardClientProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [useCompression, setUseCompression] = useState(true); // 🌟 압축 사용 여부 (기본값: true)
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState('');
  
  const [hourlyWage, setHourlyWage] = useState(10320);
  const [breakThreshold, setBreakThreshold] = useState(480);
  const [breakDeduction, setBreakDeduction] = useState(60);
  const [calculatedPaySummary, setCalculatedPaySummary] = useState<WeeklyPayrollSummary[]>([]);

  // DevTools State
  const [isDevMenuOpen, setIsDevMenuOpen] = useState(false);

  // 🌟 인라인 추가 폼 상태 관리
  const [addingState, setAddingState] = useState<string | null>(null); // 현재 추가 중인 사원 이름 (null이면 추가 중 아님)
  const [newShiftData, setNewShiftData] = useState<{
    day: string;
    start_hour: string;
    start_minute: string;
    end_hour: string;
    end_minute: string;
    break_minutes: string;
  }>({
    day: '', start_hour: '', start_minute: '00', end_hour: '', end_minute: '00', break_minutes: '60'
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
    // 🌟 날짜순 자동 정렬 추가
    const sortedShifts = [...shifts].sort((a, b) => {
      return parseInt(a.day) - parseInt(b.day);
    });
    
    return sortedShifts.map(s => ({
      ...s,
      date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${s.day.padStart(2, '0')}`
    }));
  }, [shifts, selectedYear, selectedMonth]);

  const groupedData = useMemo(() => {
    return displayedShifts.reduce((acc, s) => {
      if (!acc[s.name]) acc[s.name] = [];
      acc[s.name].push(s);
      return acc;
    }, {} as Record<string, any[]>);
  }, [displayedShifts]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // 🌟 압축 옵션이 꺼져있으면 바로 원본 처리
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
          // 🌟 스마트 압축 로직: 1MB 이하는 압축 없이 원본 사용 (화질 보존 및 속도 향상)
          if (file.size < 1 * 1024 * 1024) {
            const previewUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = (e) => resolve(e.target?.result as string);
            });
            return { file, preview: previewUrl };
          }

          // 고정밀 압축 설정 (OCR 인식률 최적화)
          const options = {
            maxSizeMB: 3,             // 3MB까지 허용 (디테일 보존)
            maxWidthOrHeight: 3072,   // 3K 해상도 (작은 글씨 인식 향상)
            useWebWorker: true,
            initialQuality: 0.9,      // 압축 노이즈 최소화
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

          const analyzed = await response.json();
          
          setShifts(prev => [...prev, ...analyzed.map((s: any) => ({
            id: `shift-${s.name}-${s.day}-${Math.random()}`,
            name: s.name,
            day: String(s.day).padStart(2, '0'),
            start_hour: String(s.sh).padStart(2, '0'), 
            start_minute: String(s.sm).padStart(2, '0'),
            end_hour: String(s.eh).padStart(2, '0'), 
            end_minute: String(s.em).padStart(2, '0'),
            break_minutes: getAutoBreakMinutes(s.sh, s.sm, s.eh, s.em, breakThreshold, breakDeduction),
            is_break_manual: false,
            is_paid_break: false
          }))]);

        } catch (e: any) {
          console.error("페어 분석 실패:", e);
          setError("일부 카드 분석에 실패했습니다.");
        }
        await new Promise(res => setTimeout(res, 3000));
      }
    } catch (err: any) {
      setError("분석 프로세스 도중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculatePay = () => {
    if (displayedShifts.length === 0) return;

    // 🌟 중복 날짜 검증 로직 (상세 시간 표시)
    const duplicateMessages: string[] = [];
    
    Object.entries(groupedData).forEach(([name, employeeShifts]) => {
      const shiftsByDay: Record<string, Shift[]> = {};
      
      // 날짜별 그룹화
      employeeShifts.forEach(s => {
        if (!shiftsByDay[s.day]) shiftsByDay[s.day] = [];
        shiftsByDay[s.day].push(s);
      });

      // 중복 날짜 필터링 및 메시지 생성
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
      start_hour: '09', start_minute: '00', 
      end_hour: '18', end_minute: '00', 
      break_minutes: '60'
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
      start_hour: newShiftData.start_hour.padStart(2, '0'),
      start_minute: newShiftData.start_minute.padStart(2, '0'),
      end_hour: newShiftData.end_hour.padStart(2, '0'),
      end_minute: newShiftData.end_minute.padStart(2, '0'),
      break_minutes: Number(newShiftData.break_minutes),
      is_break_manual: false, // 자동 계산에 맡길지 여부 (일단 false)
      is_paid_break: false
    };

    // 시간 입력 시 자동 휴게 시간 적용
    newShift.break_minutes = getAutoBreakMinutes(
      newShift.start_hour, newShift.start_minute, 
      newShift.end_hour, newShift.end_minute, 
      breakThreshold, breakDeduction
    );

    setShifts(prev => [...prev, newShift]);
    setAddingState(null); // 종료
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
      
      // 날짜 수정 시 숫자 이외의 문자 제거 등 처리 가능 (여기선 EditableCell에서 텍스트로 들어옴)
      
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
    const mockShifts = generateMockShifts(selectedYear, selectedMonth, scenario);
    // 자동 휴게 시간 적용
    const shiftsWithBreak = mockShifts.map(s => ({
      ...s,
      break_minutes: getAutoBreakMinutes(s.start_hour, s.start_minute, s.end_hour, s.end_minute, breakThreshold, breakDeduction)
    }));
    setShifts(shiftsWithBreak);
    setCalculatedPaySummary([]); // 초기화
    setIsDevMenuOpen(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen font-sans text-slate-900 relative">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
          MOM'S TOUCH <span className="text-orange-500">PAYROLL</span>
        </h1>
        <p className="text-slate-500 font-medium">굽은다리역점 스마트 급여 정산 시스템</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">⚙️ 전역 정산 정책</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">기본 시급 (원)</label>
                <input type="number" value={hourlyWage} onChange={(e) => setHourlyWage(Number(e.target.value))} className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-orange-600 focus:ring-2 focus:ring-orange-400 outline-none" />
              </div>
              <div className="pt-4 border-t border-slate-50">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">자동 휴게 기준 (시간)</label>
                <div className="flex items-center gap-3">
                  <input type="number" value={breakThreshold / 60} onChange={(e) => setBreakThreshold(Number(e.target.value) * 60)} className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-400" />
                  <span className="text-sm font-bold text-slate-400">시간 이상</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">차감 휴게 시간 (분)</label>
                <div className="flex items-center gap-3">
                  <input type="number" value={breakDeduction} onChange={(e) => setBreakDeduction(Number(e.target.value))} className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-red-500 outline-none focus:ring-2 focus:ring-orange-400" />
                  <span className="text-sm font-bold text-slate-400">분 차감</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📸 근무표 업로드</h2>
              <label className="flex items-center gap-2 cursor-pointer group" title={useCompression ? "이미지 용량을 줄여 전송 속도를 높입니다." : "이미지 원본 그대로 전송합니다."}>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={useCompression} 
                    onChange={(e) => setUseCompression(e.target.checked)} 
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                  {useCompression ? "빠른 전송 (압축 ON)" : "원본 전송 (압축 OFF)"}
                </span>
              </label>
            </div>
            <div className="relative">
              <input 
                type="file" 
                multiple 
                onChange={handleFileChange} 
                disabled={isCompressing || isLoading}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
              />
              {isCompressing && (
                <div className="absolute top-0 right-0 h-full flex items-center pr-4">
                  <span className="text-sm font-bold text-orange-500 animate-pulse">이미지 최적화 중...</span>
                </div>
              )}
            </div>
            {filePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {filePreviews.map((src, index) => (
                  <div key={index} className="relative w-full h-32 bg-slate-100 rounded-lg overflow-hidden cursor-pointer" onClick={() => { setModalImageSrc(src); setIsModalOpen(true); }}>
                    <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            <button 
              onClick={handleAnalyzeAll} 
              disabled={isLoading || isCompressing || selectedFiles.length === 0} 
              className="mt-6 w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 disabled:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  분석 중...
                </>
              ) : (
                "이미지 분석 시작"
              )}
            </button>
          </section>
        </aside>

        <main className="lg:col-span-2 space-y-8">
          {shifts.length > 0 ? (
            Object.entries(groupedData).map(([name, employeeShifts]) => (
              <article key={name} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                  <EditableHeaderName 
                    initialValue={name} 
                    onCommit={(newName) => handleNameUpdate(name, newName)} 
                  />
                  <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full font-medium">총 {employeeShifts.length}건 기록됨</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-center">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="py-4 px-2 whitespace-nowrap w-16">날짜</th>
                        <th className="py-4 px-2 whitespace-nowrap">근무 시간 (출 ~ 퇴)</th>
                        <th className="py-4 px-2 text-orange-500 whitespace-nowrap w-24">휴게(분)</th>
                        <th className="py-4 px-2 bg-orange-50/50 text-orange-600 whitespace-nowrap w-32">실 유급 시간</th>
                        <th className="py-4 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employeeShifts.map((shift) => (
                        <tr 
                          key={shift.id} 
                          className={`hover:bg-slate-50/50 transition-colors ${
                            shift.break_minutes > 0 && !shift.is_paid_break ? 'bg-red-50/50' : ''
                          }`}
                        >
                          <td className="py-5 font-bold text-slate-400 text-sm">
                            <div className="flex items-center justify-center">
                              <EditableCell 
                                value={shift.day} 
                                onUpdate={v => handleShiftUpdate(shift.id, 'day', v)} 
                                className="w-8 text-right"
                              />
                              <span className="ml-1 text-xs">일</span>
                            </div>
                          </td>
                          <td className="py-5">
                            <div className="flex justify-center items-center gap-1 font-bold text-slate-700">
                              <EditableCell value={shift.start_hour} onUpdate={v => handleShiftUpdate(shift.id, 'start_hour', v)} className="w-8" />:
                              <EditableCell value={shift.start_minute} onUpdate={v => handleShiftUpdate(shift.id, 'start_minute', v)} className="w-8" />
                              <span className="px-2 text-slate-300">→</span>
                              <EditableCell value={shift.end_hour} onUpdate={v => handleShiftUpdate(shift.id, 'end_hour', v)} className="w-8" />:
                              <EditableCell value={shift.end_minute} onUpdate={v => handleShiftUpdate(shift.id, 'end_minute', v)} className="w-8" />
                            </div>
                          </td>
                          <td className={`py-5 w-24 ${shift.is_break_manual ? 'bg-orange-50/50' : ''}`}>
                            <EditableCell value={String(shift.break_minutes)} onUpdate={v => handleShiftUpdate(shift.id, 'break_minutes', Number(v))} className={shift.is_break_manual ? "text-orange-600 font-black" : "text-slate-400"} />
                          </td>
                          <td className="py-5 font-black text-slate-800 bg-orange-50/30">
                            {formatMinutesToHM(calculateShiftDurationMinutes(shift))}
                          </td>
                          <td className="py-5">
                            <button 
                              onClick={() => handleShiftDelete(shift.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                              title="삭제"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {addingState === name ? (
                        <tr className="bg-orange-50 border-t-2 border-orange-200 animate-in fade-in slide-in-from-top-2">
                          <td className="py-4 px-2">
                            <div className="flex items-center justify-center bg-white rounded-lg border border-orange-200 p-1">
                              <input 
                                autoFocus
                                type="text" 
                                placeholder="일"
                                value={newShiftData.day}
                                onChange={e => setNewShiftData({...newShiftData, day: e.target.value})}
                                className="w-10 text-center font-bold outline-none text-orange-600 placeholder-orange-200"
                              />
                              <span className="text-xs text-orange-400 font-bold mr-1">일</span>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex justify-center items-center gap-1 font-bold text-slate-700 bg-white p-2 rounded-lg border border-orange-200 shadow-sm">
                              <input className="w-6 text-center outline-none" placeholder="09" value={newShiftData.start_hour} onChange={e => setNewShiftData({...newShiftData, start_hour: e.target.value})} />:
                              <input className="w-6 text-center outline-none" placeholder="00" value={newShiftData.start_minute} onChange={e => setNewShiftData({...newShiftData, start_minute: e.target.value})} />
                              <span className="px-1 text-slate-300">→</span>
                              <input className="w-6 text-center outline-none" placeholder="18" value={newShiftData.end_hour} onChange={e => setNewShiftData({...newShiftData, end_hour: e.target.value})} />:
                              <input className="w-6 text-center outline-none" placeholder="00" value={newShiftData.end_minute} onChange={e => setNewShiftData({...newShiftData, end_minute: e.target.value})} />
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <input 
                              type="number" 
                              value={newShiftData.break_minutes}
                              onChange={e => setNewShiftData({...newShiftData, break_minutes: e.target.value})}
                              className="w-16 text-center p-2 rounded-lg border border-orange-200 outline-none font-bold text-slate-600"
                            />
                          </td>
                          <td colSpan={2} className="py-4 px-2 text-right">
                            <div className="flex justify-end gap-2 pr-2">
                              <button onClick={confirmAdding} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-xs shadow-md transition-all">
                                저장
                              </button>
                              <button onClick={cancelAdding} className="bg-white border border-slate-200 text-slate-500 hover:text-slate-700 font-bold py-2 px-4 rounded-lg text-xs transition-all">
                                취소
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-3 px-4 bg-slate-50">
                            <button 
                              onClick={() => startAdding(name)}
                              className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                              근무 기록 추가
                            </button>
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </article>
            ))
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
              <p className="font-bold text-lg">데이터가 없습니다.</p>
              <p className="text-sm">근무표 사진을 업로드하여 분석을 시작하세요.</p>
            </div>
          )}

          {shifts.length > 0 && (
            <div className="pt-4">
              <button onClick={handleCalculatePay} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-xl shadow-orange-200 shadow-2xl hover:bg-orange-600 transition-all hover:-translate-y-1 active:scale-95">
                최종 월급 정산 리포트 생성
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 🧾 급여 정산 리포트 (전체 너비 사용) */}
      {calculatedPaySummary.length > 0 && (
        <section className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <PaySummary 
            weeklySummaries={calculatedPaySummary} 
            hourlyWage={hourlyWage} 
            employeeName={shifts.length > 0 ? shifts[0].name : "직원"}
          />
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-white bg-gray-800 rounded-full p-2 hover:bg-gray-700 transition-colors z-10" onClick={() => setIsModalOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={modalImageSrc} alt="Full size preview" className="max-w-full max-h-full object-contain" />
          </div>
        </div>
      )}

      {/* DevTools Floating Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setIsDevMenuOpen(!isDevMenuOpen)}
          className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 flex items-center justify-center"
          title="개발자 도구 (Mock Data)"
        >
          <span className="text-2xl">🛠️</span>
        </button>
        
        {isDevMenuOpen && (
          <div className="absolute bottom-full right-0 mb-4 bg-white rounded-xl shadow-xl border border-slate-100 w-48 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="p-3 border-b border-slate-50 bg-slate-50">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Mock Generator</span>
            </div>
            <div className="p-1 space-y-1">
              <button 
                onClick={() => handleDevGenerate('under-15')}
                className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
              >
                1. 주휴 미달 (15h↓)
              </button>
              <button 
                onClick={() => handleDevGenerate('full-time')}
                className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
              >
                2. 풀타임 (40h↑)
              </button>
              <button 
                onClick={() => handleDevGenerate('random')}
                className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
              >
                3. 완전 랜덤 (Random)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
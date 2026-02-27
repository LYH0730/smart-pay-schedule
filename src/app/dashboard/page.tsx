"use client";

import { useState } from 'react';
import DashboardClient from "../../components/DashboardClient";
import SignOutButton from "../../components/SignOutButton";

export default function DashboardPage() {
  const today = new Date();
  // 🌟 [최적화] 사장님들은 보통 '지난 달'의 급여를 정산하므로 기본값을 지난 달로 설정
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const currentYear = lastMonthDate.getFullYear();
  const currentMonth = lastMonthDate.getMonth(); // 0: 1월, 1: 2월...

  // 🌟 [상태 설정] 연도, 월, 모델 선택 관리
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  // 🌟 [모델 최적화] 기본 분석 엔진을 Gemini 3 Flash로 설정
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-flash-preview');
  
  const [isMonthManuallySet, setIsMonthManuallySet] = useState(false);

  // 연도 선택 범위 (현재 기준 -5년 ~ +5년)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  // 월 선택 범위 (1월 ~ 12월)
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(Number(e.target.value));
    setIsMonthManuallySet(true);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="p-2 md:p-8 max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
          <SignOutButton />
        </div>
        {/* 📅 기간 및 모델 설정 영역 */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 기간 선택 창 */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <label htmlFor="year-select" className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  대상 연도
                </label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-400 outline-none"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="month-select" className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  대상 월
                </label>
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-400 outline-none"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>{month + 1}월</option>
                  ))}
                </select>
              </div>
            </div>

            {/* AI 모델 선택 창 */}
            <div className="flex-1">
              <label htmlFor="model-select" className="block text-xs font-bold text-slate-400 uppercase mb-2">
                분석 엔진 (AI 모델)
              </label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-orange-600 focus:ring-2 focus:ring-orange-400 outline-none"
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
              </select>
            </div>

          </div>
        </section>

        {/* 📊 메인 정산 클라이언트 컴포넌트 */}
        <DashboardClient
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedModel={selectedModel}
          onAnalyzedMonthYearChange={({ year, month }) => {
            setSelectedYear(year);
            setSelectedMonth(month);
            setIsMonthManuallySet(false); // AI가 자동으로 날짜를 잡으면 수동 플래그 해제
          }}
        />
      </div>
    </main>
  );
}
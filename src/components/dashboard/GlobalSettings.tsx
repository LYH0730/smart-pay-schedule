"use client";

import React from 'react';

interface GlobalSettingsProps {
  hourlyWage: number;
  setHourlyWage: (value: number) => void;
  breakThreshold: number;
  setBreakThreshold: (value: number) => void;
  breakDeduction: number;
  setBreakDeduction: (value: number) => void;
  isFixedWage: boolean;
  setIsFixedWage: (value: boolean) => void;
}

export default function GlobalSettings({
  hourlyWage,
  setHourlyWage,
  breakThreshold,
  setBreakThreshold,
  breakDeduction,
  setBreakDeduction,
  isFixedWage,
  setIsFixedWage
}: GlobalSettingsProps) {
  // 2026년 최저시급 10,320원 * 1.2 = 12,384원 (주휴수당 포함 기준)
  const FIXED_WAGE_MINIMUM = 12384;
  const showWarning = isFixedWage && hourlyWage < FIXED_WAGE_MINIMUM;

  return (
    <section className="bg-white p-4 md:p-5 rounded-2xl shadow-xl border border-slate-100">
      <h2 className="text-lg font-bold mb-5 flex items-center gap-2">⚙️ 정산 정책</h2>
      <div className="space-y-5">
        <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase">주휴수당 포함 시급</span>
            <button
              onClick={() => setIsFixedWage(!isFixedWage)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                isFixedWage ? 'bg-orange-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  isFixedWage ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            ON 설정 시 주휴수당을 별도로 계산하지 않고,<br/>입력한 시급으로만 정산합니다.
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">
            {isFixedWage ? "시급 (주휴수당 포함)" : "기본 시급 (원)"}
          </label>
          <input 
            type="number" 
            value={hourlyWage} 
            onChange={(e) => setHourlyWage(Number(e.target.value))} 
            className={`w-full p-3 border-none rounded-xl font-black focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-colors ${
              showWarning ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-slate-50 text-orange-600'
            }`} 
          />
          {showWarning && (
            <p className="mt-2 text-[10px] font-bold text-red-500 flex items-center gap-1">
              ⚠️ 최저임금 기준(약 {FIXED_WAGE_MINIMUM.toLocaleString()}원)보다 낮습니다.
            </p>
          )}
        </div>
        
        <div className="pt-4 border-t border-slate-50 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">자동 휴게 기준</label>
            <div className="relative flex items-center">
              <input type="number" value={breakThreshold / 60} onChange={(e) => setBreakThreshold(Number(e.target.value) * 60)} className="w-full p-3 bg-slate-50 border-none rounded-xl font-black outline-none focus:ring-2 focus:ring-orange-400 text-sm pr-12" />
              <span className="absolute right-3 text-[10px] font-bold text-slate-400">시간 이상</span>
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">차감 휴게 시간</label>
            <div className="relative flex items-center">
              <input type="number" value={breakDeduction} onChange={(e) => setBreakDeduction(Number(e.target.value))} className="w-full p-3 bg-slate-50 border-none rounded-xl font-black text-red-500 outline-none focus:ring-2 focus:ring-orange-400 text-sm pr-12" />
              <span className="absolute right-3 text-[10px] font-bold text-slate-400">분 차감</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
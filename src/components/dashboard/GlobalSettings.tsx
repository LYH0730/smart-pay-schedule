"use client";

import React from 'react';

interface GlobalSettingsProps {
  hourlyWage: number;
  setHourlyWage: (value: number) => void;
  breakThreshold: number;
  setBreakThreshold: (value: number) => void;
  breakDeduction: number;
  setBreakDeduction: (value: number) => void;
}

export default function GlobalSettings({
  hourlyWage,
  setHourlyWage,
  breakThreshold,
  setBreakThreshold,
  breakDeduction,
  setBreakDeduction
}: GlobalSettingsProps) {
  return (
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
  );
}
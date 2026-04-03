import React, { useState } from 'react';
import { WeeklyPayrollSummary } from '../types';
import { formatMinutesToHM } from '../lib/payroll-utils';

interface CalculationBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
  weeklySummaries: WeeklyPayrollSummary[];
  hourlyWage: number;
}

export default function CalculationBreakdown({ isOpen, onClose, weeklySummaries, hourlyWage }: CalculationBreakdownProps) {
  const [activeTab, setActiveTab] = useState<'logic' | 'verification'>('logic');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🧮 급여 계산 검증기
              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase">Logic Inspector</span>
            </h2>
            <p className="text-slate-400 text-xs mt-1">시스템이 급여를 산출하는 정확한 수식과 과정을 공개합니다.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 shrink-0">
          <button
            onClick={() => setActiveTab('logic')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${
              activeTab === 'logic' 
                ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            📘 계산 논리 (Theory)
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${
              activeTab === 'verification' 
                ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            ✅ 실제 값 대입 (Verification)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          {activeTab === 'logic' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              
              {/* 1. Variable Definitions */}
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">1. 변수 정의 (Variables)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 font-bold">W</span>
                    <span className="text-slate-600">기본 시급 (Hourly Wage)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 font-bold">T_total</span>
                    <span className="text-slate-600">총 체류 시간 (출근 ~ 퇴근)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 font-bold">T_break</span>
                    <span className="text-slate-600">무급 휴게 시간 (공제)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-orange-100 px-2 py-1 rounded text-orange-700 font-bold">T_actual</span>
                    <span className="text-slate-900 font-bold">실 근무 시간 (T_total - T_break)</span>
                  </div>
                </div>
              </section>

              {/* 2. Step-by-Step Logic */}
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">2. 계산 단계 (Logic Steps)</h3>
                
                <div className="space-y-6">
                  {/* Step 1 */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">Step 1. 기본급 계산 (Basic Pay)</h4>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs md:text-sm overflow-x-auto">
                      <p className="text-green-400">// 분 단위 계산 후 원 단위 절사</p>
                      <p>BasePay = (T_actual / 60) × W</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">Step 2. 주휴수당 (Weekly Holiday Allowance)</h4>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs md:text-sm overflow-x-auto">
                      <p className="text-green-400">// 주 15시간(900분) 이상 근무 시 발생</p>
                      <p>Week_Actual_Mins = ∑(Daily T_actual)</p>
                      <br/>
                      <p className="text-purple-400">IF (Week_Actual_Mins ≥ 900) {'{'}</p>
                      <p className="pl-4 text-green-400">// 40시간 비례제 적용, 최대 8시간(480분)</p>
                      <p className="pl-4">Juhyu_Mins = Math.min( (Week_Actual_Mins / 40 / 60) * 8 * 60, 480 )</p>
                      <p className="pl-4">Juhyu_Pay = (Juhyu_Mins / 60) × W</p>
                      <p className="text-purple-400">{'}'} ELSE {'{'}</p>
                      <p className="pl-4">Juhyu_Pay = 0</p>
                      <p className="text-purple-400">{'}'}</p>
                    </div>
                  </div>

                   {/* Step 3 */}
                   <div>
                    <h4 className="font-bold text-slate-800 mb-2">Step 3. 최종 지급액 (Total Pay)</h4>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs md:text-sm overflow-x-auto">
                      <p>TotalPay = BasePay + Juhyu_Pay</p>
                    </div>
                  </div>

                   {/* Step 4 */}
                   <div>
                    <h4 className="font-bold text-slate-800 mb-2">Step 4. 세금 및 공제액 (Tax & Deduction)</h4>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs md:text-sm overflow-x-auto">
                      <p className="text-green-400">// 소득세 3% 및 지방소득세 0.3%(소득세의 10%) 계산</p>
                      <p className="text-green-400">// 각각 10원 단위 절사(Truncation) 적용</p>
                      <p>Monthly_Gross = ∑(Weekly TotalPay)</p>
                      <p>Income_Tax = Math.floor((Monthly_Gross * 0.03) / 10) * 10</p>
                      <p>Local_Tax = Math.floor((Income_Tax * 0.1) / 10) * 10</p>
                      <p>Total_Deduction = Income_Tax + Local_Tax</p>
                      <br/>
                      <p>Net_Pay = Monthly_Gross - Total_Deduction</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex justify-between items-center">
                <span className="font-bold text-orange-800">적용된 시급 (W)</span>
                <span className="font-black text-2xl text-orange-600">{hourlyWage.toLocaleString()}원</span>
              </div>

              {weeklySummaries.map((summary) => (
                <div key={summary.weekNumber} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-black text-lg text-slate-800 mb-4 pb-2 border-b border-slate-100">
                    {summary.weekNumber}주차 검증 ({summary.startDate} ~ {summary.endDate})
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Raw Data */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">입력 데이터 (Inputs)</h5>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between">
                          <span className="text-slate-600">주간 실 근무 (T_actual_week)</span>
                          <span className="font-mono font-bold">{summary.actualWorkingMinutes}분 ({formatMinutesToHM(summary.actualWorkingMinutes)})</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-slate-600">주휴 발생 기준</span>
                          <span className="font-mono text-slate-400">15시간 (900분)</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-slate-600">조건 충족 여부</span>
                          <span className={`font-bold ${summary.actualWorkingMinutes >= 900 ? 'text-green-600' : 'text-red-500'}`}>
                            {summary.actualWorkingMinutes >= 900 ? 'PASS (충족)' : 'FAIL (미달)'}
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Right: Calculation */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">수식 대입 (Applied Formula)</h5>
                      <div className="bg-slate-50 p-3 rounded text-xs font-mono space-y-2 text-slate-700">
                        {/* 기본급 계산 */}
                        <div className="border-b border-slate-200 pb-2">
                          <div className="flex justify-between">
                            <span>기본급</span>
                            <span>({summary.actualWorkingMinutes} / 60) × {hourlyWage.toLocaleString()}</span>
                          </div>
                          <div className="text-right font-bold text-slate-900">= {summary.basePay.toLocaleString()}원</div>
                        </div>

                        {/* 주휴수당 계산 */}
                        <div className="pt-1">
                          <div className="flex justify-between text-slate-500">
                            <span>주휴시간</span>
                            <span>
                              {summary.actualWorkingMinutes >= 900 
                                ? `(${summary.actualWorkingMinutes}/40/60) × 8 × 60` 
                                : '조건 미달'}
                            </span>
                          </div>
                          <div className="text-right font-bold text-slate-600 mb-1">
                             = {summary.weeklyHolidayAllowanceMinutes}분 ({formatMinutesToHM(summary.weeklyHolidayAllowanceMinutes)})
                          </div>
                          
                          <div className="flex justify-between">
                            <span>주휴수당</span>
                            <span>({summary.weeklyHolidayAllowanceMinutes} / 60) × {hourlyWage.toLocaleString()}</span>
                          </div>
                          <div className="text-right font-bold text-orange-600">= {summary.weeklyHolidayAllowance.toLocaleString()}원</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between items-center bg-slate-100 p-2 rounded">
                        <span className="font-bold text-slate-700">주 합계</span>
                        <span className="font-black text-slate-900 text-lg">{summary.totalWeeklyPay.toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-white p-4 border-t border-slate-100 text-center shrink-0">
          <button 
            onClick={onClose}
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
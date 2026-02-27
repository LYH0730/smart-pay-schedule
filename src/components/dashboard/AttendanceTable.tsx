"use client";

import React from 'react';
import AttendanceRow from './AttendanceRow';
import EditableHeaderName from '../common/EditableHeaderName';

interface AttendanceTableProps {
  attendanceData: Record<number, any[]>;
  employeeName: string;
  onUpdateName: (newName: string) => void;
  onUpdateRecord: (day: number, index: number, field: string, value: string) => void;
  onDeleteRecord: (day: number, index: number) => void;
  onAddRecord: (day: number) => void;
  onCalculatePay: () => void;
  selectedYear: number;
  selectedMonth: number;
  errors: Record<string, string>;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  attendanceData,
  employeeName,
  onUpdateName,
  onUpdateRecord,
  onDeleteRecord,
  onAddRecord,
  onCalculatePay,
  selectedYear,
  selectedMonth,
  errors
}) => {
  const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-6">
      <article className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 max-w-full">
        {/* ... (중략: 헤더) */}

        {/* 1~31일 렌더링 루프 */}
        <div className="divide-y divide-slate-50 max-h-[70vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <AttendanceRow
              key={`${day}`} // 여기도 고정 키 권장
              day={day}
              records={attendanceData[day] || []}
              isLastDayOfMonth={day === lastDayOfMonth}
              onUpdate={onUpdateRecord}
              onDelete={onDeleteRecord}
              onAdd={onAddRecord}
              errors={errors}
            />
          ))}
        </div>
      </article>

      {/* 정산 버튼 및 에러 안내 */}
      <div className="pt-2 space-y-3">
        {hasErrors && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
            <span className="text-xl">⚠️</span>
            <div className="text-xs font-bold text-red-600">
              입력된 기록에 오류가 있습니다. ({Object.keys(errors).length}건)<br/>
              <span className="text-[10px] font-medium opacity-80">해당 날짜의 빨간색 입력창을 수정해 주세요.</span>
            </div>
          </div>
        )}
        <button 
          onClick={onCalculatePay} 
          disabled={hasErrors}
          className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 ${
            hasErrors 
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
            : 'bg-orange-500 text-white shadow-orange-200 hover:bg-orange-600 hover:-translate-y-1 active:scale-95'
          }`}
        >
          <span>📊</span> 최종 월급 정산 리포트 생성
        </button>
      </div>
    </div>
  );
};

export default AttendanceTable;

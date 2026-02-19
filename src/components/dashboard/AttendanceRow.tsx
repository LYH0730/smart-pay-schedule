"use client";

import React, { useState, useEffect } from 'react';
import TimeInput from '../common/Input';

interface AttendanceRecord {
  id?: string;
  sh: string;
  sm: string;
  eh: string;
  em: string;
  brk?: string;
  isManual?: boolean;
}

interface AttendanceRowProps {
  day: number;
  records: AttendanceRecord[];
  isLastDayOfMonth?: boolean;
  onUpdate: (day: number, index: number, field: string, value: string) => void;
  onDelete: (day: number, index: number) => void;
  onAdd: (day: number) => void;
  errors?: Record<string, string>;
}

const PlusIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const TrashIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);

const AttendanceRow: React.FC<AttendanceRowProps> = ({
  day,
  records,
  isLastDayOfMonth = false,
  onUpdate,
  onDelete,
  onAdd,
  errors = {}
}) => {
  const [focusTarget, setFocusTarget] = useState<{index: number, type: 'start' | 'end'} | null>(null);
  const isEmpty = records.length === 0;

  useEffect(() => {
    if (!isEmpty && records.length === 1 && !records[0].sh && !records[0].eh) {
      setFocusTarget({ index: 0, type: 'start' });
    }
  }, [isEmpty, records.length]);

  const formatTime = (h: string, m: string) => {
    if (!h && !m) return "";
    if (h.length === 2 && m) return `${h}:${m}`;
    return h + m;
  };

  const calculateSubtotal = (r: AttendanceRecord) => {
    if (!r.sh || !r.eh) return "0:00";
    const startMins = parseInt(r.sh) * 60 + parseInt(r.sm || "0");
    const endMins = parseInt(r.eh) * 60 + parseInt(r.em || "0");
    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60;
    const workMins = Math.max(0, diff - parseInt(r.brk || "0"));
    return `${Math.floor(workMins / 60)}:${String(workMins % 60).padStart(2, '0')}`;
  };

  const displayRecords = isEmpty ? [{ sh: "", sm: "", eh: "", em: "", brk: "0" }] : records;

  return (
    <div className={`border-b border-slate-100 transition-colors ${isLastDayOfMonth ? 'bg-orange-50/30' : ''}`}>
      {/* 🖥️ PC 레이아웃 */}
      <div className="hidden md:flex items-stretch px-4">
        <div className="w-10 flex-shrink-0 flex items-center justify-center font-bold text-slate-500 border-r border-slate-50">
          {day}
        </div>
        
        <div className={`flex-1 flex flex-col divide-y divide-slate-50 ${isEmpty ? 'opacity-40' : ''}`}>
          {displayRecords.map((r, i) => {
            const prefix = `${day}-${i}`;
            const shError = errors[`${prefix}-sh`];
            const smError = errors[`${prefix}-sm`];
            const startError = shError || smError;

            const ehError = errors[`${prefix}-eh`];
            const emError = errors[`${prefix}-em`];
            const endError = ehError || emError;

            const brkError = errors[`${prefix}-brk`];

            return (
              <div key={`${day}-${i}`} className="flex items-center py-2 animate-in fade-in slide-in-from-left-2">
                <div className="flex-1 flex items-center justify-center gap-2 px-2">
                  <div className="w-24 relative group">
                    <TimeInput 
                      value={formatTime(r.sh, r.sm)} 
                      onChange={v => {
                        const parts = v.split(':');
                        onUpdate(day, i, 'sh', parts[0].replace(/\D/g, ''));
                        onUpdate(day, i, 'sm', (parts[1] || "").replace(/\D/g, ''));
                      }} 
                      onComplete={() => setFocusTarget({index: i, type: 'end'})}
                      autoFocus={focusTarget?.index === i && focusTarget?.type === 'start'}
                      className={`text-base py-1.5 transition-all ${
                        startError 
                        ? 'border-red-600 border-2 bg-red-50 text-red-700 ring-2 ring-red-100' 
                        : 'border-slate-200'
                      }`}
                    />
                    {startError && <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-red-700 text-white text-[10px] font-bold rounded shadow-xl whitespace-nowrap z-20 animate-in zoom-in-95">{startError}</div>}
                  </div>
                  <span className="text-slate-300 text-xs">~</span>
                  <div className="w-24 relative group">
                    <TimeInput 
                      value={formatTime(r.eh, r.em)} 
                      onChange={v => {
                        const parts = v.split(':');
                        onUpdate(day, i, 'eh', parts[0].replace(/\D/g, ''));
                        onUpdate(day, i, 'em', (parts[1] || "").replace(/\D/g, ''));
                      }} 
                      autoFocus={focusTarget?.index === i && focusTarget?.type === 'end'} 
                      className={`text-base py-1.5 transition-all ${
                        endError 
                        ? 'border-red-600 border-2 bg-red-50 text-red-700 ring-2 ring-red-100' 
                        : 'border-slate-200'
                      }`}
                    />
                    {endError && <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-red-700 text-white text-[10px] font-bold rounded shadow-xl whitespace-nowrap z-20 animate-in zoom-in-95">{endError}</div>}
                  </div>
                </div>

                <div className="w-16 flex-shrink-0 flex justify-center relative group">
                  <input 
                    type="text" 
                    value={r.brk || "0"} 
                    onChange={e => onUpdate(day, i, 'brk', e.target.value.replace(/\D/g, ''))} 
                    className={`w-12 text-center py-1.5 text-xs border rounded-lg outline-none focus:ring-1 focus:ring-orange-500 transition-all ${
                      brkError 
                      ? 'border-red-600 border-2 bg-red-50 text-red-700 ring-2 ring-red-100' 
                      : r.isManual ? 'border-orange-300 bg-orange-50 font-bold text-orange-600' : 'border-slate-200'
                    }`} 
                  />
                  {brkError && <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-red-700 text-white text-[10px] font-bold rounded shadow-xl whitespace-nowrap z-20 animate-in zoom-in-95">{brkError}</div>}
                </div>

                <div className="w-20 flex-shrink-0 flex justify-center">
                  <div className="w-16 text-center font-black text-slate-700 bg-slate-50 py-1.5 rounded-lg text-[11px]">
                    {calculateSubtotal(r)}
                  </div>
                </div>

                <div className="w-20 flex-shrink-0 flex items-center justify-end gap-0.5">
                  {i === 0 ? (
                    <button onClick={() => onAdd(day)} className="p-1.5 text-slate-400 hover:text-orange-500 transition-colors" title="근무 추가"><PlusIcon size={16} /></button>
                  ) : (
                    <button onClick={() => onDelete(day, i)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="삭제"><TrashIcon size={16} /></button>
                  )}
                  {i === 0 && !isEmpty && (r.sh || r.eh) && (
                    <button onClick={() => onDelete(day, 0)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="초기화"><TrashIcon size={16} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📱 모바일 레이아웃 */}
      <div className="md:hidden px-4 py-3">
        <div className="flex justify-between items-center h-10">
          <div className="flex items-center gap-2">
            <span className={`font-black text-lg ${isEmpty ? 'text-slate-400' : 'text-slate-800'}`}>{day}일</span>
            {!isEmpty && <div className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Record</div>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onAdd(day)} className={`p-2 rounded-xl transition-all ${isEmpty ? 'bg-slate-100 text-slate-500 active:scale-90' : 'text-orange-500 hover:bg-orange-50'}`}><PlusIcon size={20} /></button>
            {!isEmpty && <button onClick={() => onDelete(day, 0)} className="p-2 text-slate-300 hover:text-red-500"><TrashIcon size={20} /></button>}
          </div>
        </div>

        {!isEmpty && (
          <div className="mt-3 space-y-4 pb-2 animate-in fade-in slide-in-from-top-2 duration-300">
            {records.map((r, i) => {
              const prefix = `${day}-${i}`;
              const rowShError = errors[`${prefix}-sh`];
              const rowSmError = errors[`${prefix}-sm`];
              const rowEhError = errors[`${prefix}-eh`];
              const rowEmError = errors[`${prefix}-em`];
              const rowBrkError = errors[`${prefix}-brk`];
              const hasRowError = rowShError || rowSmError || rowEhError || rowEmError || rowBrkError;

              return (
                <div key={`${day}-${i}`} className={`p-4 rounded-2xl border-2 relative shadow-sm transition-all ${hasRowError ? 'border-red-600 bg-red-50 shadow-red-100' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="space-y-1">
                      <label className={`text-[10px] font-black uppercase ml-1 ${hasRowError ? 'text-red-600' : 'text-slate-400'}`}>출근 시간</label>
                      <TimeInput value={formatTime(r.sh, r.sm)} onChange={v => {
                        const parts = v.split(':');
                        onUpdate(day, i, 'sh', parts[0].replace(/\D/g, ''));
                        onUpdate(day, i, 'sm', (parts[1] || "").replace(/\D/g, ''));
                      }} onComplete={() => setFocusTarget({index: i, type: 'end'})} autoFocus={focusTarget?.index === i && focusTarget?.type === 'start'} className={(rowShError || rowSmError) ? 'border-red-600 border-2 bg-white text-red-700' : ''} />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-[10px] font-black uppercase ml-1 ${hasRowError ? 'text-red-600' : 'text-slate-400'}`}>퇴근 시간</label>
                      <TimeInput value={formatTime(r.eh, r.em)} onChange={v => {
                        const parts = v.split(':');
                        onUpdate(day, i, 'eh', parts[0].replace(/\D/g, ''));
                        onUpdate(day, i, 'em', (parts[1] || "").replace(/\D/g, ''));
                      }} autoFocus={focusTarget?.index === i && focusTarget?.type === 'end'} className={(rowEhError || rowEmError) ? 'border-red-600 border-2 bg-white text-red-700' : ''} />
                    </div>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-xl border-2 transition-all ${hasRowError ? 'bg-white border-red-200' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase ${hasRowError ? 'text-red-600' : 'text-slate-400'}`}>휴게(분)</span>
                      <input type="text" value={r.brk || "0"} onChange={e => onUpdate(day, i, 'brk', e.target.value.replace(/\D/g, ''))} className={`w-12 text-center text-sm font-black outline-none ${rowBrkError ? 'text-red-600' : 'text-slate-600'}`} />
                    </div>
                    <div className={`text-sm font-black ${hasRowError ? 'text-red-700' : 'text-orange-600'}`}>근무 {calculateSubtotal(r)}</div>
                  </div>
                  {hasRowError && <p className="mt-2 text-[10px] font-black text-red-600 animate-pulse flex items-center gap-1"><span>⚠️</span> {rowShError || rowSmError || rowEhError || rowEmError || rowBrkError}</p>}
                  {i > 0 && <button onClick={() => onDelete(day, i)} className="absolute -top-2 -right-2 bg-white shadow-md border-2 border-red-100 p-1.5 rounded-full text-red-500 active:scale-90"><TrashIcon size={14} /></button>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceRow;

"use client";

import React from 'react';
import { Shift } from '../../types';
import EditableHeaderName from '../common/EditableHeaderName';
import EditableCell from '../common/EditableCell';
import TimeInputCell from '../common/TimeInputCell';
import { calculateShiftDurationMinutes } from '../../lib/payroll-utils';

interface ShiftTableProps {
  shiftsLength: number;
  addingState: string | null;
  groupedData: Record<string, Shift[]>;
  onStartAdding: (name: string) => void;
  onHandleNameUpdate: (oldName: string, newName: string) => void;
  onShiftUpdate: (shiftId: string, field: keyof Shift, value: any) => void;
  onShiftDelete: (shiftId: string) => void;
  newShiftData: any;
  setNewShiftData: (data: any) => void;
  onConfirmAdding: () => void;
  onCancelAdding: () => void;
  onCalculatePay: () => void;
}

export default function ShiftTable({
  shiftsLength,
  addingState,
  groupedData,
  onStartAdding,
  onHandleNameUpdate,
  onShiftUpdate,
  onShiftDelete,
  newShiftData,
  setNewShiftData,
  onConfirmAdding,
  onCancelAdding,
  onCalculatePay
}: ShiftTableProps) {
  
  if (shiftsLength === 0 && !addingState) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 gap-4">
        <div className="text-center">
          <p className="font-bold text-lg text-slate-500">데이터가 없습니다.</p>
          <p className="text-sm">근무표 사진을 업로드하거나 수동으로 시작하세요.</p>
        </div>
        <button 
          onClick={() => onStartAdding("직원")}
          className="px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-600 font-bold hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all flex items-center gap-2"
        >
          <span className="text-lg">✏️</span> 수동 입력 시작하기
        </button>
      </div>
    );
  }

  return (
    <>
      {Object.entries(groupedData).map(([name, employeeShifts]) => (
        <article key={name} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
            <EditableHeaderName 
              initialValue={name} 
              onCommit={(newName) => onHandleNameUpdate(name, newName)} 
            />
            <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full font-medium">총 {employeeShifts.length}건 기록됨</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100">
                  <th className="py-4 px-1 whitespace-nowrap w-10">일</th>
                  <th className="py-4 px-1 whitespace-nowrap">시간</th>
                  <th className="py-4 px-1 text-orange-500 whitespace-nowrap w-16">휴게</th>
                  <th className="py-4 px-1 bg-orange-50/50 text-orange-600 whitespace-nowrap w-20">유급</th>
                  <th className="py-4 px-1 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeShifts.map((shift) => (
                  <tr 
                    key={shift.id} 
                    className={`hover:bg-slate-50/50 transition-colors ${
                      shift.break_minutes > 0 && !shift.is_paid_break ? 'bg-red-100/70 hover:bg-red-100' : ''
                    }`}
                  >
                    <td className="py-4 px-0 font-bold text-slate-400 text-[15px]">
                      <div className="flex items-center justify-center">
                        <EditableCell 
                          value={shift.day} 
                          onUpdate={v => onShiftUpdate(shift.id, 'day', v)} 
                          className="w-7 text-center bg-slate-50 rounded"
                        />
                      </div>
                    </td>
                    <td className="py-4 px-0">
                      <div className="flex justify-center items-center gap-1 font-bold text-slate-700">
                        <TimeInputCell 
                          hour={shift.start_hour} 
                          minute={shift.start_minute} 
                          onUpdate={(h, m) => {
                            onShiftUpdate(shift.id, 'start_hour', h);
                            onShiftUpdate(shift.id, 'start_minute', m);
                          }} 
                        />
                        <span className="text-slate-300 text-[10px]">→</span>
                        <TimeInputCell 
                          hour={shift.end_hour} 
                          minute={shift.end_minute} 
                          onUpdate={(h, m) => {
                            onShiftUpdate(shift.id, 'end_hour', h);
                            onShiftUpdate(shift.id, 'end_minute', m);
                          }} 
                        />
                      </div>
                    </td>
                    <td className={`py-4 px-0 w-16 ${shift.is_break_manual ? 'bg-orange-50/50' : ''}`}>
                      <EditableCell value={String(shift.break_minutes)} onUpdate={v => onShiftUpdate(shift.id, 'break_minutes', Number(v))} className={`w-12 mx-auto ${shift.is_break_manual ? "text-orange-600 font-black" : "text-slate-400"}`} />
                    </td>
                    <td className="py-4 px-0 font-black text-slate-800 bg-orange-50/30 text-[14px]">
                      {(() => {
                          const mins = calculateShiftDurationMinutes(shift);
                          const h = Math.floor(mins / 60);
                          const m = mins % 60;
                          return `${h}:${String(m).padStart(2, '0')}`;
                      })()}
                    </td>
                    <td className="py-4 px-0">
                      <button 
                        onClick={() => onShiftDelete(shift.id)}
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
                      <div className="flex justify-center items-center gap-2 font-bold text-slate-700 bg-white p-2 rounded-lg border border-orange-200 shadow-sm">
                        <input 
                          className="w-14 text-center outline-none text-[16px]" 
                          placeholder="00:00" 
                          value={`${newShiftData.start_hour}:${newShiftData.start_minute}`} 
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9:]/g, '');
                            if (val.includes(':')) {
                              const [h, m] = val.split(':');
                              setNewShiftData({...newShiftData, start_hour: h || '', start_minute: m || ''});
                            } else if (val.length <= 4) {
                              setNewShiftData({...newShiftData, start_hour: val.substring(0, 2), start_minute: val.substring(2, 4)});
                            }
                          }} 
                        />
                        <span className="text-slate-300">→</span>
                        <input 
                          className="w-14 text-center outline-none text-[16px]" 
                          placeholder="00:00" 
                          value={`${newShiftData.end_hour}:${newShiftData.end_minute}`} 
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9:]/g, '');
                            if (val.includes(':')) {
                              const [h, m] = val.split(':');
                              setNewShiftData({...newShiftData, end_hour: h || '', end_minute: m || ''});
                            } else if (val.length <= 4) {
                              setNewShiftData({...newShiftData, end_hour: val.substring(0, 2), end_minute: val.substring(2, 4)});
                            }
                          }} 
                        />
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <input 
                        type="number" 
                        value={newShiftData.break_minutes}
                        onChange={e => setNewShiftData({...newShiftData, break_minutes: e.target.value})}
                        placeholder="0"
                        className="w-16 text-center p-2 rounded-lg border border-orange-200 outline-none font-bold text-slate-600"
                      />
                    </td>
                    <td colSpan={2} className="py-4 px-2 text-right">
                      <div className="flex justify-end gap-2 pr-2">
                        <button onClick={onConfirmAdding} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-xs shadow-md transition-all">
                          저장
                        </button>
                        <button onClick={onCancelAdding} className="bg-white border border-slate-200 text-slate-500 hover:text-slate-700 font-bold py-2 px-4 rounded-lg text-xs transition-all">
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={5} className="py-3 px-4 bg-slate-50">
                      <button 
                        onClick={() => onStartAdding(name)}
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
      ))}

      {shiftsLength > 0 && (
        <div className="pt-4">
          <button onClick={onCalculatePay} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-xl shadow-orange-200 shadow-2xl hover:bg-orange-600 transition-all hover:-translate-y-1 active:scale-95">
            최종 월급 정산 리포트 생성
          </button>
        </div>
      )}
    </>
  );
}
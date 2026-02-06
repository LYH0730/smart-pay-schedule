"use client";

import { useState, useEffect } from 'react';

export default function TimeInputCell({ 
  hour, 
  minute, 
  onUpdate 
}: { 
  hour: string, 
  minute: string, 
  onUpdate: (h: string, m: string) => void 
}) {
  const [localValue, setLocalValue] = useState(`${hour}:${minute}`);

  useEffect(() => {
    setLocalValue(`${hour}:${minute}`);
  }, [hour, minute]);

  const handleBlur = () => {
    // 0930 -> 09:30, 930 -> 09:30, 9:3 -> 09:03 등의 보정 로직
    let clean = localValue.replace(/[^0-9]/g, '');
    if (clean.length <= 2) clean = clean.padStart(2, '0') + '00';
    if (clean.length === 3) clean = '0' + clean;
    if (clean.length > 4) clean = clean.substring(0, 4);

    const h = clean.substring(0, 2);
    const m = clean.substring(2, 4);
    
    setLocalValue(`${h}:${m}`);
    onUpdate(h, m);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className="w-[65px] bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-center font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-orange-400 outline-none text-[16px]"
      placeholder="00:00"
    />
  );
}
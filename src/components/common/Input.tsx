"use client";

import React, { useRef, useEffect } from 'react';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  onComplete,
  placeholder = ":",
  className = "",
  autoFocus = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const isDeletion = inputVal.length < value.length;
    
    // 콜론(:) 위치를 기준으로 앞뒤 세그먼트 추출 (가장 중요)
    const colonIndex = inputVal.indexOf(':');
    let h = "";
    let m = "";

    if (colonIndex !== -1) {
      h = inputVal.substring(0, colonIndex).replace(/\D/g, '').slice(0, 2);
      m = inputVal.substring(colonIndex + 1).replace(/\D/g, '').slice(0, 2);
    } else {
      // 콜론이 없는 경우 (삭제 중이거나 시만 입력 중)
      const digits = inputVal.replace(/\D/g, '');
      if (isDeletion) {
        h = digits.slice(0, 2);
        m = "";
      } else {
        h = digits.slice(0, 2);
        m = digits.slice(2, 4);
      }
    }

    // 마스킹 재구성
    let masked = h;
    if (h.length === 2 && (m.length > 0 || !isDeletion || inputVal.includes(':'))) {
      masked += ":" + m;
    }

    onChange(masked);

    if (h.length === 2 && m.length === 2 && onComplete && !isDeletion) {
      onComplete();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // XX: 상태에서 백스페이스를 누르면 콜론과 앞 숫자 하나를 동시에 지움 (마스킹 늪 탈출)
    if (e.key === 'Backspace' && value.length === 3 && value.endsWith(':')) {
      e.preventDefault();
      onChange(value.slice(0, -2)); // "00:" -> "0"
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`
        w-full text-center py-2 px-3 
        bg-white border rounded-lg 
        focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent 
        transition-all font-mono text-lg tracking-widest
        placeholder:text-slate-300
        ${className || "border-slate-200"}
      `}
      maxLength={5}
    />
  );
};

export default TimeInput;

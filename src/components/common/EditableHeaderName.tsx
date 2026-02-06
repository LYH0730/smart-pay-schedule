"use client";

import { useState, useEffect } from 'react';

export default function EditableHeaderName({ initialValue, onCommit }: { initialValue: string, onCommit: (newValue: string) => void }) {
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
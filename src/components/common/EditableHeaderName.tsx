"use client";

import { useState, useEffect } from 'react';

export default function EditableHeaderName({ initialName, onNameUpdate }: { initialName: string, onNameUpdate: (newName: string) => void }) {
  const [value, setValue] = useState(initialName);

  useEffect(() => {
    setValue(initialName);
  }, [initialName]);

  const handleBlur = () => {
    if (value && value.trim() !== initialName) {
      onNameUpdate(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setValue(initialName);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex items-center gap-2 group">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="bg-transparent text-lg font-black text-slate-700 outline-none border-b-2 border-transparent focus:border-orange-500 focus:bg-slate-50 transition-all w-auto min-w-[60px] max-w-[150px] p-1"
        placeholder="직원 이름..."
      />
      <span className="text-slate-400 text-sm opacity-50 group-hover:opacity-100 transition-opacity">✏️</span>
    </div>
  );
}
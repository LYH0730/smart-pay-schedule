"use client";

export default function EditableCell({ value, onUpdate, className = "" }: { value: string, onUpdate: (newValue: string) => void, className?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onUpdate(e.target.value)}
      className={`w-full bg-transparent p-1 rounded transition-all focus:bg-white focus:ring-2 focus:ring-orange-400 outline-none text-center font-medium text-[16px] ${className}`}
    />
  );
}
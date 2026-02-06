"use client";

import { useState } from 'react';

interface DevToolsProps {
  onGenerate: (scenario: 'under-15' | 'full-time' | 'random') => void;
}

export default function DevTools({ onGenerate }: DevToolsProps) {
  const [isDevMenuOpen, setIsDevMenuOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button 
        onClick={() => setIsDevMenuOpen(!isDevMenuOpen)}
        className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 flex items-center justify-center"
        title="개발자 도구 (Mock Data)"
      >
        <span className="text-2xl">🛠️</span>
      </button>
      
      {isDevMenuOpen && (
        <div className="absolute bottom-full right-0 mb-4 bg-white rounded-xl shadow-xl border border-slate-100 w-48 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-3 border-b border-slate-50 bg-slate-50">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Mock Generator</span>
          </div>
          <div className="p-1 space-y-1">
            <button 
              onClick={() => {
                onGenerate('under-15');
                setIsDevMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
            >
              1. 주휴 미달 (15h↓)
            </button>
            <button 
              onClick={() => {
                onGenerate('full-time');
                setIsDevMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
            >
              2. 풀타임 (40h↑)
            </button>
            <button 
              onClick={() => {
                onGenerate('random');
                setIsDevMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
            >
              3. 완전 랜덤 (Random)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
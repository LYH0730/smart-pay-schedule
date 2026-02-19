"use client";

import React from 'react';

interface ImageUploaderProps {
  useCompression: boolean;
  setUseCompression: (val: boolean) => void;
  isCompressing: boolean;
  isLoading: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filePreviews: string[];
  setModalImageSrc: (src: string) => void;
  setIsModalOpen: (val: boolean) => void;
  selectedFilesCount: number;
  onAnalyze: () => void;
  error: string | null;
}

export default function ImageUploader({
  useCompression,
  setUseCompression,
  isCompressing,
  isLoading,
  handleFileChange,
  filePreviews,
  setModalImageSrc,
  setIsModalOpen,
  selectedFilesCount,
  onAnalyze,
  error
}: ImageUploaderProps) {
  return (
    <section className="bg-white p-4 md:p-5 rounded-2xl shadow-xl border border-slate-100">
      <div className="flex flex-col gap-3 mb-5">
        <h2 className="text-lg font-bold">📸 근무표 업로드</h2>
        <label className="flex items-center justify-between p-2 bg-slate-50 rounded-xl cursor-pointer group" title={useCompression ? "이미지 용량을 줄여 전송 속도를 높입니다." : "이미지 원본 그대로 전송합니다."}>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
            {useCompression ? "빠른 전송 모드 (ON)" : "원본 전송 모드 (OFF)"}
          </span>
          <div className="relative">
            <input 
              type="checkbox" 
              checked={useCompression} 
              onChange={(e) => setUseCompression(e.target.checked)} 
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
          </div>
        </label>
      </div>
      <div className="relative">
        <input 
          type="file" 
          multiple 
          onChange={handleFileChange} 
          disabled={isCompressing || isLoading}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
        />
        {isCompressing && (
          <div className="absolute top-0 right-0 h-full flex items-center pr-4">
            <span className="text-sm font-bold text-orange-500 animate-pulse">이미지 최적화 중...</span>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 whitespace-pre-line leading-relaxed">
          {error}
        </div>
      )}
      {filePreviews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {filePreviews.map((src, index) => (
            <div key={index} className="relative w-full h-32 bg-slate-100 rounded-lg overflow-hidden cursor-pointer" onClick={() => { setModalImageSrc(src); setIsModalOpen(true); }}>
              <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
      <button 
        onClick={onAnalyze} 
        disabled={isLoading || isCompressing || selectedFilesCount === 0} 
        className="mt-6 w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 disabled:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            분석 중...
          </>
        ) : (
          "이미지 분석 시작"
        )}
      </button>
    </section>
  );
}
'use client'

import { useState, useRef, useEffect } from 'react'
import { updateShopName } from '@/app/actions/user'

interface ShopNameEditorProps {
  userId: string
  initialName: string
}

export default function ShopNameEditor({ userId, initialName }: ShopNameEditorProps) {
  const [name, setName] = useState(initialName || "나의 가게")
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 🌟 [추가] 부모 컴포넌트(DashboardClient)에서 DB 값을 가져오면 내부 상태도 업데이트
  useEffect(() => {
    setName(initialName || "나의 가게");
  }, [initialName]);

  const handleAutoSave = async () => {
    const currentName = inputRef.current?.value || ''
    
    // 1. 변화가 없으면 요청 안 함 (서버 자원 절약)
    if (currentName === initialName) return
    if (!currentName.trim()) {
      setName(initialName) // 빈 값 방지
      return
    }

    setIsSaving(true)
    try {
      const res = await updateShopName(userId, currentName)
      
      if (res.success) {
        console.log('가게 이름 자동 저장 성공')
        // 성공 시 별다른 UI 변경 없이 자연스럽게 유지
      } else {
        // 실패 시 에러 표시 후 롤백
        alert(res.error || '저장에 실패했습니다.')
        setName(initialName)
      }
    } catch (err) {
      console.error('Auto save error:', err)
      alert('네트워크 오류가 발생했습니다.')
      setName(initialName)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur() // 엔터 치면 포커스 해제 -> handleAutoSave 실행됨
    }
  }

  return (
    <div className="relative inline-block w-full max-w-[90vw]">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleAutoSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className={`
          text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight text-center 
          bg-transparent border-b-2 border-transparent 
          hover:border-slate-200 focus:border-orange-500 outline-none 
          transition-all duration-300 w-full cursor-pointer focus:cursor-text
          ${isSaving ? 'opacity-50 blur-[0.5px]' : 'opacity-100'}
        `}
        placeholder="가게 이름을 입력하세요"
      />
      
      {/* 저장 중 인디케이터 (선택 사항) */}
      {isSaving && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-orange-400 font-bold animate-pulse">
          저장 중...
        </span>
      )}
    </div>
  )
}

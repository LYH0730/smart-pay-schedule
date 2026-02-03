"use client";

import { useEffect, useState, useRef } from 'react';
import { WeeklyPayrollSummary } from '../types'; 
import { formatMinutesToHM } from '../lib/payroll-utils';
import CalculationBreakdown from './CalculationBreakdown';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PaySummaryProps {
  weeklySummaries: WeeklyPayrollSummary[];
  hourlyWage: number;
  employeeName: string;
}

export default function PaySummary({ weeklySummaries, hourlyWage, employeeName }: PaySummaryProps) {
  const [totalMonthlyPay, setTotalMonthlyPay] = useState(0);
  const [totalMonthlyMinutes, setTotalMonthlyMinutes] = useState(0); // This is total paid working minutes
  const [totalMonthlyWHA, setTotalMonthlyWHA] = useState(0);

  // New state for detailed monthly totals
  const [totalMonthlyActualWorkingMinutes, setTotalMonthlyActualWorkingMinutes] = useState(0);
  const [totalMonthlyWeeklyHolidayAllowanceMinutes, setTotalMonthlyWeeklyHolidayAllowanceMinutes] = useState(0);
  const [totalMonthlyPaidWorkingMinutes, setTotalMonthlyPaidWorkingMinutes] = useState(0);
  const [totalMonthlyUnpaidBreakMinutes, setTotalMonthlyUnpaidBreakMinutes] = useState(0);

  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (weeklySummaries.length > 0) {
      const totalPay = weeklySummaries.reduce((acc, summary) => acc + summary.totalWeeklyPay, 0);
      const totalMinutes = weeklySummaries.reduce((acc, summary) => acc + summary.totalMinutes, 0); // This is actual working minutes
      const totalWHA = weeklySummaries.reduce((acc, summary) => acc + summary.weeklyHolidayAllowance, 0);

      // Calculate new detailed monthly totals
      const totalActual = weeklySummaries.reduce((acc, summary) => acc + summary.actualWorkingMinutes, 0);
      const totalWHA_Minutes = weeklySummaries.reduce((acc, summary) => acc + summary.weeklyHolidayAllowanceMinutes, 0);
      const totalPaid = weeklySummaries.reduce((acc, summary) => acc + summary.paidWorkingMinutes, 0);
      const totalUnpaidBreak = weeklySummaries.reduce((acc, summary) => acc + summary.unpaidBreakMinutes, 0);

      setTotalMonthlyPay(totalPay);
      setTotalMonthlyMinutes(totalMinutes);
      setTotalMonthlyWHA(totalWHA);

      setTotalMonthlyActualWorkingMinutes(totalActual);
      setTotalMonthlyWeeklyHolidayAllowanceMinutes(totalWHA_Minutes);
      setTotalMonthlyPaidWorkingMinutes(totalPaid);
      setTotalMonthlyUnpaidBreakMinutes(totalUnpaidBreak);
    } else {
      setTotalMonthlyPay(0);
      setTotalMonthlyMinutes(0);
      setTotalMonthlyWHA(0);

      setTotalMonthlyActualWorkingMinutes(0);
      setTotalMonthlyWeeklyHolidayAllowanceMinutes(0);
      setTotalMonthlyPaidWorkingMinutes(0);
      setTotalMonthlyUnpaidBreakMinutes(0);
    }
  }, [weeklySummaries]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getFontAsBase64 = async (url: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // 일부 브라우저는 data:font/ttf;base64,... 헤더를 붙여주므로 제거
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    setIsDownloadMenuOpen(false);

    try {
      // 1. 폰트 로드 (Bold는 필요 시 추가 로드, 여기선 Regular 하나로 통일해도 무방하나 퀄리티를 위해 둘 다)
      const [regFont, boldFont] = await Promise.all([
        getFontAsBase64('/fonts/NanumGothic-Regular.ttf'),
        getFontAsBase64('/fonts/NanumGothic-Bold.ttf')
      ]);

      // 2. jsPDF 초기화
      const doc = new jsPDF();

      // 3. 폰트 등록 (VFS)
      doc.addFileToVFS('NanumGothic-Regular.ttf', regFont);
      doc.addFileToVFS('NanumGothic-Bold.ttf', boldFont);
      
      doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
      doc.addFont('NanumGothic-Bold.ttf', 'NanumGothic', 'bold');

      doc.setFont('NanumGothic'); // 기본 폰트 설정

      // 4. 데이터 준비
      const startDate = weeklySummaries[0]?.startDate || "";
      const endDate = weeklySummaries[weeklySummaries.length - 1]?.endDate || "";
      const withholdingTax = Math.floor(totalMonthlyPay * 0.033);
      const totalNetPay = totalMonthlyPay - withholdingTax;

      // 5. 헤더 그리기 (위치 미세 조정)
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0); // 검정
      doc.text('맘스터치 굽은다리역점', 105, 25, { align: 'center' }); // y: 20 -> 25

      doc.setFontSize(22); // 20 -> 22 (제목 좀 더 크게)
      doc.setFont('NanumGothic', 'bold');
      doc.text(`급여 명세서 (${employeeName} 님)`, 105, 38, { align: 'center' }); // y: 30 -> 38

      // 6. 테이블 그리기 (DOCX 100% 싱크로율 도전 - 정밀 튜닝)
      autoTable(doc, {
        startY: 50,
        tableWidth: 160, // 표 너비 160mm
        margin: { left: 25 }, // 중앙 정렬
        head: [['항목', '내용']],
        body: [
          ['직원명', employeeName],
          ['기간', `${startDate} ~ ${endDate}`],
          ['휴게시간', formatMinutesToHM(totalMonthlyUnpaidBreakMinutes)],
          ['실근무시간', formatMinutesToHM(totalMonthlyActualWorkingMinutes)],
          ['주휴수당 시간', formatMinutesToHM(totalMonthlyWeeklyHolidayAllowanceMinutes)],
          ['총 유급시간', formatMinutesToHM(totalMonthlyPaidWorkingMinutes)],
          ['시급', hourlyWage.toLocaleString() + '원'],
          ['총 지급액 (세전)', totalMonthlyPay.toLocaleString() + '원'],
          ['원천징수 3.3%', withholdingTax.toLocaleString() + '원'],
          ['실지급액', { content: totalNetPay.toLocaleString() + '원', styles: { fontStyle: 'bold' } }]
        ],
        theme: 'grid',
        styles: {
          font: 'NanumGothic',
          fontSize: 10.5, // 워드 기본 폰트 크기 (10.5pt)
          cellPadding: { top: 2, bottom: 2, left: 5, right: 5 }, // 상하 패딩은 줄이고 minCellHeight로 높이 조절
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.2, // 테두리 약간 두껍게 (워드 느낌)
          valign: 'middle', // 수직 중앙 정렬
          minCellHeight: 10, // 행 높이 최소 10mm (시원한 느낌)
        },
        headStyles: {
          fillColor: [224, 224, 224],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          minCellHeight: 12, // 헤더는 조금 더 높게
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold', halign: 'center' }, // 너비 40mm로 조정 (밸런스)
          1: { cellWidth: 'auto', halign: 'left' }
        },
      });

      // 7. 푸터 문구 삭제 (DOCX 원본 동일화)

      // 8. 저장
      doc.save(`급여명세서_${employeeName}_${startDate.substring(0, 7)}.pdf`);

    } catch (error) {
      console.error("PDF 생성 에러:", error);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePayslip = async () => {
    setIsGenerating(true);
    setIsDownloadMenuOpen(false);
    try {
      // 1. Load the template
      const response = await fetch('/payslip layout.docx');
      if (!response.ok) throw new Error("템플릿 파일을 찾을 수 없습니다.");
      const content = await response.arrayBuffer();

      // 2. Setup PizZip and Docxtemplater
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
      });

      // 3. Prepare data
      // employeeName은 props에서 직접 사용
      const startDate = weeklySummaries[0]?.startDate || "";
      const endDate = weeklySummaries[weeklySummaries.length - 1]?.endDate || "";
      
      const totalGrossPay = totalMonthlyPay;
      const withholdingTax = Math.floor(totalMonthlyPay * 0.033); // 3.3% tax
      const totalNetPay = totalMonthlyPay - withholdingTax;

      const data = {
        employeeName: employeeName,
        periodStartDate: startDate,
        periodEndDate: endDate,
        totalUnpaidBreakMinutes: formatMinutesToHM(totalMonthlyUnpaidBreakMinutes),
        totalActualWorkingMinutes: formatMinutesToHM(totalMonthlyActualWorkingMinutes),
        totalWeeklyHolidayAllowanceMinutes: formatMinutesToHM(totalMonthlyWeeklyHolidayAllowanceMinutes),
        totalPaidWorkingMinutes: formatMinutesToHM(totalMonthlyPaidWorkingMinutes),
        hourlyWage: hourlyWage.toLocaleString() + "원",
        totalGrossPay: totalGrossPay.toLocaleString() + "원",
        withholdingTax: withholdingTax.toLocaleString() + "원",
        totalNetPay: totalNetPay.toLocaleString() + "원",
      };

      // 4. Render the document
      doc.render(data);

      // 5. Generate and download
      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      saveAs(out, `급여명세서_${employeeName}_${startDate.substring(0, 7)}.docx`);

    } catch (error: any) {
      if (error.properties && error.properties.errors) {
        console.error("Template Errors:", error.properties.errors);
        const errorMessages = error.properties.errors.map((e: any) => e.message).join('\n');
        alert(`템플릿 오류가 발생했습니다:\n${errorMessages}`);
      } else {
        console.error("Error generating payslip:", error);
        alert("명세서 생성 중 오류가 발생했습니다.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 🧾 리포트 헤더 */}
      <div className="bg-slate-900 px-8 py-6 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            월별 급여 정산 리포트
            <span className="text-orange-400 font-medium text-lg">({employeeName} 님)</span>
          </h3>
          <p className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wider">Payroll Summary Report</p>
        </div>
        <div className="text-right flex items-center gap-3">
          {/* Download Dropdown */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
              disabled={isGenerating}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-lg shadow-orange-900/20"
            >
              {isGenerating ? (
                <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-1"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              명세서 다운로드
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isDownloadMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={generatePayslip}
                  className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-2"
                >
                  <span className="text-blue-500 text-sm">📄</span> Word (.docx)
                </button>
                <button 
                  onClick={generatePDF}
                  className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-2 border-t border-slate-50"
                >
                  <span className="text-red-500 text-sm">📕</span> PDF (.pdf)
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsBreakdownOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            수식 검증
          </button>
          <span className="inline-block bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase">최종 검증 완료</span>
        </div>
      </div>
      
      <div className="p-8">
        {/* 📅 주차별 상세 내역 (카드 그리드) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {weeklySummaries.map((weekSummary) => (
            <div key={weekSummary.weekNumber} className="group p-5 border border-slate-100 rounded-2xl bg-slate-50/30 hover:bg-white hover:shadow-xl hover:border-orange-100 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-slate-800 text-lg">{weekSummary.weekNumber}주차</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{weekSummary.startDate} - {weekSummary.endDate}</p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                  <span className="text-slate-400 text-[10px] font-black block leading-none">주간 요약</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm gap-4">
                  <span className="text-slate-500 font-medium whitespace-nowrap">실제 근무 시간</span>
                  <span className="font-bold text-slate-700 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-50 tabular-nums">
                    {formatMinutesToHM(weekSummary.actualWorkingMinutes)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm gap-4">
                  <span className="text-slate-500 font-medium whitespace-nowrap">주휴수당 발생 시간</span>
                  <span className="font-bold text-slate-700 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-50 tabular-nums">
                    {formatMinutesToHM(weekSummary.weeklyHolidayAllowanceMinutes)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm gap-4">
                  <span className="text-slate-500 font-medium whitespace-nowrap">유급 근무 시간 (총)</span>
                  <span className="font-bold text-slate-700 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-50 tabular-nums">
                    {formatMinutesToHM(weekSummary.paidWorkingMinutes)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm gap-4">
                  <span className="text-slate-500 font-medium whitespace-nowrap">무급 휴게 시간</span>
                  <span className="font-bold text-red-500 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-50 tabular-nums">
                    {formatMinutesToHM(weekSummary.unpaidBreakMinutes)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-400 uppercase whitespace-nowrap">주간 소계</span>
                  <span className="font-black text-slate-900 tabular-nums">
                    {weekSummary.totalWeeklyPay.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 💰 월별 최종 합계 (영수증 스타일 - 상세 내역) */}
        <div className="relative bg-slate-50 rounded-2xl p-8 border-2 border-slate-100 overflow-hidden">
          {/* 장식용 배경 요소 */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 좌측: 시간 요약 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 border-dashed gap-4">
                <span className="text-sm font-bold text-slate-500 italic whitespace-nowrap">실제 근무 시간</span>
                <span className="text-lg font-black text-slate-800 whitespace-nowrap tabular-nums">{formatMinutesToHM(totalMonthlyActualWorkingMinutes)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 border-dashed gap-4">
                <span className="text-sm font-bold text-slate-500 italic whitespace-nowrap">주휴수당 발생 시간</span>
                <span className="text-lg font-black text-slate-800 whitespace-nowrap tabular-nums">{formatMinutesToHM(totalMonthlyWeeklyHolidayAllowanceMinutes)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 border-dashed gap-4">
                <span className="text-sm font-bold text-slate-500 italic whitespace-nowrap">유급 근무 시간 (총)</span>
                <span className="text-lg font-black text-slate-800 whitespace-nowrap tabular-nums">{formatMinutesToHM(totalMonthlyPaidWorkingMinutes)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 border-dashed gap-4">
                <span className="text-sm font-bold text-slate-500 italic whitespace-nowrap">월간 주휴수당 합계</span>
                <span className="text-lg font-black text-orange-600 whitespace-nowrap tabular-nums">₩{totalMonthlyWHA.toLocaleString()}</span>
              </div>
            </div>

            {/* 우측: 금액 요약 (세전/세후) */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex justify-between items-center gap-4">
                <span className="text-sm font-bold text-slate-400 whitespace-nowrap">총 지급액 (세전)</span>
                <span className="text-xl font-bold text-slate-700 whitespace-nowrap tabular-nums">{totalMonthlyPay.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center text-red-500 gap-4">
                <span className="text-sm font-bold whitespace-nowrap">원천징수 (3.3%)</span>
                <span className="text-lg font-bold whitespace-nowrap tabular-nums">- {Math.floor(totalMonthlyPay * 0.033).toLocaleString()}원</span>
              </div>
              <div className="pt-4 mt-2 border-t-2 border-slate-100 flex justify-between items-end gap-4">
                <div>
                  <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 whitespace-nowrap">최종 예상 지급액</span>
                  <span className="text-sm font-bold text-slate-900 underline decoration-orange-500 decoration-2 underline-offset-4 whitespace-nowrap">실 수령액</span>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">
                    {(totalMonthlyPay - Math.floor(totalMonthlyPay * 0.033)).toLocaleString()}
                  </span>
                  <span className="text-sm font-black text-slate-400 ml-1">원</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer - Receipt style jagged edge decoration */}
      <div className="h-2 w-full bg-slate-900 opacity-10 flex gap-1 px-1">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="flex-1 bg-white h-1 mt-1 rounded-full"></div>
        ))}
      </div>

      <CalculationBreakdown 
        isOpen={isBreakdownOpen} 
        onClose={() => setIsBreakdownOpen(false)}
        weeklySummaries={weeklySummaries}
        hourlyWage={hourlyWage}
      />
    </div>
  );
}

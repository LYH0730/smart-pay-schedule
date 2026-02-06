"use client";

import { useEffect, useState, useRef } from 'react';
import { Shift, WeeklyPayrollSummary } from '../types'; 
import { formatMinutesToHM } from '../lib/payroll-utils';
import CalculationBreakdown from './CalculationBreakdown';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  TextRun, 
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  VerticalAlign
} from 'docx';

interface PaySummaryProps {
  weeklySummaries: WeeklyPayrollSummary[];
  hourlyWage: number;
  employeeName: string;
  allShifts: Shift[]; // 🌟 원본 근무 기록 (근무확인표용)
  year: number;       // 🌟 해당 년도
  month: number;      // 🌟 해당 월 (0-based)
  shopName: string;   // 🌟 가게 이름
}

export default function PaySummary({
  weeklySummaries, 
  hourlyWage, 
  employeeName,
  allShifts,
  year,
  month,
  shopName
}: PaySummaryProps) {
  const [totalMonthlyPay, setTotalMonthlyPay] = useState(0);
  const [totalMonthlyMinutes, setTotalMonthlyMinutes] = useState(0); 
  const [totalMonthlyWHA, setTotalMonthlyWHA] = useState(0);

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
      const totalMinutes = weeklySummaries.reduce((acc, summary) => acc + summary.totalMinutes, 0); 
      const totalWHA = weeklySummaries.reduce((acc, summary) => acc + summary.weeklyHolidayAllowance, 0);

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
      const [regFont, boldFont] = await Promise.all([
        getFontAsBase64('/fonts/NanumGothic-Regular.ttf'),
        getFontAsBase64('/fonts/NanumGothic-Bold.ttf')
      ]);

      const doc = new jsPDF();

      doc.addFileToVFS('NanumGothic-Regular.ttf', regFont);
      doc.addFileToVFS('NanumGothic-Bold.ttf', boldFont);
      
      doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
      doc.addFont('NanumGothic-Bold.ttf', 'NanumGothic', 'bold');

      doc.setFont('NanumGothic');

      // --- 1페이지: 급여 명세서 ---
      const startDate = weeklySummaries[0]?.startDate || "";
      const endDate = weeklySummaries[weeklySummaries.length - 1]?.endDate || "";
      const withholdingTax = Math.floor(totalMonthlyPay * 0.033);
      const totalNetPay = totalMonthlyPay - withholdingTax;

            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(shopName, 105, 25, { align: 'center' });
      
            doc.setFontSize(22);      doc.setFont('NanumGothic', 'bold');
      doc.text(`급여 명세서 (${employeeName} 님)`, 105, 38, { align: 'center' }); 

      autoTable(doc, {
        startY: 50,
        tableWidth: 160, 
        margin: { left: 25 }, 
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
          fontSize: 10.5, 
          cellPadding: { top: 2, bottom: 2, left: 5, right: 5 }, 
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.2, 
          valign: 'middle', 
          minCellHeight: 10, 
        },
        headStyles: {
          fillColor: [224, 224, 224],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          minCellHeight: 12, 
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold', halign: 'center' }, 
          1: { cellWidth: 'auto', halign: 'left' }
        },
      });

      // --- 2페이지: 근무 확인표 ---
      doc.addPage();
      
      // 2페이지 헤더
      doc.setFontSize(11);
      doc.setFont('NanumGothic', 'normal');
      doc.text(`${year}년 ${month + 1}월 근무 상세 내역`, 15, 20);

      doc.setFontSize(20);
      doc.setFont('NanumGothic', 'bold');
      doc.text('근무 확인표', 15, 30);

      doc.setFontSize(12);
      doc.setFont('NanumGothic', 'normal');
      doc.text(`성명: ${employeeName}`, 195, 30, { align: 'right' });

      // 달력 데이터 생성
      const firstDay = new Date(year, month, 1).getDay(); // 0(일) ~ 6(토)
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const calendarBody = [];
      let currentWeek: (string | object)[] = new Array(7).fill(""); 
      
      // 첫 주 빈칸 채우기
      for (let i = 0; i < firstDay; i++) {
        currentWeek[i] = "";
      }

      // 날짜 채우기
      for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeek = new Date(year, month, day).getDay();
        
        // 해당 날짜의 근무 기록 찾기
        const shifts = allShifts.filter(s => parseInt(s.day) === day)
          .sort((a, b) => (parseInt(a.start_hour) * 60 + parseInt(a.start_minute)) - (parseInt(b.start_hour) * 60 + parseInt(b.start_minute)));

        let cellContent = String(day);
        if (shifts.length > 0) {
          const timeStrings = shifts.map(s => `\n${s.start_hour}:${s.start_minute} ~ ${s.end_hour}:${s.end_minute}`);
          cellContent += timeStrings.join('');
        }

        currentWeek[dayOfWeek] = cellContent;

        // 토요일이거나 마지막 날이면 행 추가 후 초기화
        if (dayOfWeek === 6 || day === daysInMonth) {
          calendarBody.push(currentWeek);
          currentWeek = new Array(7).fill("");
        }
      }

      // 달력 그리기
      autoTable(doc, {
        startY: 40,
        head: [['일', '월', '화', '수', '목', '금', '토']],
        body: calendarBody,
        theme: 'grid',
        tableWidth: 175, // 7 columns * 25mm = 175mm
        margin: { left: 17.5 }, // (210 - 175) / 2 = 17.5mm (Center align)
        styles: {
          font: 'NanumGothic',
          fontSize: 10,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          valign: 'top', // 날짜가 상단에 오도록
          halign: 'left',
          minCellHeight: 25, // 달력 칸 높이 확보
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          minCellHeight: 10,
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
        },
        didParseCell: function(data) {
            if (data.section === 'head') {
                if (data.column.index === 0) data.cell.styles.textColor = [255, 0, 0]; 
                if (data.column.index === 6) data.cell.styles.textColor = [0, 0, 255]; 
            }
        }
      });

      doc.save(`급여명세서_${employeeName}_${startDate.substring(0, 7)}.pdf`);

    } catch (error) {
      console.error("PDF 생성 에러:", error);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDocx = async () => {
    setIsGenerating(true);
    setIsDownloadMenuOpen(false);
    try {
      const startDate = weeklySummaries[0]?.startDate || "";
      const endDate = weeklySummaries[weeklySummaries.length - 1]?.endDate || "";
      const withholdingTax = Math.floor(totalMonthlyPay * 0.033);
      const totalNetPay = totalMonthlyPay - withholdingTax;

      // --- 1. 급여 명세서 테이블 행 구성 ---
      const payslipRows = [
        ['직원명', employeeName],
        ['기간', `${startDate} ~ ${endDate}`],
        ['휴게시간', formatMinutesToHM(totalMonthlyUnpaidBreakMinutes)],
        ['실근무시간', formatMinutesToHM(totalMonthlyActualWorkingMinutes)],
        ['주휴수당 시간', formatMinutesToHM(totalMonthlyWeeklyHolidayAllowanceMinutes)],
        ['총 유급시간', formatMinutesToHM(totalMonthlyPaidWorkingMinutes)],
        ['시급', `${hourlyWage.toLocaleString()}원`],
        ['총 지급액 (세전)', `${totalMonthlyPay.toLocaleString()}원`],
        ['원천징수 3.3%', `${withholdingTax.toLocaleString()}원`],
        ['실지급액', `${totalNetPay.toLocaleString()}원`],
      ].map(([label, value]) => 
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4000, type: WidthType.DXA },
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(label), bold: true })], 
                alignment: AlignmentType.CENTER 
              })],
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: "E0E0E0" }, // 헤더 컬럼 배경색
            }),
            new TableCell({
              width: { size: 6000, type: WidthType.DXA },
              children: [new Paragraph({ 
                children: [new TextRun({ text: String(value), bold: label === '실지급액' })], 
                alignment: AlignmentType.LEFT 
              })],
              verticalAlign: VerticalAlign.CENTER,
            }),
          ],
          height: { value: 600, rule: "atLeast" } // 높이 확보
        })
      );

      // --- 2. 근무확인표 (달력) 데이터 준비 ---
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const calendarRows: TableRow[] = [];
      let currentWeekCells: TableCell[] = [];
      
      const CALENDAR_CELL_HEIGHT = 2500; // 🌟 1500 -> 2500 (약 4.4cm) 상향

      // 첫 주 빈칸
      for (let i = 0; i < firstDay; i++) {
        currentWeekCells.push(new TableCell({ 
          children: [], 
          width: { size: 100/7, type: WidthType.PERCENTAGE },
          height: { value: CALENDAR_CELL_HEIGHT, rule: "atLeast" }
        }));
      }

      // 날짜 채우기
      for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeek = new Date(year, month, day).getDay();
        const shifts = allShifts.filter(s => parseInt(s.day) === day)
          .sort((a, b) => (parseInt(a.start_hour) * 60 + parseInt(a.start_minute)) - (parseInt(b.start_hour) * 60 + parseInt(b.start_minute)));

        const cellChildren = [
          new Paragraph({ children: [new TextRun({ text: String(day), bold: true, size: 24 })] }) // 🌟 폰트 크기 상향
        ];

        if (shifts.length > 0) {
           shifts.forEach(s => {
             cellChildren.push(new Paragraph({
               text: `${s.start_hour}:${s.start_minute} ~ ${s.end_hour}:${s.end_minute}`,
             }));
           });
        }

        currentWeekCells.push(new TableCell({
          children: cellChildren,
          width: { size: 100/7, type: WidthType.PERCENTAGE }, 
          height: { value: CALENDAR_CELL_HEIGHT, rule: "atLeast" }, 
          verticalAlign: VerticalAlign.TOP,
        }));

        if (dayOfWeek === 6 || day === daysInMonth) {
          // 마지막 주 남은 빈칸 채우기
          while(currentWeekCells.length < 7) {
            currentWeekCells.push(new TableCell({ 
              children: [], 
              width: { size: 100/7, type: WidthType.PERCENTAGE },
              height: { value: CALENDAR_CELL_HEIGHT, rule: "atLeast" }
            }));
          }
          calendarRows.push(new TableRow({ children: currentWeekCells }));
          currentWeekCells = [];
        }
      }

      // --- 3. 문서 생성 ---
      const doc = new Document({
        sections: [
          {
            properties: {}, 
            children: [
              // Page 1: 명세서
              new Paragraph({
                text: shopName,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ text: "" }), 
              new Paragraph({
                children: [new TextRun({ text: `급여 명세서 (${employeeName} 님)`, bold: true, size: 44 })], 
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
              }),
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ text: "항목", alignment: AlignmentType.CENTER })], width: { size: 4000, type: WidthType.DXA }, shading: { fill: "C0C0C0" } }),
                      new TableCell({ children: [new Paragraph({ text: "내용", alignment: AlignmentType.CENTER })], width: { size: 6000, type: WidthType.DXA }, shading: { fill: "C0C0C0" } }),
                    ]
                  }),
                  ...payslipRows
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ 
                children: [], 
                pageBreakBefore: true 
              }),

              // Page 2: 근무확인표
              new Paragraph({
                text: `${year}년 ${month + 1}월 근무 상세 내역`,
                spacing: { before: 400 }
              }),
              new Paragraph({
                children: [new TextRun({ text: "근무 확인표", bold: true, size: 40 })], 
                spacing: { after: 200 }
              }),
              new Paragraph({
                text: `성명: ${employeeName}`,
                alignment: AlignmentType.RIGHT,
                spacing: { after: 200 }
              }),
              new Table({
                rows: [
                  new TableRow({
                    children: ['일', '월', '화', '수', '목', '금', '토'].map((d, i) => new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ 
                          text: d, 
                          bold: true,
                          color: i === 0 ? "FF0000" : i === 6 ? "0000FF" : "000000"
                        })], 
                        alignment: AlignmentType.CENTER 
                      })],
                      width: { size: 100/7, type: WidthType.PERCENTAGE },
                      shading: { fill: "F0F0F0" }
                    }))
                  }),
                  ...calendarRows
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `급여명세서_${employeeName}_${startDate.substring(0, 7)}.docx`);

    } catch (error: any) {
      console.error("Error generating payslip:", error);
      alert("명세서 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 🧾 리포트 헤더 */}
      <div className="bg-slate-900 px-6 md:px-8 py-5 md:py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="whitespace-nowrap">
          <h3 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center flex-wrap gap-x-2">
            <span className="shrink-0">월별 급여 정산 리포트</span>
            <span className="text-orange-400 font-medium text-base md:text-lg shrink-0">({employeeName} 님)</span>
          </h3>
          <p className="text-slate-400 text-[10px] mt-1 font-medium uppercase tracking-wider">Payroll Summary Report</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
              disabled={isGenerating}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-lg shadow-orange-900/20 whitespace-nowrap"
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
              <div className="absolute top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={generatePDF}
                  className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <span className="text-red-500 text-sm">📕</span> PDF (.pdf)
                </button>
                <button 
                  onClick={generateDocx}
                  className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-2 border-t border-slate-50 whitespace-nowrap"
                >
                  <span className="text-blue-500 text-sm">📄</span> Word (.docx)
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsBreakdownOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            수식 검증
          </button>
          <span className="inline-block bg-orange-500 text-white text-[10px] font-black px-2 py-1.5 rounded-md uppercase whitespace-nowrap">최종 검증 완료</span>
        </div>
      </div>
      
      <div className="p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {weeklySummaries.map((weekSummary) => (
            <div key={weekSummary.weekNumber} className="group p-4 border border-slate-100 rounded-2xl bg-slate-50/30 hover:bg-white hover:shadow-xl hover:border-orange-100 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-slate-800 text-base">{weekSummary.weekNumber}주차</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{weekSummary.startDate} - {weekSummary.endDate}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-slate-500 font-medium whitespace-nowrap">실근무</span>
                  <span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-50 tabular-nums">
                    {formatMinutesToHM(weekSummary.actualWorkingMinutes)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-slate-500 font-medium whitespace-nowrap">주휴발생</span>
                  <span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-50 tabular-nums">
                    {formatMinutesToHM(weekSummary.weeklyHolidayAllowanceMinutes)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-slate-500 font-medium whitespace-nowrap">유급총합</span>
                  <span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-50 tabular-nums">
                    {formatMinutesToHM(weekSummary.paidWorkingMinutes)}
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">소계</span>
                  <span className="font-black text-slate-900 text-sm tabular-nums">
                    {weekSummary.totalWeeklyPay.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative bg-slate-50 rounded-2xl p-4 md:p-8 border-2 border-slate-100 overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 border-dashed gap-4">
                <span className="text-xs font-bold text-slate-500 italic whitespace-nowrap">실제 근무</span>
                <span className="text-base font-black text-slate-800 whitespace-nowrap tabular-nums">{formatMinutesToHM(totalMonthlyActualWorkingMinutes)}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 border-dashed gap-4">
                <span className="text-xs font-bold text-slate-500 italic whitespace-nowrap">주휴 시간</span>
                <span className="text-base font-black text-slate-800 whitespace-nowrap tabular-nums">{formatMinutesToHM(totalMonthlyWeeklyHolidayAllowanceMinutes)}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 border-dashed gap-4">
                <span className="text-xs font-bold text-slate-500 italic whitespace-nowrap">유급 총합</span>
                <span className="text-base font-black text-slate-800 whitespace-nowrap tabular-nums">{formatMinutesToHM(totalMonthlyPaidWorkingMinutes)}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 border-dashed gap-4">
                <span className="text-xs font-bold text-slate-500 italic whitespace-nowrap">주휴수당</span>
                <span className="text-base font-black text-orange-600 whitespace-nowrap tabular-nums">₩{totalMonthlyWHA.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center gap-4">
                <span className="text-xs font-bold text-slate-400 whitespace-nowrap">지급액(세전)</span>
                <span className="text-lg font-bold text-slate-700 whitespace-nowrap tabular-nums">{totalMonthlyPay.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center text-red-500 gap-4">
                <span className="text-xs font-bold whitespace-nowrap">공제(3.3%)</span>
                <span className="text-base font-bold whitespace-nowrap tabular-nums">- {Math.floor(totalMonthlyPay * 0.033).toLocaleString()}원</span>
              </div>
              <div className="pt-3 mt-2 border-t-2 border-slate-100 flex justify-between items-end gap-2">
                <div className="min-w-0">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tight mb-0.5 whitespace-nowrap">최종 실 수령액</span>
                  <span className="text-xs font-bold text-slate-900 underline decoration-orange-500 decoration-1 underline-offset-4 whitespace-nowrap">NET PAY</span>
                </div>
                <div className="text-right whitespace-nowrap shrink-0">
                  <span className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">
                    {(totalMonthlyPay - Math.floor(totalMonthlyPay * 0.033)).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 ml-0.5">원</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
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
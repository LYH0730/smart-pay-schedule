'use server'

import { Shift, WeeklyPayrollSummary } from '@/types'; // 경로 확인 필요

// 내부 계산용 헬퍼 함수 (서버 내부에서만 사용)
function calculateShiftDurationMinutes(shift: Shift): number {
  const sh = parseInt(shift.start_hour || '0');
  const sm = parseInt(shift.start_minute || '0');
  const eh = parseInt(shift.end_hour || '0');
  const em = parseInt(shift.end_minute || '0');

  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  
  if (endMins < startMins) endMins += 24 * 60;
  
  const diff = endMins - startMins - (shift.break_minutes || 0);
  return isNaN(diff) || diff < 0 ? 0 : diff;
}

// 🌟 [서버 액션] 월별 급여 정산 함수 (브라우저에서 호출 가능하지만 실행은 서버에서 됨)
export async function calculatePayrollServer(allShifts: Shift[], hourlyWage: number, year: number, month: number) {
  // [보안] 시급 변조 방어 로직 (프론트에서 100만원으로 조작해서 보내도 여기서 차단)
  const MINIMUM_WAGE = 10030; // 2025년 최저시급 (필요 시 수정)
  if (hourlyWage < MINIMUM_WAGE) {
    return { 
      success: false, 
      error: `최저시급(${MINIMUM_WAGE}원)보다 낮은 금액으로 계산할 수 없습니다.` 
    };
  }

  try {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const summaries: WeeklyPayrollSummary[] = [];
    
    let weekNum = 1;
    let weekStart = 1;
    let currentWeekActualWorkingMinutes = 0;
    let currentWeekUnpaidBreakMinutes = 0;

    for (let day = 1; day <= lastDay; day++) {
      const currentDay = new Date(year, month, day);
      const dayShifts = allShifts.filter(s => parseInt(s.day) === day);
      
      dayShifts.forEach(s => {
        const shiftDuration = calculateShiftDurationMinutes(s);
        currentWeekActualWorkingMinutes += shiftDuration;

        if (s.break_minutes > 0 && !s.is_paid_break) {
          currentWeekUnpaidBreakMinutes += s.break_minutes;
        }
      });

      if (currentDay.getDay() === 6 || day === lastDay) {
        let weeklyHolidayAllowanceMinutes = 0;
        if (currentWeekActualWorkingMinutes >= 900) {
          weeklyHolidayAllowanceMinutes = Math.floor((currentWeekActualWorkingMinutes / (40 * 60)) * (8 * 60));
          weeklyHolidayAllowanceMinutes = Math.min(weeklyHolidayAllowanceMinutes, 480);
        }

        const totalPaidMinutes = currentWeekActualWorkingMinutes + weeklyHolidayAllowanceMinutes;
        const basePay = (currentWeekActualWorkingMinutes / 60) * hourlyWage;
        const whaPay = (weeklyHolidayAllowanceMinutes / 60) * hourlyWage;
        const formattedMonth = String(month + 1).padStart(2, '0');
        
        summaries.push({
          weekNumber: weekNum++,
          startDate: `${year}-${formattedMonth}-${String(weekStart).padStart(2, '0')}`,
          endDate: `${year}-${formattedMonth}-${String(day).padStart(2, '0')}`,
          totalMinutes: currentWeekActualWorkingMinutes,
          basePay: Math.round(basePay),
          weeklyHolidayAllowance: Math.round(whaPay),
          totalWeeklyPay: Math.round(basePay + whaPay),
          actualWorkingMinutes: currentWeekActualWorkingMinutes,
          unpaidBreakMinutes: currentWeekUnpaidBreakMinutes,
          weeklyHolidayAllowanceMinutes: weeklyHolidayAllowanceMinutes,
          paidWorkingMinutes: totalPaidMinutes,
        });

        weekStart = day + 1;
        currentWeekActualWorkingMinutes = 0;
        currentWeekUnpaidBreakMinutes = 0;
      }
    }

    // 서버에서 최종 합산 금액까지 계산해서 내려줌 (프론트엔드 연산 최소화)
    const grandTotalPay = summaries.reduce((sum, w) => sum + w.totalWeeklyPay, 0);

    return { 
      success: true, 
      data: {
        summaries,
        grandTotalPay
      } 
    };

  } catch (error) {
    console.error("서버 급여 계산 오류:", error);
    return { success: false, error: "급여 계산 중 서버 오류가 발생했습니다." };
  }
}
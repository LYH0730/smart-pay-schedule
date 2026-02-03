import { Shift, WeeklyPayrollSummary } from '../types';

/**
 * 분 단위를 "X시간 Y분" 또는 "X시간" 형태의 문자열로 변환합니다.
 */
export function formatMinutesToHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

/**
 * 🌟 [수정] 사용자가 직접 설정한 변수에 따라 자동 휴게 시간을 산출합니다.
 * @param startH 시작 시
 * @param startM 시작 분
 * @param endH 종료 시
 * @param endM 종료 분
 * @param threshold 기준 시간 (분 단위, 예: 480분)
 * @param deduction 차감할 시간 (분 단위, 예: 60분)
 */
export function getAutoBreakMinutes(
  startH: string, 
  startM: string, 
  endH: string, 
  endM: string, 
  threshold: number, 
  deduction: number
): number {
  // 기준 시간이 0이면 정책을 적용하지 않는 것으로 간주합니다.
  if (threshold <= 0) return 0;
  
  const s = parseInt(startH || '0') * 60 + parseInt(startM || '0');
  let e = parseInt(endH || '0') * 60 + parseInt(endM || '0');
  
  // 익일 퇴근 처리
  if (e < s) e += 24 * 60;
  
  const duration = e - s;

  // 🌟 사용자가 설정한 기준(threshold) 이상 근무 시 설정한 시간(deduction)을 반환합니다.
  if (duration >= threshold) {
    return deduction;
  }
  
  return 0;
}

/**
 * 단일 근무 기록의 순수 근무 시간(분)을 정수로 계산합니다.
 */
export function calculateShiftDurationMinutes(shift: Shift): number {
  const sh = parseInt(shift.start_hour || '0');
  const sm = parseInt(shift.start_minute || '0');
  const eh = parseInt(shift.end_hour || '0');
  const em = parseInt(shift.end_minute || '0');

  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  
  if (endMins < startMins) endMins += 24 * 60;
  
  // 총 체류 시간에서 '무급 휴게 시간'을 차감합니다.
  const diff = endMins - startMins - (shift.break_minutes || 0);
  return isNaN(diff) || diff < 0 ? 0 : diff;
}

/**
 * 월별 급여 정산 함수
 */
export function calculateMonthlyPayroll(allShifts: Shift[], hourlyWage: number, year: number, month: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const summaries: WeeklyPayrollSummary[] = [];
  
  let weekNum = 1;
  let weekStart = 1;
  
  let currentWeekActualWorkingMinutes = 0; // New: Actual working minutes for the current week
  let currentWeekUnpaidBreakMinutes = 0;   // New: Unpaid break minutes for the current week

  for (let day = 1; day <= lastDay; day++) {
    const currentDay = new Date(year, month, day);
    
    const dayShifts = allShifts.filter(s => parseInt(s.day) === day);
    dayShifts.forEach(s => {
      const shiftDuration = calculateShiftDurationMinutes(s); // This already excludes break_minutes
      currentWeekActualWorkingMinutes += shiftDuration;

      // Accumulate unpaid break minutes
      if (s.break_minutes > 0 && !s.is_paid_break) {
        currentWeekUnpaidBreakMinutes += s.break_minutes;
      }
    });

    // Check if it's Saturday (getDay() === 6) or the last day of the month
    if (currentDay.getDay() === 6 || day === lastDay) {
      // Calculate Weekly Holiday Allowance Minutes
      // Eligibility: at least 15 hours (900 minutes) worked in the week
      // Calculation: (actual_working_hours_in_week / 40) * 8 hours, if eligible
      let weeklyHolidayAllowanceMinutes = 0;
      if (currentWeekActualWorkingMinutes >= 900) { // 15 hours * 60 minutes/hour = 900 minutes
        // Assuming 40 hours is full-time for 8 hours allowance
        // (currentWeekActualWorkingMinutes / (40 * 60)) * (8 * 60)
        // Simplified: (currentWeekActualWorkingMinutes / 40) * 8
        weeklyHolidayAllowanceMinutes = Math.floor((currentWeekActualWorkingMinutes / (40 * 60)) * (8 * 60));
        // Ensure it doesn't exceed 8 hours (480 minutes) for a standard week
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
        totalMinutes: currentWeekActualWorkingMinutes, // This was previously totalMinutes, now it's actual working minutes
        basePay: Math.round(basePay),
        weeklyHolidayAllowance: Math.round(whaPay),
        totalWeeklyPay: Math.round(basePay + whaPay),
        
        // New fields
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
  return summaries;
}
export interface Employee {
  id: string;
  name: string;
  hourly_wage: number;
}

/**
 * 근무 기록 인터페이스
 * 휴게시간의 전역 설정과 개별 예외 허용을 위해 is_break_manual 필드를 추가했습니다.
 */
export interface Shift {
  id: string;
  employee_id?: string; 
  name: string;         // AI가 추출한 사원 이름
  day: string;          // AI가 추출한 '일' (예: "01", "15")
  date: string;         // selectedYear, selectedMonth와 결합된 날짜 (YYYY-MM-DD)
  start_hour: string;   // 시작 시 (예: "09")
  start_minute: string; // 시작 분 (예: "30")
  end_hour: string;     // 종료 시 (예: "14")
  end_minute: string;   // 종료 분 (예: "00")
  break_minutes: number; // 실제 차감될 휴게 시간 (분 단위 정수)
  
  // 🌟 [추가] 휴게시간을 사용자가 직접 수정했는지 여부
  // true이면 전역 정책(예: 8시간 시 1시간 차감)이 바뀌어도 이 값은 유지됩니다.
  is_break_manual?: boolean; 
  
  is_paid_break: boolean;
}

export interface Payroll {
  employee_id: string;
  month: string;
  total_hours: number;
  weekly_allowance: number;
  final_amount: number;
}

/**
 * 주차별 급여 요약 인터페이스
 * 모든 시간 연산은 오차 방지를 위해 totalMinutes(정수)를 사용합니다.
 */
export interface WeeklyPayrollSummary {
  weekNumber: number;
  startDate: string;    // 주차 시작일
  endDate: string;      // 주차 종료일
  totalMinutes: number; // 해당 주차 총 근무 시간 (분 단위 정수)
  basePay: number;      // 기본급 (시간 * 시급)
  weeklyHolidayAllowance: number; // 주휴수당
  totalWeeklyPay: number;         // 주간 총 합계

  // New fields for enhanced report
  actualWorkingMinutes: number; // 실제 근무 시간 (휴게시간 제외)
  unpaidBreakMinutes: number;   // 무급 휴게 시간
  weeklyHolidayAllowanceMinutes: number; // 주휴수당 발생 시간
  paidWorkingMinutes: number;   // 유급 근무 시간 (실제 근무 + 주휴수당 시간)
}
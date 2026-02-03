import { Shift } from '../types';

type Scenario = 'under-15' | 'full-time' | 'random';

/**
 * 지정된 범위 내의 랜덤 정수를 반환합니다. (min, max 포함)
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 시간을 'HH' 문자열 포맷으로 변환합니다.
 */
function formatTime(num: number): string {
  return num.toString().padStart(2, '0');
}

/**
 * 시나리오에 따른 가상 근무 데이터를 생성합니다.
 */
export function generateMockShifts(year: number, month: number, scenario: Scenario): Shift[] {
  const shifts: Shift[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  const employeeName = "테스트사원";

  // 월의 모든 날짜를 순회
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay(); // 0:일, 1:월, ... 6:토

    let shouldWork = false;
    let startH = 9;
    let workDuration = 0; // 시간 단위

    // 🎲 시나리오별 로직 분기
    if (scenario === 'under-15') {
      // 주 15시간 미만: 주말(토,일)만 근무, 하루 4~5시간
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        shouldWork = true;
        startH = getRandomInt(10, 14); // 10시~14시 출근
        workDuration = getRandomInt(4, 5); 
      }
    } else if (scenario === 'full-time') {
      // 풀타임: 평일(월~금) 근무, 하루 9시간 (휴게 포함 체류시간)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        shouldWork = true;
        startH = getRandomInt(8, 9); // 8시~9시 출근
        workDuration = 9;
      }
    } else if (scenario === 'random') {
      // 완전 랜덤: 50% 확률로 근무, 3~10시간
      if (Math.random() > 0.4) {
        shouldWork = true;
        startH = getRandomInt(8, 18);
        workDuration = getRandomInt(3, 10);
      }
    }

    if (shouldWork) {
      const startM = getRandomInt(0, 59); // 0분 ~ 59분 사이 완전 랜덤
      const workDurationMinutes = (workDuration * 60) + getRandomInt(-15, 45); // 정해진 시간 근처에서 ±분 단위 변동
      const endTotalMinutes = (startH * 60) + startM + workDurationMinutes;
      
      let endH = Math.floor(endTotalMinutes / 60);
      const endM = endTotalMinutes % 60;
      
      // 24시 넘어가면 날짜 처리 등 복잡해지므로 테스트용은 당일 퇴근으로 제한 (필요시 수정 가능)
      if (endH >= 24) endH = 23; 

      shifts.push({
        id: `mock-${day}-${Math.random()}`,
        name: employeeName,
        day: formatTime(day),
        date: `${year}-${formatTime(month + 1)}-${formatTime(day)}`,
        start_hour: formatTime(startH),
        start_minute: formatTime(startM),
        end_hour: formatTime(endH),
        end_minute: formatTime(endM),
        break_minutes: 0, // 나중에 자동 계산 로직에 의해 덮어씌워짐 (또는 여기서 계산 가능)
        is_break_manual: false,
        is_paid_break: false
      });
    }
  }

  return shifts;
}
## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 DashboardClientProps 인터페이스에 `onAnalyzedMonthYearChange` 추가
- **원인**: `src/app/dashboard/page.tsx`에서 `DashboardClient` 컴포넌트에 `onAnalyzedMonthYearChange` prop을 전달하려 했으나, `src/components/DashboardClient.tsx`의 `DashboardClientProps` 인터페이스에 해당 prop이 정의되어 있지 않아 타입 오류 발생.
- **문제점**: 타입스크립트 컴파일러가 `onAnalyzedMonthYearChange` prop의 부재를 감지하여 빌드 실패.
- **해결 방법**: `src/components/DashboardClient.tsx` 파일의 `DashboardClientProps` 인터페이스에 `onAnalyzedMonthYearChange: ({ year, month }: { year: number; month: number; }) => void;`를 추가하여 타입 정의를 일치시킴.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 AI 응답 JSON 파싱 로직 개선
- **원인**: AI 응답이 불완전하거나 형식이 잘못된 JSON 문자열을 반환할 경우, 기존 정규식 기반의 JSON 추출 로직이 실패하여 `Parsed shifts`가 빈 배열로 처리되는 문제 발생. 특히 AI 응답이 중간에 잘리는 경우 닫는 대괄호(`]`)가 없어 파싱 오류로 이어짐.
- **문제점**: AI가 유효한 근무표 데이터를 포함한 응답을 보냈음에도 불구하고, 파싱 단계에서 오류가 발생하여 사용자에게 빈 결과가 표시됨. 이는 사용자 경험을 저해하고, AI 분석 기능의 신뢰도를 떨어뜨림.
- **해결 방법**: `smart-pay-schedule/src/app/api/analyze/route.ts` 파일의 JSON 추출 로직을 개선.
    - AI 응답 텍스트에서 첫 번째 `[`와 마지막 `]`의 인덱스를 명시적으로 찾아 JSON 문자열의 경계를 정의.
    - 만약 `[`는 존재하지만 `]`가 없는 경우 (즉, JSON이 불완전하게 잘린 경우), 경고를 로깅하고 `jsonString`을 빈 배열(`"[]"`)로 폴백 처리하여 `JSON.parse()` 오류를 방지.
    - `JSON.parse()` 호출을 `try-catch` 블록으로 감싸서 파싱 과정에서 발생할 수 있는 모든 오류를 안전하게 처리하고, 오류 발생 시 상세 로그를 남기도록 함.
    - 이로써 AI 응답이 불완전하거나 형식이 잘못된 경우에도 애플리케이션이 안정적으로 동작하며, `Parsed shifts`가 빈 배열로 반환되는 현상을 줄임.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 DashboardClient.tsx Shift 타입 불일치 오류 수정
- **원인**: `DashboardClient.tsx`의 `handleAnalyzeAll` 함수에서 `analyzedShifts`를 `shiftsWithIds`로 매핑할 때, `Shift` 인터페이스에 새로 추가된 `day` 속성이 누락되어 `Property 'day' is missing in type '{ ... }' but required in type 'Shift'.ts(2322)` 오류 발생.
- **문제점**: `Shift` 타입 정의가 업데이트되었음에도 불구하고, 객체 생성 시 필수 속성인 `day`가 포함되지 않아 타입 검사 오류가 발생하고 컴파일이 실패함.
- **해결 방법**: `src/components/DashboardClient.tsx` 파일의 `handleAnalyzeAll` 함수 내 `shiftsWithIds` 매핑 로직에 `day: s.day,`를 추가하여 `Shift` 인터페이스의 모든 필수 속성을 충족시키도록 수정.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 타입 정의 오류 수정 (WeeklyPayrollSummary 및 Shift 인터페이스)
- **원인**:
    1. `DashboardClient.tsx`에서 `WeeklyPayrollSummary`를 임포트하려 했으나, `src/types/index.ts`에 정의되어 있지 않아 `Module '"../types"' has no exported member 'WeeklyPayrollSummary'.ts(2305)` 오류 발생. `WeeklyPayrollSummary`는 `src/lib/payroll-utils.ts`에 정의되어 있었으나 전역적으로 사용 가능하도록 내보내지지 않았음.
    2. `DashboardClient.tsx`에서 AI 분석 결과로 받은 `day` 속성을 `Shift` 타입의 객체에 할당하려 했으나, `Shift` 인터페이스에 `day` 속성이 없어 `Property 'day' does not exist on type 'Shift'.ts(2339)` 오류 발생.
- **문제점**: 타입 정의 불일치로 인해 컴파일 오류가 발생하고, 애플리케이션의 타입 안정성이 저해됨.
- **해결 방법**:
    1. **`src/types/index.ts` 수정**:
        - `Shift` 인터페이스에 `day: string;` 속성을 추가하여 AI 분석 결과의 `day` 데이터를 올바르게 처리할 수 있도록 함.
        - `src/lib/payroll-utils.ts`에 정의되어 있던 `WeeklyPayrollSummary` 인터페이스를 `src/types/index.ts`로 이동시키고 `export`하여 전역적으로 사용 가능하도록 함.
    2. **`src/lib/payroll-utils.ts` 수정**:
        - `WeeklyPayrollSummary` 인터페이스 정의를 제거하고, `src/types`에서 `WeeklyPayrollSummary`를 임포트하도록 수정.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 AI 분석 프롬프트 간소화, 동적 날짜 결합 및 수동 주차 계산 로직 구현
- **원인**:
    1. AI 분석 시 '월' 정보를 추측하지 않게 하고, 오직 이름, 일(Day), 시간만 가져오도록 프롬프트를 간소화할 필요가 있었음.
    2. 드롭다운을 바꿔도 테이블이 사라지지 않게 하려면, `shifts` 상태에 '일(day)'만 저장하고 출력할 때 현재 선택된 연도/월을 붙여줘야 했음.
    3. 2025년 12월 1일~6일이 1주차가 되도록 하는 '수동 주차 계산' 로직이 필요했으며, `date-fns` 대신 직접 날짜를 순회하며 토요일을 체크하는 방식이 요구됨.
- **문제점**:
    1. AI가 불필요한 '월' 정보를 추론하여 데이터 처리의 복잡성을 증가시키고 잠재적인 오류를 유발할 수 있었음.
    2. `DashboardClient.tsx`에서 연도/월 필터링으로 인해 드롭다운 변경 시 데이터가 사라지는 문제가 발생.
    3. 기존 주차 계산 로직이 특정 시나리오(예: 2025년 12월 첫째 주)에서 정확하지 않아 급여 계산의 신뢰성을 저해.
- **해결 방법**:
    1. **`src/app/api/analyze/route.ts` 수정**:
        - AI 프롬프트에서 '월' 정보를 제외하고 이름, 일, 시간만 추출하도록 간소화.
        - 서버에서는 연도/월을 합치지 않고 원본 데이터(`day`)만 보내도록 수정.
    2. **`src/components/DashboardClient.tsx` 수정**:
        - `displayedShifts` `useMemo`를 사용하여 `shifts` 데이터에 `selectedYear`와 `selectedMonth`를 합쳐 `YYYY-MM-DD` 형식의 `date` 문자열을 생성하도록 변경 (필터링 대신 변환).
        - `groupedData` `useMemo`를 사용하여 `displayedShifts`를 직원 이름별로 그룹화하도록 구현.
        - UI 렌더링 부분을 `groupedData`를 기반으로 각 직원 이름 아래에 근무 기록 테이블을 표시하도록 업데이트.
    3. **`src/lib/payroll-utils.ts` 수정**:
        - `calculateMonthlyPayroll` 함수를 수동 주차 계산 로직으로 전면 교체.
        - 월의 첫째 날부터 마지막 날까지 순회하며 `currentDay.getDay() === 6` (토요일) 또는 `day === lastDay` 조건을 사용하여 주차를 마감.
        - 각 주차의 `totalHours`, `weeklyHolidayAllowance`, `totalWeeklyPay`, `basePay`를 정확하게 계산.
        - 하루에 여러 번 근무한 경우(`split shift`)도 `dayShifts.forEach`를 통해 해당 주차의 근무 시간에 모두 합산되도록 처리.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 월 선택 드롭다운 추가 및 AI 분석 결과에 따른 자동 업데이트 기능 구현
- **원인**:
    1. 이전 수정에도 불구하고 급여 계산 시 월의 시작 날짜가 여전히 잘못 표시되는 문제(예: 2025년 12월 데이터 입력 시 1주차 시작일이 11월 30일로 표시)가 지속됨. 이는 `calculateMonthlyPayroll` 함수에 전달되는 `targetMonth`가 여전히 잘못 추론되고 있었기 때문.
    2. 사용자가 급여 계산을 원하는 특정 월을 직접 선택할 수 있는 UI가 부재.
    3. AI 분석 결과에 따라 UI의 연도 및 월 선택 드롭다운이 자동으로 업데이트되어 사용 편의성을 높일 필요가 있음.
- **문제점**:
    1. 사용자가 의도한 월에 대한 정확한 급여 계산이 어려움.
    2. 수동으로 월을 변경해야 하는 번거로움.
- **해결 방법**:
    1. **`DashboardPage`에 월 선택 드롭다운 추가**:
        - `smart-pay-schedule/src/app/dashboard/page.tsx` 파일에 `selectedMonth` 상태와 `isMonthManuallySet` 상태를 추가.
        - 연도 선택 드롭다운과 유사하게 월 선택 드롭다운 UI 요소를 추가하고, `handleMonthChange` 함수를 통해 `selectedMonth` 상태를 업데이트하고 `isMonthManuallySet`을 `true`로 설정.
        - `DashboardClient` 컴포넌트에 `selectedMonth` prop을 전달하도록 수정.
        2. **AI 분석 결과에 따른 연도/월 자동 업데이트**:
        - `DashboardClient` 컴포넌트에 `onAnalyzedMonthYearChange` prop(콜백 함수)을 추가하고, `DashboardPage`에서 이 콜백을 구현하여 `selectedYear`와 `selectedMonth` 상태를 업데이트하도록 함. 이때 `isMonthManuallySet`은 `false`로 재설정.
        - `smart-pay-schedule/src/components/DashboardClient.tsx` 파일의 `handleAnalyzeAll` 함수 내에서 이미지 분석이 성공적으로 완료된 후, `shiftsWithIds` 배열의 첫 번째 근무 기록 날짜를 기준으로 연도와 월을 추출하여 `onAnalyzedMonthYearChange` 콜백을 호출하도록 수정.
    3. **`calculateMonthlyPayroll` 호출 시 `selectedMonth` 직접 사용**:
        - `smart-pay-schedule/src/components/DashboardClient.tsx` 파일의 `handleCalculatePay` 함수에서 `calculateMonthlyPayroll`을 호출할 때, 더 이상 `shifts[0].date`에서 월을 추론하지 않고 `selectedMonth` prop을 직접 전달하도록 수정.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 `calculateMonthlyPayroll` 함수에 대상 월/연도 매개변수 추가 및 사용
- **원인**: `calculateMonthlyPayroll` 함수가 급여 계산을 위한 월과 연도를 `allShifts` 배열의 가장 이른 근무 기록에서 추론하여, 사용자가 UI에서 선택한 연도와 실제 계산되는 월이 다를 수 있었음. 이로 인해 2025년 12월 데이터 입력 시 1주차 시작일이 11월 30일로 잘못 표시되는 문제 발생.
- **문제점**: UI의 `selectedYear`가 급여 계산 로직에 직접 반영되지 않아, 사용자의 의도와 다른 월에 대한 급여 계산이 이루어질 수 있었음.
- **해결 방법**:
    1. `smart-pay-schedule/src/lib/payroll-utils.ts` 파일의 `calculateMonthlyPayroll` 함수 시그니처를 `targetYear: number`와 `targetMonth: number`를 받도록 수정.
    2. `calculateMonthlyPayroll` 함수 내에서 `firstDayOfMonth`와 `lastDayOfMonth`를 `targetYear`와 `targetMonth` 매개변수를 사용하여 직접 정의하도록 변경.
    3. `allShifts` 배열을 `targetYear`와 `targetMonth`에 해당하는 근무 기록만 포함하도록 필터링하여, 지정된 월에 대해서만 급여 계산이 이루어지도록 함.
    4. `smart-pay-schedule/src/components/DashboardClient.tsx` 파일의 `handleCalculatePay` 함수에서 `calculateMonthlyPayroll`을 호출할 때, `selectedYear`와 (첫 번째 근무 기록의 월 또는 현재 월을 기본값으로 하는) `targetMonth`를 매개변수로 전달하도록 수정.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 `calculateMonthlyPayroll` 함수 `currentWeekTotalMinutes` 변수 초기화 오류 수정
- **원인**: `smart-pay-schedule/src/lib/payroll-utils.ts` 파일의 `calculateMonthlyPayroll` 함수에서 `currentWeekTotalMinutes` 변수가 함수 스코프 내에서 올바르게 초기화되지 않아 `ReferenceError` 발생.
- **문제점**: `currentWeekTotalMinutes`가 사용되는 시점에 정의되지 않아 런타임 오류가 발생하고 급여 계산 로직이 중단됨.
- **해결 방법**: `calculateMonthlyPayroll` 함수 시작 부분에 `currentWeekTotalMinutes` 변수를 `0`으로 명시적으로 초기화하여, 해당 변수가 사용되는 모든 스코프에서 접근 가능하도록 수정.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 근무 기록 유효성 검사 및 주간 급여 계산 로직 개선
- **원인**:
    1. 이미지 분석 결과에서 `null` 값이 포함된 근무 기록이 발생하여 애플리케이션 오류를 유발.
    2. `calculateMonthlyPayroll` 함수에서 주간 그룹화 로직이 부정확하여 월의 첫째 주 및 이후 주차 계산이 잘못됨 (예: 2025년 12월 1주차 시작일 오류, 2주차에 모든 근무 기록이 몰리는 현상).
- **문제점**:
    1. 유효하지 않은 근무 기록 데이터로 인해 급여 계산 및 UI 표시에서 오류 발생.
    2. 주간 급여 요약이 실제 주간 단위와 일치하지 않아 정확한 급여 계산이 어려움.
- **해결 방법**:
    1. **근무 기록 유효성 검사**:
        - `smart-pay-schedule/src/components/DashboardClient.tsx` 파일의 `handleAnalyzeAll` 함수 내에서 이미지 분석 결과(`analyzedShifts`)를 `Shift` 객체로 매핑하기 전에 유효성 검사 로직을 추가. `name`, `date`, `start`, `end` 필드가 모두 존재하는 유효한 근무 기록만 `shifts` 상태에 반영하도록 필터링.
    2. **주간 급여 계산 로직 개선**:
        - `smart-pay-schedule/src/lib/payroll-utils.ts` 파일의 `calculateMonthlyPayroll` 함수 로직을 전면 수정.
        - 월의 첫째 날부터 마지막 날까지 날짜를 순회하며, 각 날짜의 요일(일요일 시작)을 기준으로 주간 경계를 명확히 설정.
        - 각 주차는 일요일부터 토요일까지로 정의하고, 월의 시작과 끝에 있는 부분 주차도 올바르게 처리하도록 로직을 개선.
        - 이를 통해 2025년 12월 예시와 같이 첫째 주 시작일이 잘못되거나, 모든 주차가 특정 주차에 몰리는 문제를 해결.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 UI 및 로직 전면 수정 (분석/계산 분리, 데이터 그룹화, 시급 연동)
- **원인**: 사용자 요구사항에 따라 `smart-pay-schedule` 프로젝트의 UI 및 급여 계산 로직을 개선하고, 데이터 표시 방식을 변경하며, 시급 설정 기능을 강화해야 함.
- **문제점**:
    1. 이미지 분석 완료 시 급여가 즉시 계산되어 분석과 계산 로직이 분리되지 않음.
    2. 근무 기록 데이터가 직원 이름별로 그룹화되지 않고 중복된 이름이 표시되어 가독성이 떨어짐.
    3. 시급 설정이 고정되어 있어 연도별 기본값 적용 및 수동 수정 기능이 없음.
- **해결 방법**:
    1. **분석과 계산 로직 분리**:
        - `DashboardClient.tsx`에서 `calculatedPaySummary` 상태를 추가하고, `handleAnalyzeAll` 함수는 이미지 분석 결과(근무 기록)만 화면에 표시하도록 수정.
        - 새로운 `handleCalculatePay` 함수를 추가하여 `calculateMonthlyPayroll`을 호출하고 `calculatedPaySummary`를 업데이트하도록 함.
        - "급여 계산하기" 버튼을 추가하여 사용자가 명시적으로 급여 계산을 트리거하도록 변경.
        - `PaySummary` 컴포넌트가 `shifts`와 `hourlyWage` 대신 `calculatedPaySummary`를 직접 받도록 수정.
    2. **데이터 그룹화 및 UI 레이아웃 변경**:
        - `DashboardClient.tsx`에 `groupShiftsByName` 헬퍼 함수를 추가하여 근무 기록을 직원 이름별로 그룹화.
        - UI 렌더링 로직을 수정하여 각 직원 이름을 헤더로 표시하고, 그 아래에 해당 직원의 날짜별 근무 기록을 테이블 형태로 나열하도록 변경. 기존 테이블에서 중복되던 '이름' 컬럼 제거.
    3. **연도별 기본 시급 연동 및 수동 수정 기능**:
        - `DashboardClient.tsx`에 `isHourlyWageManuallySet` 상태를 추가하여 시급 수동 설정 여부를 추적.
        - `useEffect` 훅을 사용하여 `selectedYear`가 변경될 때 (수동 설정되지 않은 경우) 2025년은 10,030원, 2026년은 10,320원으로 `hourlyWage`를 자동 설정하도록 구현.
        - 시급을 수동으로 입력할 수 있는 입력 필드를 추가하고, 사용자가 값을 변경하면 `isHourlyWageManuallySet`을 `true`로 설정하여 수동 입력 값이 우선 적용되도록 함.
    4. **오타 수정**: `DashboardClient.tsx`에서 `EditableCell`의 `end_time` 컬럼에 `shift.date`가 아닌 `shift.end_time`이 올바르게 바인딩되도록 수정.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 Tailwind CSS 적용 문제 해결 (버전 및 PostCSS 설정)
- **원인**:
    1. `postcss.config.js`에서 `tailwindcss` v4용 플러그인인 `@tailwindcss/postcss`를 사용하고 있었으나, `package.json`에는 `tailwindcss` v3.x가 설치되어 있어 버전 불일치 발생.
    2. `node_modules` 및 `package-lock.json`에 잔여 파일 및 잠금 문제가 발생하여 패키지 재설치 및 제거가 원활하지 않았음.
- **문제점**: Tailwind CSS 스타일이 프로젝트에 올바르게 적용되지 않았음.
- **해결 방법**:
    1. `postcss.config.js` 파일을 `tailwindcss` v3.x에 맞는 표준 설정인 `tailwindcss: {}`로 변경.
    2. `node_modules` 디렉토리와 `package-lock.json` 파일을 강제로 삭제하여 모든 패키지 관련 문제를 해결.
    3. `tailwindcss@3.4.1`, `postcss@8.4.31`, `autoprefixer@10.4.19`를 재설치하여 안정적인 Tailwind CSS v3.x 환경을 구축. `@tailwindcss/postcss`는 `tailwindcss` v3.x에서 필요하지 않으므로 설치하지 않음.
- **날짜 및 시간**: 2026년 1월 30일 금요일

# Changelog

## 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 콘솔 오류 수정
- **원인**: `smart-pay-schedule` 프로젝트 실행 시 `localhost:3000/dashboard`에서 `Module not found: Can't resolve ' @/components/DashboardClient'` 콘솔 오류 발생. `tsconfig.json`에 `@` 경로 별칭이 명시적으로 정의되어 있지 않아 발생한 문제.
- **문제점**: Next.js 개발 서버가 `@/components/DashboardClient` 경로를 올바르게 해석하지 못하여 컴포넌트를 찾을 수 없었음.
- **해결 방법**: `smart-pay-schedule/tsconfig.json` 파일의 `compilerOptions`에 `paths` 설정을 추가하여 `@/*`가 `./src/*`를 가리키도록 명시적으로 정의.
  ```json
  "paths": {
    "@/*": ["./src/*"]
  }
  ```
- **날짜 및 시간**: 2026년 1월 29일 목요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 런타임 오류 수정
- **원인**: Next.js App Router 프로젝트에서 루트 레이아웃 파일(`layout.tsx` 또는 `layout.js`)이 없어 "Missing <html> and <body> tags in the root layout" 런타임 오류 발생.
- **문제점**: Next.js가 페이지 렌더링에 필요한 기본 HTML 구조(<html>, <body> 태그)를 찾을 수 없었음.
- **해결 방법**: `smart-pay-schedule/src/app/layout.tsx` 파일을 생성하고, 기본 `<html>` 및 `<body>` 태그를 포함하는 `RootLayout` 컴포넌트를 정의.
  ```tsx
  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }
  ```
- **날짜 및 시간**: 2026년 1월 29일 목요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 이미지 분석 오류 디버깅을 위한 로깅 추가
- **원인**: 이미지 업로드 시 "Failed to analyze image." 런타임 오류 발생. 이는 `/api/analyze` API 엔드포인트에서 Google Generative AI 모델의 응답을 파싱하는 데 실패했기 때문으로 추정됨.
- **문제점**: 모델의 실제 응답 형식을 알 수 없어 정확한 원인 파악 및 해결이 어려움.
- **해결 방법**: `smart-pay-schedule/src/app/api/analyze/route.ts` 파일에 `console.log("Gemini API Response Text:", responseText);` 코드를 추가하여 Gemini API의 원본 응답 텍스트를 콘솔에 출력하도록 함. 이를 통해 모델의 응답 형식을 확인하고 파싱 로직을 개선할 수 있는 정보를 얻을 수 있음.
- **날짜 및 시간**: 2026년 1월 29일 목요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 Gemini API 모델 이름 변경 (gemini-pro -> gemini-1.5-flash-latest)
- **원인**: `/api/analyze` API 호출 시 `gemini-1.5-flash` 모델이 `v1beta` API 버전에서 찾을 수 없거나 `generateContent` 메서드에서 지원되지 않아 404 오류 발생. 이전에 `gemini-pro`로 변경했으나, 사용자 요청에 따라 `gemini-1.5-flash-latest`로 재변경.
- **문제점**: 잘못된 모델 이름 사용으로 인해 Gemini API 호출이 실패하고 이미지 분석 기능이 작동하지 않음.
- **해결 방법**: `smart-pay-schedule/src/app/api/analyze/route.ts` 파일에서 `MODEL_NAME`을 `"gemini-pro"`에서 사용자 제안에 따라 `"gemini-1.5-flash-latest"`로 변경.
- **날짜 및 시간**: 2026년 1월 29일 목요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 Tailwind CSS 설정 및 적용
- **원인**: 프로젝트에 Tailwind CSS 클래스가 사용되었으나, Tailwind CSS가 설치 및 설정되지 않아 CSS 스타일이 적용되지 않음.
- **문제점**: UI가 의도한 대로 렌더링되지 않고, Tailwind CSS 클래스가 단순 텍스트로 표시됨.
- **해결 방법**:
    1. `smart-pay-schedule` 디렉토리에서 `node_modules` 및 `package-lock.json` 파일을 제거하고 `npm install`을 통해 모든 종속성을 재설치하여 환경을 정리.
    2. `smart-pay-schedule/tailwind.config.js` 파일을 수동으로 생성하고, Tailwind CSS가 프로젝트 파일을 스캔하도록 `content` 설정을 추가.
    3. `smart-pay-schedule/postcss.config.js` 파일을 수동으로 생성하고, `tailwindcss` 및 `autoprefixer` 플러그인을 추가.
    4. `smart-pay-schedule/src/app/globals.css` 파일을 생성하고, Tailwind CSS의 기본, 컴포넌트, 유틸리티 스타일을 가져오는 `@tailwind` 지시문을 추가.
    5. `smart-pay-schedule/src/app/layout.tsx` 파일에 `./globals.css`를 임포트하여 전역 스타일이 적용되도록 함.
- **날짜 및 시간**: 2026년 1월 29일 목요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 Tailwind CSS PostCSS 플러그인 설정 수정
- **원인**: `postcss.config.js`에서 `tailwindcss`를 직접 PostCSS 플러그인으로 사용하려 하여 빌드 오류 발생. Tailwind CSS PostCSS 플러그인은 별도의 `@tailwindcss/postcss` 패키지로 분리됨.
- **문제점**: `npm run dev` 실행 시 "Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin." 빌드 오류 발생.
- **해결 방법**:
    1. `@tailwindcss/postcss` 패키지를 개발 종속성으로 설치.
    2. `smart-pay-schedule/postcss.config.js` 파일에서 `tailwindcss: {}`를 `'@tailwindcss/postcss': {}`로 변경하여 올바른 PostCSS 플러그인을 사용하도록 수정.
- **날짜 및 시간**: 2026년 1월 29일 목요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 Gemini API 에러 로깅 상세화 및 응답 처리 개선
- **원인**: Gemini API 호출 시 발생하는 오류의 상세 정보를 파악하기 어렵고, 모델 응답 파싱 로직이 견고하지 않아 "Failed to analyze image." 오류가 발생할 수 있음.
- **문제점**: 서버 콘솔에 출력되는 오류 메시지가 불충분하여 디버깅에 어려움이 있고, 모델이 JSON이 아닌 텍스트를 반환할 경우 파싱 실패.
- **해결 방법**: `smart-pay-schedule/src/app/api/analyze/route.ts` 파일의 `POST` 함수를 다음과 같이 수정:
    - `result.response`에서 `response` 객체를 직접 받아 `response.text()`를 통해 텍스트 응답을 얻도록 변경.
    - `console.log("Gemini API Response Text:", text);`를 추가하여 모델의 원본 텍스트 응답을 항상 로깅.
    - `return NextResponse.json(JSON.parse(text));`로 직접 JSON 파싱을 시도하여, 모델이 유효한 JSON을 반환할 경우 바로 처리.
    - `catch` 블록을 상세화하여 `console.error("Gemini API Error Details:", error);`를 통해 에러 객체 전체를 로깅하고, 사용자에게 더 명확한 오류 메시지를 반환하도록 개선.
- **날짜 및 시간**: 2026년 1월 29일 목요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 Gemini API 모델 이름 변경 (gemini-pro -> gemini-1.5-flash-latest)
- **원인**: `/api/analyze` API 호출 시 `gemini-1.5-flash` 모델이 `v1beta` API 버전에서 찾을 수 없거나 `generateContent` 메서드에서 지원되지 않아 404 오류 발생. 웹 검색 결과에 따라 지원되는 "flash" 모델로 변경 필요.
- **문제점**: 잘못된 모델 이름 사용으로 인해 Gemini API 호출이 실패하고 이미지 분석 기능이 작동하지 않음.
- **해결 방법**: `smart-pay-schedule/src/app/api/analyze/route.ts` 파일에서 `MODEL_NAME`을 `"gemini-pro"`에서 사용자 제안에 따라 `"gemini-1.5-flash-latest"`로 변경.
- **날짜 및 시간**: 2026년 1월 29일 목요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 Gemini API 응답 파싱 로직 개선 (마크다운 래핑 제거)
- **원인**: Gemini API가 JSON 응답을 마크다운 코드 블록(```json ... ```)으로 감싸서 반환하여 `JSON.parse()`가 실패하는 `SyntaxError` 발생.
- **문제점**: 모델이 유효한 JSON을 반환하더라도, 추가적인 마크다운 형식 때문에 프론트엔드에서 이를 파싱하지 못하고 "Failed to extract JSON from AI response." 오류가 발생함.
- **해결 방법**: `smart-pay-schedule/src/app/api/analyze/route.ts` 파일에서 `response.text()`로 받은 문자열에서 정규 표현식을 사용하여 ````json ... ```` 블록 내의 순수한 JSON 문자열만 추출하도록 파싱 로직을 수정. 추출된 JSON 문자열을 `JSON.parse()`에 전달하여 올바르게 파싱되도록 함.
- **날짜 및 시간**: 2026년 1월 29일 목요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 Gemini API 응답 파싱 로직 재수정 (클린 JSON 처리)
- **원인**: Gemini API가 이제 마크다운 코드 블록 없이 클린 JSON을 반환함에도 불구하고, 이전 파싱 로직이 여전히 마크다운 래핑을 기대하여 "Failed to extract JSON from AI response." 오류 발생.
- **문제점**: 모델의 응답 형식이 변경되었으나, 파싱 로직이 이에 맞춰 업데이트되지 않아 불필요한 JSON 추출 로직이 오류를 발생시킴.
- **해결 방법**: `smart-pay-schedule/src/app/api/analyze/route.ts` 파일에서 `response.text()`로 받은 문자열을 직접 `JSON.parse()`에 전달하도록 파싱 로직을 재수정. 이는 모델이 클린 JSON을 반환할 때 가장 효율적인 처리 방법임.
- **날짜 및 시간**: 2026년 1월 29일 목요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 Gemini API 응답 파싱 로직 재수정 (마크다운 래핑 재적용)
- **원인**: Gemini API가 다시 JSON 응답을 마크다운 코드 블록(```json ... ```)으로 감싸서 반환하기 시작하여 `JSON.parse()`가 실패하는 `SyntaxError` 발생.
- **문제점**: 모델의 응답 형식 일관성 부족으로 인해 파싱 로직이 계속해서 오류를 발생시킴.
- **해결 방법**: `smart-pay-schedule/src/app/api/analyze/route.ts` 파일에서 `response.text()`로 받은 문자열에서 정규 표현식을 사용하여 ````json ... ```` 블록 내의 순수한 JSON 문자열만 추출하도록 파싱 로직을 다시 적용.
- **날짜 및 시간**: 2026년 1월 29일 목요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 AI 모델 선택 옵션 업데이트 및 `gemini-3-flash` 오류 해결
- **원인**: `gemini-3-flash` 모델이 `v1beta` API에서 지원되지 않아 `[404 Not Found]` 오류 발생. `list_models.js` 스크립트를 통해 사용 가능한 모델 목록을 확인한 결과, `gemini-3-flash`는 존재하지 않으며 `gemini-3-flash-preview`가 미리보기 모델로 제공됨을 확인.
- **문제점**: 사용자가 `gemini-3-flash`를 선택할 경우 API 호출이 실패하여 이미지 분석 기능을 사용할 수 없었음.
- **해결 방법**:
    1. REST API 호출을 통해 사용 가능한 Gemini 모델 목록을 확인.
    2. `smart-pay-schedule/src/app/dashboard/page.tsx` 파일에서 AI 모델 선택 드롭다운 옵션을 업데이트.
        - 기존 `gemini-3-flash` 옵션을 `gemini-3-flash-preview`로 변경하여 사용 가능한 미리보기 모델을 선택할 수 있도록 함.
        - `gemini-2.5-flash`는 안정적인 모델로 유지.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 DashboardClient에 selectedModel prop 추가 및 API 요청에 포함
- **원인**: `DashboardPage`에서 선택된 AI 모델(`selectedModel`)이 `DashboardClient` 컴포넌트로 전달되지 않고, `/api/analyze` API 요청에도 포함되지 않아 "오류: images, selectedYear, and selectedModel are required." 에러 발생.
- **문제점**: AI 모델 선택 기능이 프론트엔드에서 백엔드로 제대로 전달되지 않아 이미지 분석 요청이 실패함.
- **해결 방법**:
    1. `smart-pay-schedule/src/components/DashboardClient.tsx` 파일의 `DashboardClientProps` 인터페이스에 `selectedModel: string;`을 추가하여 `selectedModel` prop을 받도록 수정.
    2. `smart-pay-schedule/src/components/DashboardClient.tsx` 파일의 `handleAnalyzeAll` 함수 내 `fetch` 요청 `body`에 `selectedModel`을 추가하여 API 요청 시 함께 전송하도록 수정.
    3. `smart-pay-schedule/src/app/api/analyze/route.ts` 파일은 이미 `selectedModel`을 요청 `body`에서 받아 Gemini API 호출 시 사용하도록 구현되어 있었음.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 AI 모델 선택 옵션에 `gemini-2.5-flash-lite` 추가
- **원인**: 사용자가 `gemini-2.5-flash-lite` 모델을 선택할 수 있도록 요청. `list_models.js` 스크립트 실행 결과, `gemini-2.5-flash-lite` 모델이 `generateContent`를 지원하며 사용 가능함을 확인.
- **문제점**: 기존 AI 모델 선택 드롭다운에 `gemini-2.5-flash-lite` 옵션이 없어 사용자가 해당 모델을 선택할 수 없었음.
- **해결 방법**:
    1. `smart-pay-schedule/src/app/dashboard/page.tsx` 파일의 AI 모델 선택 드롭다운에 `<option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>`를 추가.
- **날짜 및 시간**: 2026년 1월 30일 금요일

## 2026년 1월 30일 금요일
### smart-pay-schedule 프로젝트 PostCSS 및 Tailwind CSS 설정 파일 ES 모듈 형식으로 변환
- **원인**: `smart-pay-schedule/package.json`에 `"type": "module"`이 추가되어 프로젝트가 ES 모듈 환경으로 설정되었으나, `postcss.config.js` 및 `tailwind.config.js` 파일이 여전히 CommonJS 문법(`module.exports = {}`)을 사용하여 `ReferenceError: module is not defined in ES module scope` 오류 발생.
- **문제점**: ES 모듈 환경에서 CommonJS 문법을 사용하는 설정 파일이 로드되지 않아 PostCSS 및 Tailwind CSS 처리가 실패하고 빌드 오류가 발생함.
- **해결 방법**:
    1. `smart-pay-schedule/postcss.config.js` 파일을 `module.exports = { ... }`에서 `export default { ... };` 형식으로 변환.
    2. `smart-pay-schedule/tailwind.config.js` 파일을 `module.exports = { ... }`에서 `export default { ... };` 형식으로 변환.
- **날짜 및 시간**: 2026년 1월 30일 금요일

### 2026년 1월 29일 목요일
### smart-pay-schedule 프로젝트 프론트엔드 데이터 매핑 수정
- **원인**: Gemini API 응답의 시간 필드 이름(`start`, `end`)이 프론트엔드 `Shift` 인터페이스의 필드 이름(`start_time`, `end_time`)과 불일치하여 웹페이지에 시작 시간과 종료 시간이 표시되지 않음.
- **문제점**: API에서 올바른 데이터를 받아왔음에도 불구하고, 프론트엔드에서 데이터 매핑이 잘못되어 UI에 정보가 누락됨.
- **해결 방법**:
    1. `smart-pay-schedule/src/types/index.ts` 파일의 `Shift` 인터페이스를 수정하여 API 응답에 포함된 `name` 필드를 추가하고, 현재 API 응답에서 제공되지 않는 `employee_id` 필드를 선택적(`employee_id?: string`)으로 변경.
    2. `smart-pay-schedule/src/components/DashboardClient.tsx` 파일에서 `analyzedShifts`를 `shiftsWithIds`로 매핑하는 로직을 수정. API 응답의 `s.start`를 `start_time`에, `s.end`를 `end_time`에 명시적으로 매핑하고, `break_minutes`와 `is_paid_break`에는 기본값을 할당.
- **날짜 및 시간**: 2026년 1월 29일 목요일
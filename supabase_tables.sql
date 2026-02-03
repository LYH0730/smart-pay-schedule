-- RLS를 위해 사용자의 ID를 가져오는 헬퍼 함수
create or replace function auth.user_id() returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$ language sql stable;

-- employees 테이블 생성
-- 각 직원은 특정 user(매니저)에게 속합니다.
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.user_id(),
    name TEXT NOT NULL,
    hourly_wage NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- shifts 테이블 생성
-- 각 근무 기록은 특정 user(매니저)에게 속합니다.
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.user_id(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    break_minutes INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- employees 테이블 RLS 정책: 자신의 직원 정보만 CUD (생성, 수정, 삭제) 및 R (읽기) 가능
CREATE POLICY "Users can manage their own employees"
ON employees
FOR ALL
USING (auth.user_id() = user_id)
WITH CHECK (auth.user_id() = user_id);

-- shifts 테이블 RLS 정책: 자신의 근무 기록만 CUD (생성, 수정, 삭제) 및 R (읽기) 가능
CREATE POLICY "Users can manage their own shifts"
ON shifts
FOR ALL
USING (auth.user_id() = user_id)
WITH CHECK (auth.user_id() = user_id);
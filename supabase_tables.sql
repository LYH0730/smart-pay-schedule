-- RLS를 위해 사용자의 ID를 가져오는 헬퍼 함수
create or replace function auth.user_id() returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$ language sql stable;

-- profiles 테이블 생성 (사용자 정보 확장)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  shop_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- employees 테이블 생성
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    hourly_wage NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- shifts 테이블 생성
CREATE TABLE public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    break_minutes INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- profiles 테이블 RLS 정책
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- 회원가입 시 트리거로 생성되므로 INSERT 정책은 선택 사항이지만, 혹시 모르니 허용
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- employees 테이블 RLS 정책
CREATE POLICY "Users can manage their own employees"
ON public.employees
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- shifts 테이블 RLS 정책
CREATE POLICY "Users can manage their own shifts"
ON public.shifts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- [Trigger] 새 사용자가 가입하면 자동으로 profiles 행 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, shop_name)
  values (new.id, '나의 가게');
  return new;
end;
$$ language plpgsql security definer;

-- 기존 트리거가 있다면 삭제 후 재생성 (안전장치)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

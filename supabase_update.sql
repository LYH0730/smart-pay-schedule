-- 1. profiles 테이블 안전하게 생성 (없을 때만)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  shop_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS 활성화 (이미 활성화되어 있어도 안전함)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. 정책(Policy) 안전하게 재생성
-- 기존 정책이 있다면 삭제하고 다시 만듭니다.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
END $$;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. [Trigger] 새 사용자가 가입하면 자동으로 profiles 행 생성
-- 함수는 create or replace로 덮어쓰기 가능
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 충돌 방지 (ON CONFLICT DO NOTHING)
  insert into public.profiles (id, shop_name)
  values (new.id, '나의 가게')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. [옵션] 기존 사용자들을 위한 데이터 마이그레이션
-- 이미 가입된 사용자가 있다면 profiles에 행을 만들어줍니다.
INSERT INTO public.profiles (id, shop_name)
SELECT id, '나의 가게' FROM auth.users
ON CONFLICT (id) DO NOTHING;

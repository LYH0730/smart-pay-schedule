-- 1. 사장님 추가 정보(가게 이름 등)를 저장할 프로필 테이블 생성
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  shop_name TEXT DEFAULT '나의 가게',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 보안 정책 (아무나 남의 가게 이름을 보거나 바꾸지 못하게 막음)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "자신의 프로필만 조회/수정 가능" 
ON public.profiles FOR ALL 
USING (auth.uid() = id);

-- 3. 🌟 [핵심] 누군가 새로 회원가입을 하면, 자동으로 이 profiles 테이블에 빈 칸을 만들어주는 자동화 로직(Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, shop_name)
  VALUES (new.id, '나의 가게');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
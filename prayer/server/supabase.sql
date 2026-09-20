-- 기도로 짓는 집 — 기도 시간 누적 테이블.
-- Supabase 대시보드의 SQL Editor 에 붙여넣고 Run 하면 끝입니다.
--
-- 로그인 없이 누구나 올릴 수 있어야 하므로 anon 역할에 insert 를 엽니다.
-- 다만 기도제목 본문은 읽기를 막고, 합계 계산에 필요한 hours 만 읽게 합니다.

create table if not exists public.prayers (
  id         bigint generated always as identity primary key,
  hours      numeric not null check (hours > 0 and hours <= 100),
  topic      text    not null check (char_length(topic) between 1 and 500),
  heart      text    not null default '' check (char_length(heart) <= 500),
  name       text    not null default '' check (char_length(name)  <= 30),
  ts         bigint  not null,
  created_at timestamptz not null default now()
);

alter table public.prayers enable row level security;

create policy "누구나 기도 올리기" on public.prayers
  for insert to anon with check (true);

-- 읽기는 hours 만 필요합니다. 본문이 공개되지 않도록 뷰로 감쌉니다.
create or replace view public.prayer_hours as
  select id, hours from public.prayers;

grant select on public.prayer_hours to anon;

-- 페이지는 이미 prayer_hours 를 읽도록 되어 있습니다. 따로 고칠 것이 없습니다.

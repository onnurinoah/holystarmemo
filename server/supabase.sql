-- WELCOME HOME 초대 접수용 테이블.
-- Supabase 대시보드의 SQL Editor 에 통째로 붙여넣고 Run 한 번 하면 끝입니다.
--
-- 교인들이 로그인 없이 QR만 스캔해서 제출해야 하므로 anon 역할에 권한을 엽니다.
-- 대신 길이 제한을 컬럼 제약으로 걸어 아무 데이터나 못 들어오게 합니다.

create table if not exists public.invites (
  id          bigint generated always as identity primary key,
  name        text   not null check (char_length(name)   between 1 and 40),
  relation    text   not null default '' check (char_length(relation) <= 30),
  sender      text   not null default '' check (char_length(sender) <= 30),
  ts          bigint not null,
  created_at  timestamptz not null default now()
);

create index if not exists invites_ts_idx on public.invites (ts);

alter table public.invites enable row level security;

create policy "누구나 읽기" on public.invites
  for select to anon using (true);

create policy "누구나 접수" on public.invites
  for insert to anon with check (true);

-- 잘못 보냈을 때 되돌릴 수 있게 열어둡니다.
-- 누구나 지울 수 있다는 뜻이므로, 부담스러우면 이 정책만 빼고
-- 페이지의 [방금 보낸 것 취소] 버튼은 쓰지 마세요.
create policy "누구나 취소" on public.invites
  for delete to anon using (true);


-- 목표 개수와 QR 주소. 대시보드에서만 고칩니다.
create table if not exists public.config (
  key       text primary key,
  goal      int  not null default 30,
  share_url text not null default ''
);

alter table public.config enable row level security;

create policy "설정 읽기" on public.config
  for select to anon using (true);

insert into public.config (key, goal, share_url)
values ('campaign', 30, '')
on conflict (key) do nothing;

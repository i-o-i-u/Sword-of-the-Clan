-- مخطط قاعدة بيانات "مكتبة سيف العشيرة"
-- نفّذ هذا الملف في محرر SQL الخاص بمشروع Supabase (SQL Editor)

create extension if not exists "pgcrypto";

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  author text,
  category text,
  shelf_location text,
  reading_status text not null default 'لم يُقرأ'
    check (reading_status in ('لم يُقرأ', 'قيد القراءة', 'انتهى')),
  publication_year integer check (publication_year between 0 and 3000),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_user_id_idx on public.books (user_id);

-- تحديث updated_at تلقائيًا عند كل تعديل
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_books_updated_at on public.books;
create trigger set_books_updated_at
  before update on public.books
  for each row
  execute function public.set_updated_at();

-- تفعيل Row Level Security: بدون سياسات صريحة، لا يستطيع أي أحد (بما فيه anon)
-- القراءة أو الكتابة إطلاقًا. السياسات أدناه تسمح فقط لصاحب الصف
-- (المستخدم المصادَق عليه الذي أنشأ السجل) بالوصول إلى كتبه الخاصة.
alter table public.books enable row level security;

drop policy if exists "books_select_own" on public.books;
create policy "books_select_own"
  on public.books for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own"
  on public.books for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own"
  on public.books for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own"
  on public.books for delete
  to authenticated
  using (auth.uid() = user_id);

-- ملاحظة: لا توجد أي سياسة للدور anon، لذلك يُمنع الزوار المجهولون
-- من أي وصول للقراءة أو الكتابة بشكل افتراضي.

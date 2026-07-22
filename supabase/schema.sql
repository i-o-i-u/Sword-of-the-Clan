-- مخطط قاعدة بيانات "مكتبة سيف العشيرة"
-- نفّذ هذا الملف كاملًا في محرر SQL الخاص بمشروع Supabase (SQL Editor)
--
-- نموذج الصلاحيات المعتمَد في كل الجداول أدناه:
--   • القراءة (select) متاحة للجميع، بمن فيهم الزوار غير المسجَّلين (anon)،
--     لأن تصفّح الفهرس والسجلّات لا يحتاج حسابًا.
--   • الإضافة/التعديل/الحذف (insert/update/delete) مقصورة على صاحب البيانات
--     المصادَق عليه فقط (auth.uid() = user_id) — أي مالك المكتبة وحده.

create extension if not exists "pgcrypto";

-- سياسات RLS وحدها لا تكفي لمنح الوصول: يجب أولًا منح صلاحية استخدام
-- المخطط (schema) والصلاحيات الأساسية على الجداول لدوري anon وauthenticated،
-- وإلا ظهر خطأ "permission denied for table ..." قبل أن تُفحَص سياسات RLS أصلًا.
grant usage on schema public to anon, authenticated;

-- ============================================================
-- جدول الكتب
-- ============================================================
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
  cover_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_user_id_idx on public.books (user_id);

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

alter table public.books enable row level security;

drop policy if exists "books_select_public" on public.books;
create policy "books_select_public"
  on public.books for select
  to anon, authenticated
  using (true);

drop policy if exists "books_select_own" on public.books;

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

-- ============================================================
-- جدول سجلّ الزيارات
-- ============================================================
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  visitor_name text not null,
  visit_date date not null default current_date,
  purpose text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists visits_user_id_idx on public.visits (user_id);
create index if not exists visits_visit_date_idx on public.visits (visit_date desc);

alter table public.visits enable row level security;

drop policy if exists "visits_select_public" on public.visits;
create policy "visits_select_public"
  on public.visits for select
  to anon, authenticated
  using (true);

drop policy if exists "visits_insert_own" on public.visits;
create policy "visits_insert_own"
  on public.visits for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "visits_update_own" on public.visits;
create policy "visits_update_own"
  on public.visits for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "visits_delete_own" on public.visits;
create policy "visits_delete_own"
  on public.visits for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- جدول سجلّ الاستعارات
-- ============================================================
create table if not exists public.borrows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  book_id uuid references public.books (id) on delete set null,
  book_title_snapshot text not null,
  borrower_name text not null,
  borrow_date date not null default current_date,
  due_date date,
  return_date date,
  status text not null default 'مستعار'
    check (status in ('مستعار', 'تم الإرجاع')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists borrows_user_id_idx on public.borrows (user_id);
create index if not exists borrows_book_id_idx on public.borrows (book_id);
create index if not exists borrows_status_idx on public.borrows (status);

drop trigger if exists set_borrows_updated_at on public.borrows;
create trigger set_borrows_updated_at
  before update on public.borrows
  for each row
  execute function public.set_updated_at();

alter table public.borrows enable row level security;

drop policy if exists "borrows_select_public" on public.borrows;
create policy "borrows_select_public"
  on public.borrows for select
  to anon, authenticated
  using (true);

drop policy if exists "borrows_insert_own" on public.borrows;
create policy "borrows_insert_own"
  on public.borrows for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "borrows_update_own" on public.borrows;
create policy "borrows_update_own"
  on public.borrows for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "borrows_delete_own" on public.borrows;
create policy "borrows_delete_own"
  on public.borrows for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- صلاحيات الأدوار على مستوى الجدول (Grants)
-- ============================================================
-- القراءة لأي زائر (anon) ولأي مستخدم مصادَق عليه (authenticated).
-- سياسات RLS أعلاه هي ما يحدّد فعليًا أي الصفوف تُقرأ/تُكتب؛ هذه الأسطر
-- تفتح الباب الأساسي على مستوى الجدول الذي بدونه تُرفض كل العمليات فورًا.
grant select on public.books, public.visits, public.borrows to anon, authenticated;
grant insert, update, delete on public.books, public.visits, public.borrows to authenticated;

-- ============================================================================
--  مخطط قاعدة بيانات «مكتبة سيف العشيرة» — فهرس المكتبة المنزلية
--  نفّذ هذا الملف في محرر SQL الخاص بمشروع Supabase (SQL Editor).
--
--  نموذج الصلاحيات:
--    • صاحب المكتبة (owner)  : حساب واحد فقط، يملك كل شيء قراءةً وكتابة.
--    • الزوار (anon)         : قراءة فقط، ومن خلال «العروض العامة» (public_*)
--                              التي تُطبِّق قواعد الخصوصية داخل قاعدة البيانات،
--                              فلا يصل إلى الزائر ما أخفاه صاحب المكتبة أصلًا.
--
--  ⚠️ تحذير: القسم الأول يحذف جدول books القديم وما فيه من بيانات.
--     المخطط الجديد مختلف تمامًا عن القديم، ولا يمكن ترحيل الأعمدة آليًا.
--     إن كان في الجدول القديم بيانات تهمّك فخُذ نسخة احتياطية قبل التنفيذ.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 0. تنظيف المخطط القديم
-- ---------------------------------------------------------------------------
drop view if exists public.public_books cascade;
drop view if exists public.public_authors cascade;
drop view if exists public.public_perks cascade;
drop view if exists public.public_loans cascade;
drop view if exists public.public_book_works cascade;
drop view if exists public.public_settings cascade;
drop view if exists public.public_shelves cascade;
drop view if exists public.public_categories cascade;
drop view if exists public.public_landing_slides cascade;

drop table if exists public.loans cascade;
drop table if exists public.perks cascade;
drop table if exists public.book_works cascade;
drop table if exists public.books cascade;
drop table if exists public.authors cascade;
drop table if exists public.landing_slides cascade;
drop table if exists public.library_settings cascade;
drop table if exists public.shelves cascade;
drop table if exists public.categories cascade;
drop table if exists public.library_owner cascade;

-- ---------------------------------------------------------------------------
-- 1. صاحب المكتبة: صف واحد لا غير
-- ---------------------------------------------------------------------------
create table public.library_owner (
  id          smallint primary key default 1 check (id = 1),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null default 'صاحب المكتبة',
  claimed_at  timestamptz not null default now()
);

alter table public.library_owner enable row level security;

-- هل المستخدم الحالي هو صاحب المكتبة؟
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.library_owner o where o.user_id = auth.uid());
$$;

-- هل حُجز حساب صاحب المكتبة بعد؟ (يستدعيها الزائر لمعرفة أول تشغيل)
create or replace function public.owner_exists()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.library_owner);
$$;

grant execute on function public.owner_exists() to anon, authenticated;
grant execute on function public.is_owner() to authenticated;

-- يقرأ صاحبُ المكتبة صفَّه فقط
create policy "owner_select_self" on public.library_owner
  for select to authenticated
  using (user_id = auth.uid());

-- حجز الحساب مرةً واحدة: لا يُسمح بالإدراج إلا والجدول فارغ، وباسم المستخدم نفسه
create policy "owner_claim_once" on public.library_owner
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.library_owner)
  );

create policy "owner_update_self" on public.library_owner
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. الأرفف والتصنيفات (قوائم يحرّرها صاحب المكتبة)
-- ---------------------------------------------------------------------------
create table public.shelves (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  position integer not null default 0
);

create table public.categories (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  position integer not null default 0
);

insert into public.shelves (name, position) values ('المكتبة', 0);
insert into public.categories (name, position) values
  ('أدب عربي', 0), ('أدب عالمي', 1), ('تاريخ', 2),
  ('فلسفة', 3), ('علوم', 4), ('سيرة ذاتية', 5);

-- ---------------------------------------------------------------------------
-- 3. المؤلِّفون
-- ---------------------------------------------------------------------------
create table public.authors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  full_name  text not null default '',
  birth      integer,                                   -- سنة موجبة دائمًا
  death      integer,                                   -- سنة موجبة دائمًا
  era        text not null default 'هـ'
             check (era in ('هـ', 'م', 'ق.هـ', 'ق.م')),
  bio        text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authors_birth_positive check (birth is null or birth >= 0),
  constraint authors_death_positive check (death is null or death >= 0)
);

create unique index authors_name_key on public.authors (name);

-- التاريخ المُوحَّد للترتيب: يُحوَّل كل تقويم إلى ما يعادله هجريًّا.
-- ما قبل الهجرة والميلاد يُخزَّن موجبًا ويُحسب سالبًا هنا فقط.
create or replace function public.to_hijri_year(y integer, era text)
returns integer
language sql
immutable
as $$
  select case
    when y is null then null
    when era = 'هـ'   then y
    when era = 'ق.هـ' then -y
    when era = 'م'    then round((y - 622) * 1.030684)::integer
    when era = 'ق.م'  then round((-y - 622) * 1.030684)::integer
    else y
  end;
$$;

-- ---------------------------------------------------------------------------
-- 4. الكتب
-- ---------------------------------------------------------------------------
create table public.books (
  id             uuid primary key default gen_random_uuid(),

  -- ١. بيانات الكتاب
  title          text not null,
  subtitle       text not null default '',
  author_id      uuid references public.authors (id) on delete set null,
  author_name    text not null default '',              -- مُكرَّر للبحث والترتيب
  verifier       text not null default '',
  translator     text not null default '',
  presenter      text not null default '',
  series         text not null default '',
  series_no      text not null default '',
  category       text not null default '',
  room           text not null default '',              -- الرف داخل المكتبة

  -- ٢. بيانات النشر
  publisher      text not null default '',
  place          text not null default '',
  year           integer,                               -- سنة موجبة دائمًا
  year_era       text not null default 'م'
                 check (year_era in ('هـ', 'م', 'ق.هـ', 'ق.م')),
  edition        text not null default '',
  parts          integer,                               -- أجزاء المؤلِّف
  volumes        integer,                               -- المجلدات المادية
  volume_pages   jsonb not null default '[]'::jsonb,    -- صفحات كل مجلد
  pages          integer,
  size           text not null default '',
  isbn           text not null default '',
  language       text not null default 'العربية',

  -- ٣. النسخة وموضعها
  shelf_no       text not null default '',
  binding        text not null default '',
  condition      text not null default '',
  source         text not null default '',
  acquired_day   integer check (acquired_day between 1 and 30),
  acquired_month integer check (acquired_month between 1 and 12),
  acquired_year  integer check (acquired_year >= 0),
  value          numeric(12, 2) not null default 0,

  -- ٥. القراءة والملاحظات
  topic          text not null default '',
  tags           text[] not null default '{}',
  blurb          text not null default '',
  notes          text not null default '',
  status         text not null default 'لم تُقرأ'
                 check (status in ('لم تُقرأ', 'قيد القراءة', 'تم القراءة')),
  rating         smallint not null default 0 check (rating between 0 and 5),

  -- الصور
  cover_url      text,
  spine_images   jsonb not null default '{}'::jsonb,    -- {"1": "url", "2": "url"}
  use_spine      boolean not null default false,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint books_year_positive  check (year   is null or year   >= 0),
  constraint books_pages_positive check (pages  is null or pages  >= 0),
  constraint books_parts_positive check (parts  is null or parts  >= 0),
  constraint books_volumes_range  check (volumes is null or volumes between 1 and 200)
);

create index books_author_id_idx  on public.books (author_id);
create index books_category_idx   on public.books (category);
create index books_room_idx       on public.books (room);
create index books_status_idx     on public.books (status);
create index books_created_at_idx on public.books (created_at desc);

-- ---------------------------------------------------------------------------
-- 5. صلات الكتب: «هذا الكتاب عملٌ على …»
-- ---------------------------------------------------------------------------
create table public.book_works (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references public.books (id) on delete cascade,
  target_book_id uuid not null references public.books (id) on delete cascade,
  type           text not null check (type in (
                   'شرح', 'حاشية', 'تهذيب', 'اختصار', 'ردّ',
                   'تعليق', 'انتصار', 'فهرسة', 'انتقاء', 'استخراج')),
  created_at     timestamptz not null default now(),
  constraint book_works_not_self unique (book_id, target_book_id, type),
  constraint book_works_no_loop check (book_id <> target_book_id)
);

create index book_works_book_id_idx        on public.book_works (book_id);
create index book_works_target_book_id_idx on public.book_works (target_book_id);

-- ---------------------------------------------------------------------------
-- 6. الفوائد والمقتطفات
-- ---------------------------------------------------------------------------
create table public.perks (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.books (id) on delete cascade,
  kind       text not null check (kind in ('فائدة', 'مقتطف')),
  title      text not null,
  text       text not null,
  page       text not null default '',
  created_at timestamptz not null default now()
);

create index perks_book_id_idx on public.perks (book_id);

-- ---------------------------------------------------------------------------
-- 7. سجل الإعارة
-- ---------------------------------------------------------------------------
create table public.loans (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.books (id) on delete cascade,
  borrower   text not null,
  lent_date  date not null default current_date,
  due_date   date,
  returned   boolean not null default false,
  created_at timestamptz not null default now()
);

create index loans_book_id_idx on public.loans (book_id);

-- ---------------------------------------------------------------------------
-- 8. إعدادات المكتبة: صف واحد لا غير
-- ---------------------------------------------------------------------------
create table public.library_settings (
  id                  smallint primary key default 1 check (id = 1),

  -- المظهر والخط
  theme               text not null default 'warm'  check (theme in ('warm', 'sepia', 'dark')),
  font                text not null default 'kitab' check (font  in ('kitab', 'classic', 'modern')),
  ui_scale            smallint not null default 100 check (ui_scale between 85 and 125),
  show_status_dots    boolean not null default true,
  show_ratings        boolean not null default true,

  -- المكتبة
  default_view        text not null default 'grid' check (default_view in ('grid', 'table', 'shelf')),
  currency            text not null default 'ريال'
                      check (currency in ('ريال', 'درهم', 'دينار', 'دولار', 'يورو')),

  -- صفحة الهبوط
  landing_title       text not null default 'مكتبة سيف العشيرة',
  landing_tagline     text not null default 'فهرسٌ حيّ لكل كتابٍ في البيت',
  landing_intro       text not null default 'كل كتابٍ اقتنيناه له مكانه، وكل قراءةٍ لها أثرها. هنا فهرس المكتبة المنزلية: أرففها وتصانيفها وحكاياتها الصغيرة بين الصفحات.',
  show_landing_stats  boolean not null default true,
  show_landing_quote  boolean not null default true,
  auto_rotate         boolean not null default true,
  rotate_seconds      smallint not null default 6 check (rotate_seconds between 3 and 15),

  -- الخصوصية (§٦)
  visibility          jsonb not null default jsonb_build_object(
                        'status',    true,
                        'ratings',   true,
                        'notes',     false,
                        'blurb',     true,
                        'perks',     true,
                        'loans',     false,
                        'value',     false,
                        'stats',     true,
                        'authors',   true,
                        'advSearch', true
                      ),
  hidden_fields       text[] not null default '{}',
  hidden_categories   text[] not null default '{}',
  hidden_book_ids     uuid[] not null default '{}',

  updated_at          timestamptz not null default now()
);

insert into public.library_settings (id) values (1);

-- ---------------------------------------------------------------------------
-- 9. شرائح صفحة الهبوط
-- ---------------------------------------------------------------------------
create table public.landing_slides (
  id         uuid primary key default gen_random_uuid(),
  image_url  text,
  quote      text not null default '',
  author     text not null default '',
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

-- الشريحة الأولى: صورة أرفف المكتبة، وكلام الجاحظ في «الرسائل»
insert into public.landing_slides (image_url, quote, author, position) values (
  'assets/library-cover.jpg',
  'ولولا ما رسمت لنا الأوائل في كتبها، وخلقت من عجيب حكمها ودونت من أنواع سيرها حتى شاهدنا بها ما غاب عنا، وفتحنا بها المستغلق علينا، فجمعنا إلى قليلنا كثيرهم، وأدركنا ما لم نكن ندركه إلا بهم، لقد خس حظنا في الحكمة، وانقطع سبيلنا إلى المعرفة.
ولو ألجئنا إلى قدر قوتنا ومبلغ خواطرنا، ومنتهى تجاربنا، بما أدركته حواسنا، وشاهدته نفوسنا، لقد قلت المعرفة وقصرت الهمة وضعفت المنة، فاعتقم الرأي ومات الخاطر، وتبلد العقل، واستبد بنا سوء العادة.',
  'الجاحظ، «الرسائل» (٤/ ٢٩٧)',
  0
);

-- ---------------------------------------------------------------------------
-- 10. تحديث updated_at تلقائيًا
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_books_updated_at    before update on public.books
  for each row execute function public.set_updated_at();
create trigger set_authors_updated_at  before update on public.authors
  for each row execute function public.set_updated_at();
create trigger set_settings_updated_at before update on public.library_settings
  for each row execute function public.set_updated_at();

-- عند تغيير اسم المؤلِّف يُحدَّث الاسم المُكرَّر على كل كتبه (§١١/٥)
create or replace function public.sync_author_name()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.name is distinct from old.name then
    update public.books set author_name = new.name where author_id = new.id;
  end if;
  return new;
end;
$$;

create trigger sync_author_name_on_books after update on public.authors
  for each row execute function public.sync_author_name();

-- ---------------------------------------------------------------------------
-- 11. تفعيل RLS: الجداول كلها مغلقة، ولا يفتحها إلا صاحب المكتبة
--     (الزوار لا يملكون أي سياسة هنا، فلا وصول لهم إلى الجداول الأصلية إطلاقًا)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'authors', 'books', 'book_works', 'perks', 'loans',
    'shelves', 'categories', 'library_settings', 'landing_slides'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$
      create policy "owner_all_%1$s" on public.%1$I
        for all to authenticated
        using (public.is_owner())
        with check (public.is_owner())
    $p$, t);
  end loop;
end $$;

-- سحب أي وصول مباشر للزوار إلى الجداول الأصلية
revoke all on public.authors, public.books, public.book_works, public.perks,
               public.loans, public.shelves, public.categories,
               public.library_settings, public.landing_slides
  from anon;

-- ---------------------------------------------------------------------------
-- 12. العروض العامة: هنا تُطبَّق الخصوصية داخل قاعدة البيانات
--
--     هذه العروض مملوكة لـ postgres وبـ security_invoker = false، أي أنها
--     تقرأ الجداول متجاوزةً RLS ثم تُخرج للزائر ما سُمح له به فقط. فما أخفاه
--     صاحب المكتبة لا يغادر قاعدة البيانات أصلًا، لا أن يُخفى في المتصفح.
-- ---------------------------------------------------------------------------

-- الكتب الظاهرة للزوار: ناقصةَ المخفيّة بعينها، وناقصةَ ما كان في تصنيفٍ مخفيّ
create view public.public_books
with (security_invoker = false) as
select
  b.id,
  b.title,
  b.author_id,
  b.author_name,
  b.category,
  b.room,
  b.tags,
  b.cover_url,
  b.spine_images,
  b.use_spine,
  b.created_at,

  -- حقول تخضع لقائمة «حقول بيانات الكتاب» (§٦-ب)
  case when 'subtitle'        = any (s.hidden_fields) then '' else b.subtitle   end as subtitle,
  case when 'verifier'        = any (s.hidden_fields) then '' else b.verifier   end as verifier,
  case when 'translator'      = any (s.hidden_fields) then '' else b.translator end as translator,
  case when 'presenter'       = any (s.hidden_fields) then '' else b.presenter  end as presenter,
  case when 'series'          = any (s.hidden_fields) then '' else b.series     end as series,
  case when 'seriesNo'        = any (s.hidden_fields) then '' else b.series_no  end as series_no,
  case when 'publisher'       = any (s.hidden_fields) then '' else b.publisher  end as publisher,
  case when 'place'           = any (s.hidden_fields) then '' else b.place      end as place,
  case when 'yearLabel'       = any (s.hidden_fields) then null else b.year     end as year,
  case when 'yearLabel'       = any (s.hidden_fields) then ''  else b.year_era  end as year_era,
  case when 'edition'         = any (s.hidden_fields) then '' else b.edition    end as edition,
  case when 'parts'           = any (s.hidden_fields) then null else b.parts    end as parts,
  case when 'volumes'         = any (s.hidden_fields) then null else b.volumes  end as volumes,
  case when 'pages'           = any (s.hidden_fields) then null else b.pages    end as pages,
  case when 'volumePagesText' = any (s.hidden_fields)
       then '[]'::jsonb else b.volume_pages end                                    as volume_pages,
  case when 'size'            = any (s.hidden_fields) then '' else b.size      end as size,
  case when 'isbn'            = any (s.hidden_fields) then '' else b.isbn      end as isbn,
  case when 'language'        = any (s.hidden_fields) then '' else b.language  end as language,
  case when 'shelfNo'         = any (s.hidden_fields) then '' else b.shelf_no  end as shelf_no,
  case when 'binding'         = any (s.hidden_fields) then '' else b.binding   end as binding,
  case when 'condition'       = any (s.hidden_fields) then '' else b.condition end as condition,
  case when 'source'          = any (s.hidden_fields) then '' else b.source    end as source,
  case when 'acquired'        = any (s.hidden_fields) then null else b.acquired_day   end as acquired_day,
  case when 'acquired'        = any (s.hidden_fields) then null else b.acquired_month end as acquired_month,
  case when 'acquired'        = any (s.hidden_fields) then null else b.acquired_year  end as acquired_year,
  case when 'topic'           = any (s.hidden_fields) then '' else b.topic     end as topic,

  -- حقول تخضع لمفاتيح «ما يراه الزوار» (§٦-أ)
  case when (s.visibility ->> 'value')   = 'true' then b.value  else null end as value,
  case when (s.visibility ->> 'ratings') = 'true' then b.rating else 0    end as rating,
  case when (s.visibility ->> 'status')  = 'true' then b.status else ''   end as status,
  case when (s.visibility ->> 'blurb')   = 'true' then b.blurb  else ''   end as blurb,
  case when (s.visibility ->> 'notes')   = 'true' then b.notes  else ''   end as notes
from public.books b
cross join public.library_settings s
where s.id = 1
  and b.id <> all (s.hidden_book_ids)
  and coalesce(b.category, '') <> all (s.hidden_categories);

-- المؤلِّفون: يُخفَون كلهم حين يُطفأ مفتاح authors، ولا يظهر إلا من له كتابٌ ظاهر
create view public.public_authors
with (security_invoker = false) as
select a.id, a.name, a.full_name, a.birth, a.death, a.era, a.bio
from public.authors a
cross join public.library_settings s
where s.id = 1
  and (s.visibility ->> 'authors') = 'true'
  and exists (select 1 from public.public_books pb where pb.author_id = a.id);

create view public.public_perks
with (security_invoker = false) as
select p.id, p.book_id, p.kind, p.title, p.text, p.page, p.created_at
from public.perks p
cross join public.library_settings s
where s.id = 1
  and (s.visibility ->> 'perks') = 'true'
  and exists (select 1 from public.public_books pb where pb.id = p.book_id);

create view public.public_loans
with (security_invoker = false) as
select l.id, l.book_id, l.borrower, l.lent_date, l.due_date, l.returned
from public.loans l
cross join public.library_settings s
where s.id = 1
  and (s.visibility ->> 'loans') = 'true'
  and exists (select 1 from public.public_books pb where pb.id = l.book_id);

-- الصلات: لا تظهر إلا إذا كان طرفاها ظاهرَين للزائر
create view public.public_book_works
with (security_invoker = false) as
select w.id, w.book_id, w.target_book_id, w.type
from public.book_works w
where exists (select 1 from public.public_books pb where pb.id = w.book_id)
  and exists (select 1 from public.public_books pb where pb.id = w.target_book_id);

-- التصنيفات: بلا المخفيّ منها
create view public.public_categories
with (security_invoker = false) as
select c.id, c.name, c.position
from public.categories c
cross join public.library_settings s
where s.id = 1
  and c.name <> all (s.hidden_categories);

create view public.public_shelves
with (security_invoker = false) as
select sh.id, sh.name, sh.position from public.shelves sh;

create view public.public_landing_slides
with (security_invoker = false) as
select sl.id, sl.image_url, sl.quote, sl.author, sl.position from public.landing_slides sl;

-- الإعدادات: يقرأ الزائر ما يخصّ العرض فقط.
-- قوائم المخفيّ (hidden_fields / hidden_categories / hidden_book_ids) لا تُنشر،
-- فلا يعرف الزائر حتى أنّ هناك ما هو مخفيّ.
create view public.public_settings
with (security_invoker = false) as
select
  s.id,
  s.theme, s.font, s.ui_scale, s.show_status_dots, s.show_ratings,
  s.default_view, s.currency,
  s.landing_title, s.landing_tagline, s.landing_intro,
  s.show_landing_stats, s.show_landing_quote, s.auto_rotate, s.rotate_seconds,
  jsonb_build_object(
    'status',    s.visibility -> 'status',
    'ratings',   s.visibility -> 'ratings',
    'notes',     s.visibility -> 'notes',
    'blurb',     s.visibility -> 'blurb',
    'perks',     s.visibility -> 'perks',
    'loans',     s.visibility -> 'loans',
    'value',     s.visibility -> 'value',
    'stats',     s.visibility -> 'stats',
    'authors',   s.visibility -> 'authors',
    'advSearch', s.visibility -> 'advSearch'
  ) as visibility
from public.library_settings s
where s.id = 1;

grant select on
  public.public_books, public.public_authors, public.public_perks,
  public.public_loans, public.public_book_works, public.public_categories,
  public.public_shelves, public.public_landing_slides, public.public_settings
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 13. تخزين الصور: الأغلفة والكعوب وصور صفحة الهبوط
--     القراءة للجميع، والرفع والحذف لصاحب المكتبة وحده.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('library', 'library', true)
on conflict (id) do update set public = true;

drop policy if exists "library_public_read"   on storage.objects;
drop policy if exists "library_owner_insert"  on storage.objects;
drop policy if exists "library_owner_update"  on storage.objects;
drop policy if exists "library_owner_delete"  on storage.objects;

create policy "library_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'library');

create policy "library_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'library' and public.is_owner());

create policy "library_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'library' and public.is_owner())
  with check (bucket_id = 'library' and public.is_owner());

create policy "library_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'library' and public.is_owner());

-- ============================================================================
--  بعد التنفيذ:
--   ١. افتح الموقع، واضغط «دخول صاحب المكتبة» لإنشاء حسابك (مرة واحدة).
--   ٢. ثم أغلق التسجيل من لوحة Supabase:
--      Authentication ← Sign In / Providers ← Email ← Allow new users to sign up = off
--      (الحساب الأول وحده هو صاحب المكتبة، ومن يسجّل بعده لا يملك شيئًا،
--       لكن إغلاق التسجيل يمنع إنشاء حسابات لا لزوم لها.)
-- ============================================================================

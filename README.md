# مكتبة سيف العشيرة

موقع ثابت (Static Site) لفهرسة مكتبة منزلية شخصية، بواجهة عربية RTL بسيطة، مبني بـ React + TypeScript + Vite ومتصل بـ [Supabase](https://supabase.com) عبر `supabase-js`.

## المزايا

- تسجيل دخول بالبريد الإلكتروني وكلمة المرور (لا يوجد تسجيل عام / إنشاء حساب من الواجهة).
- عرض الكتب في جدول قابل للبحث (بالعنوان أو المؤلف) والتصفية حسب التصنيف وحالة القراءة.
- إضافة/تعديل/حذف كتاب عبر نموذج منبثق.
- حماية كاملة للبيانات عبر Row Level Security بحيث لا يصل لأي كتاب إلا صاحبه المصادَق عليه.
- نشر تلقائي على GitHub Pages عبر GitHub Actions عند كل push إلى `main`.

## 1. إعداد قاعدة بيانات Supabase

1. افتح مشروعك في Supabase → **SQL Editor**.
2. الصق محتوى الملف [`supabase/schema.sql`](./supabase/schema.sql) ونفّذه. هذا ينشئ جدول `books` ويفعّل RLS مع سياسات تسمح فقط لصاحب الصف (`auth.uid() = user_id`) بالقراءة/الكتابة، دون أي وصول لمستخدم مجهول (anon).
3. من **Authentication → Users**، أنشئ حسابك الشخصي (بريدك وكلمة مرور) يدويًا — هذا الموقع مخصص لمستخدم واحد فقط ولا يحتوي على صفحة تسجيل عام.

## 2. متغيرات البيئة (لا تُكتب المفاتيح داخل الكود)

المشروع يقرأ إعدادات الاتصال بـ Supabase من متغيرَي بيئة يستخدمهما Vite عند البناء:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
```

- للتطوير المحلي: انسخ `.env.example` إلى `.env` وضع فيه القيم الخاصة بمشروعك (ملف `.env` مُستثنى من Git عبر `.gitignore` ولن يُرفع أبدًا).
- هذه القيم هي رابط المشروع و"Publishable/Anon key" العام المخصص للاستخدام من جهة العميل — الحماية الفعلية للبيانات تأتي من سياسات RLS في قاعدة البيانات، وليس من سرّية هذا المفتاح.

## 3. تشغيل المشروع محليًا

```bash
npm install
npm run dev
```

افتح الرابط الذي يظهر في الطرفية (عادة `http://localhost:5173`) وسجّل الدخول بالحساب الذي أنشأته في الخطوة 1.

## 4. النشر على GitHub Pages

النشر يتم تلقائيًا عبر سير عمل GitHub Actions الموجود في [`/.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) عند كل push إلى فرع `main`. لتفعيله:

1. في إعدادات المستودع على GitHub: **Settings → Pages → Build and deployment → Source**، اختر **GitHub Actions**.
2. في **Settings → Secrets and variables → Actions → New repository secret** أضف السرَّين التاليين (بنفس الأسماء):
   - `SUPABASE_URL` = رابط مشروع Supabase
   - `SUPABASE_ANON_KEY` = مفتاح Publishable/Anon
3. ادفع (push) إلى فرع `main` — سيقوم سير العمل ببناء الموقع (مع حقن القيمتين أعلاه كمتغيرَي بيئة `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` أثناء البناء فقط) ونشره على GitHub Pages.

> ملاحظة: اسم المستودع مضبوط في `vite.config.ts` (`base: '/Sword-of-the-Clan/'`) ليطابق مسار GitHub Pages الافتراضي `https://<username>.github.io/Sword-of-the-Clan/`. إن غيّرت اسم المستودع، حدّث هذا المسار أيضًا.

## بنية المشروع

```
src/
  lib/
    supabaseClient.ts   # إنشاء عميل Supabase من متغيرات البيئة
    types.ts            # أنواع TypeScript لجدول الكتب
  pages/
    Login.tsx           # صفحة تسجيل الدخول
    Home.tsx            # الصفحة الرئيسية: بحث/تصفية/جدول/CRUD
  components/
    BookForm.tsx         # نموذج إضافة/تعديل كتاب
supabase/
  schema.sql             # جدول books + سياسات RLS
.github/workflows/
  deploy.yml              # بناء ونشر تلقائي على GitHub Pages
```

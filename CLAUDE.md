# مكتبة سيف العشيرة — سياق المشروع

فهرس مكتبة منزلية شخصية بواجهة عربية RTL. المالك مستخدم واحد، والزوّار
يتصفّحون بلا حساب. لغة العمل في هذا المستودع العربية: التعليقات ورسائل
الواجهة والتوثيق بالعربية، وأسماء المعرّفات بالإنجليزية.

## المكدّس والنشر

React 18 + TypeScript + Vite، و[Supabase](https://supabase.com) للقاعدة
والمصادقة والتخزين. الموقع حيّ على GitHub Pages:
<https://i-o-i-u.github.io/Sword-of-the-Clan/>، يُبنى وينشر تلقائيًّا من
`.github/workflows/deploy.yml` عند كل دفع إلى `main`، والمفتاحان في أسرار
المستودع (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

للتشغيل محليًّا يلزم ملف `.env` غير محفوظ في جِت — انسخ `.env.example` واملأه.

```bash
npm install
npm run dev      # vite على 5173
npm run build    # tsc -b && vite build
```

## بنية الشيفرة

- `src/lib/library.tsx` — حالة المكتبة كلها في سياق واحد: الدور والبيانات
  والإعدادات. كل شيء يمرّ من هنا.
- `src/lib/api.ts` — **الحدّ الوحيد مع Supabase للبيانات** (٣٣ دالة).
- `src/lib/router.ts` — موجِّه بالتجزئة (`#/browse`, `#/book/:id`, `#/authors`,
  `#/author/:id`, `#/add`, `#/stats`). بالتجزئة لأن Pages لا يعيد كتابة المسارات.
- `src/views/` — الصفحات: `Landing`, `Browse`, `BookDetail`, `Authors`,
  `AddBook`, `Stats`.
- `src/components/` — `Header`, وطبقات `LoginOverlay` و`SearchOverlay`
  و`SettingsOverlay`, و`ui.tsx` (عناصر مشتركة), و`HijriDatePicker`, `ImageSlot`.
- `src/lib/` — `theme.ts` (ثلاثة مظاهر وثلاثة خطوط), `search.ts` (تطبيع عربي),
  `hijri.ts`, `types.ts`, `useScrollLock.ts`.
- `supabase/schema.sql` — المخطّط كاملًا: `library_owner`, `books`, `authors`,
  `book_works`, `perks`, `loans`, `shelves`, `categories`, `library_settings`,
  `landing_slides`.

## اصطلاحات ثابتة

- **حقول البيانات `snake_case`** مطابقةً لأعمدة Postgres (`author_id`,
  `series_no`, `year_era`) — لا `camelCase`.
- **النصوص العربية في `types.ts` هي نصوص الإنتاج نفسها**، مطابقة لوثيقة
  التسليم: لا تُترجم ولا يُعاد صوغها. ومنها `STATUSES`
  («لم تُقرأ» / «قيد القراءة» / «تم القراءة») و`ERAS` و`WORK_TYPES` وغيرها.
- التعديل يُطبَّق محليًّا أوّلًا ثم يُحفظ، فإن أخفق الحفظ ظهرت رسالة وأُعيد
  التحميل من المصدر.

## قرارات لها سبب — لا تعكسها بلا نقاش

- **`api.ts` هو الحدّ الوحيد مع Supabase**: لا تستورد `supabaseClient` في ملف
  جديد. خارج `api.ts` لا يمسّ Supabase إلا `LoginOverlay.tsx` و`library.tsx`
  للجلسة وحدها. هذا الحدّ النظيف هو ما يجعل تبديل الخلفية لاحقًا نقلًا لملف
  واحد لا إعادة بناء.
- **الموجِّه بالتجزئة لا بالمسار**: شرطُ النشر الثابت على Pages.
- **`base` في `vite.config.ts` = `/Sword-of-the-Clan/` عند البناء فقط**، `/`
  في التطوير. تغييره يكسر مسارات الأصول على Pages.
- **خطّ `Kitab` اختياري**: `theme.ts` يشير إلى `public/fonts/Kitab-Regular.ttf`
  وهو غير موجود في المستودع، فيتراجع إلى Amiri ثم serif. الـ404 في الطرفية
  متوقَّع، وليس عطلًا.

## تاريخ يمنع اللبس

جرت في ١٢ أغسطس ٢٠٢٦ محاولة هجرة إلى Convex في فرع منفصل. تفرّعت من جذر
المشروع لا من هذا العمل، فهاجرت نسخةً أقدم ذات جدول واحد وأسقطت الواجهة
كلها، ولم تُشغَّل قطّ. حُفظت في الوسم `convex-attempt` ثم حُذف فرعها، وصار
المستودع فرعًا واحدًا `main`.

الدافع إليها كان حقيقيًّا: أربعة من آخر خمسة التزامات هنا كانت إطفاء حرائق
في `GRANT` و`RLS` والمصادقة، وهو عبء ثقيل لمكتبة مستخدمها واحد. فإن عاد ذلك
الوجع فالهجرة واردة، لكن **نقلًا لطبقة `api.ts`** لا إعادة بناء للتطبيق.

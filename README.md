# مكتبة سيف العشيرة

فهرس مكتبة منزلية شخصية، بواجهة عربية RTL، مبني بـ React + TypeScript + Vite، وقاعدة بياناته ودوالّه على [Convex](https://convex.dev).

## المزايا

- تسجيل دخول بالبريد وكلمة المرور لمستخدم واحد (لا تسجيل عام؛ أيّ بريد غير بريد المالك يُرفض من الخادم).
- عرض الكتب في جدول قابل للبحث (بالعنوان أو المؤلف) والتصفية حسب التصنيف وحالة القراءة.
- إضافة/تعديل/حذف كتاب عبر نموذج منبثق، والجدول يتحدّث تلقائيًّا — استعلامات Convex تفاعليّة، بلا إعادة تحميل يدويّة.
- الصلاحيات في دوال الخادم نفسها: كل قراءة وكتابة تتحقّق من هوية المستخدم وملكيّته للصفّ.

## 1. إعداد Convex

```bash
npm install
npx convex dev
```

أوّل تشغيل يفتح المتصفح لتسجيل الدخول إلى Convex، ينشئ المشروع، يكتب `CONVEX_DEPLOYMENT` و`VITE_CONVEX_URL` في `.env.local`، ويولّد `convex/_generated/` (بدونه لا يمرّ فحص الأنواع). أبقِ الأمر يعمل أثناء التطوير: يراقب مجلّد `convex/` ويدفع أي تعديل فورًا.

### تهيئة المصادقة

```bash
npx @convex-dev/auth          # يولّد مفاتيح JWT ويضبطها على النشر
npx convex env set OWNER_EMAIL you@example.com
```

`OWNER_EMAIL` هو صمّام الأمان: `convex/auth.ts` يرفض أي بريد سواه في كل مسارات المصادقة، فلا يستطيع أحد إنشاء حساب على مكتبتك.

### إنشاء حسابك

الموقع لا يعرض شاشة تسجيل. لإنشاء حسابك أوّل مرّة: في `src/pages/Login.tsx` غيّر `flow: 'signIn'` إلى `flow: 'signUp'` مؤقّتًا، شغّل الموقع محليًّا، وسجّل الدخول ببريدك (نفسه المضبوط في `OWNER_EMAIL`) وكلمة مرور من ثمانية محارف فأكثر، ثم أعد القيمة إلى `'signIn'`. لن يفلح هذا مع أي بريد آخر: الخادم يرفضه.

## 2. التشغيل محليًّا

في طرفيتين متوازيتين:

```bash
npm run dev:backend    # convex dev — يراقب دوال الخادم
npm run dev            # vite — الواجهة على http://localhost:5173
```

## 3. ترحيل الكتب من Supabase

النسخة السابقة كانت على Supabase. لنقل الكتب:

1. في Supabase → **SQL Editor** نفّذ:

   ```sql
   select json_agg(t) from public.books t;
   ```

   واحفظ الناتج في ملف، مثلًا `books.json`.

2. سجّل الدخول إلى الموقع مرّة واحدة (حتى يوجد صفّ المستخدم في Convex).

3. نفّذ الاستيراد:

   ```bash
   npx convex run migrate:importBooks "$(node scripts/supabase-to-convex.mjs books.json you@example.com)"
   ```

السكربت يحوّل أسماء الحقول من `snake_case` إلى `camelCase`، ويُسقط الحقول الفارغة، وينبّه على أي حالة قراءة غير معروفة. ودالة الاستيراد ترفض العمل إن كانت المكتبة غير فارغة، حتى لا تتضاعف الكتب بتنفيذ مكرّر (مرّر `force: true` لتجاوز ذلك عمدًا).

## 4. النشر

النشر تلقائي عبر [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) عند كل push إلى `main`:

1. من لوحة Convex → **Settings → Deploy keys**، أنشئ مفتاح نشر إنتاجي.
2. في GitHub: **Settings → Secrets and variables → Actions**، أضف `CONVEX_DEPLOY_KEY`.
3. في **Settings → Pages → Source** اختر **GitHub Actions**.

`npx convex deploy --cmd 'npm run build'` ينشر دوال الخادم أوّلًا ثم يبني الواجهة مع `VITE_CONVEX_URL` الصحيح تلقائيًّا.

> ملاحظة: `vite.config.ts` يضبط `base: '/Sword-of-the-Clan/'` ليطابق مسار GitHub Pages. إن كان النشر الفعليّ على Firebase Hosting في الجذر، غيّر القيمة إلى `'/'` وإلا فشلت مسارات الأصول.

## بنية المشروع

```
convex/
  schema.ts        # جدول books + جداول المصادقة
  constants.ts     # حالات القراءة وحقول الكتاب (مشتركة مع الواجهة)
  auth.ts          # مزوّد كلمة المرور، مقصور على OWNER_EMAIL
  auth.config.ts   # إعداد موفّر الهوية
  http.ts          # مسارات HTTP التي تحتاجها المصادقة
  books.ts         # list / add / update / remove
  users.ts         # بيانات المستخدم الحالي
  migrate.ts       # استيراد لمرّة واحدة من تصدير Supabase
src/
  lib/types.ts     # أنواع مشتقّة من مخطط Convex
  lib/errors.ts    # استخراج رسالة الخطأ
  pages/Login.tsx  # شاشة الدخول
  pages/Home.tsx   # البحث والتصفية والجدول والعمليات
  components/BookForm.tsx
scripts/
  supabase-to-convex.mjs
```

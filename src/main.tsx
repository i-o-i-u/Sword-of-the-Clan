import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { convex } from './lib/convexClient'
import { LibraryProvider } from './lib/library'
import './styles.css'

// ConvexAuthProvider يضبط هويّة الجلسة على العميل نفسه الذي تستعمله api.ts،
// فتمرّ نداءاتها مصادَقةً وإن لم تُكتب داخل مكوِّن React.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* الحدُّ خارج المزوِّدات جميعًا: استثناءٌ في أحدها يُمسَك كما يُمسَك ما
        في الصفحات، فلا تبقى شاشةٌ بيضاء بلا خبرٍ في حالٍ من الأحوال. */}
    <ErrorBoundary>
      {/* جلسةُ صاحب المكتبة تموت بإغلاق اللسان أو المتصفّح — قرارٌ صريح منه.
          و`sessionStorage` هو ما يُحقّقه: الرمزُ يبقى ما دام اللسان مفتوحًا
          فلا يُخرجه تحديثُ الصفحة، ويسقط بإغلاقه فيلزمه دخولٌ جديد. وحفظُ
          تعديلاته لا يُمسّ: هي محفوظةٌ في القاعدة ساعةَ أُجريت.
          وفيه فائدةٌ ثانية: لم يعُد ثمّة رمزٌ قديم يُجدَّد عند أوّل حمل. */}
      <ConvexAuthProvider client={convex} storage={sessionStorage}>
        <LibraryProvider>
          <App />
        </LibraryProvider>
      </ConvexAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

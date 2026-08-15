// حدُّ الخطأ.
//
// استثناءٌ واحدٌ في أثناء الرسم يُسقط شجرةَ React كلَّها، فتبقى الصفحة بيضاء
// بلون الموقع لا كلمةَ فيها ولا سبيلَ إلى معرفة ما جرى. وقد وقع ذلك فعلًا:
// حقلٌ اختياريٌّ غائبٌ عن مستندٍ قديم رمى استثناءً في شارةِ الفهرسة، وهي
// لصاحب المكتبة وحده — فكانت صفحةُ التصفُّح تُمحى عليه دون الزائر بلا خبر.
//
// فليكن للخطأ وجهٌ يُقرأ: نصٌّ عربيٌّ يقول إن العطب في الموقع لا في الشبكة،
// ورسالةُ الاستثناء نفسها كي تُنقل إلى من يُصلحها، وزرٌّ يُعيد التحميل.

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { message: string | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error)
    return { message }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // سجلُّ المتصفّح يبقى مفصَّلًا لمن يفتحه، والشاشةُ تكتفي بالرسالة
    console.error('انقطع الرسم باستثناء:', error, info.componentStack)
  }

  render() {
    if (this.state.message === null) return this.props.children

    // إخفاقُ جلبِ قطعةٍ ليس عطبًا في الشيفرة، فلا يُقال للقارئ إنه خلل:
    // إمّا نشرةٌ جديدة نزلت وصفحتُه مفتوحةٌ بالسابقة، وإمّا انقطاعُ شبكة.
    // وفي الحالين إعادةُ التحميل هي الدواء، وهي تحت يده في الزرّ.
    const chunk = /dynamically imported module|Importing a module script failed|Failed to fetch/i
      .test(this.state.message)

    return (
      <div
        role="alert"
        style={{
          maxWidth: 640, margin: '80px auto', padding: '28px 26px',
          background: 'var(--surface)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 14,
          textAlign: 'center', lineHeight: 1.9,
        }}
      >
        <h2 style={{ margin: '0 0 10px', fontSize: 19 }}>
          {chunk ? 'تعذّر جلبُ جزءٍ من الموقع' : 'تعذّر عرضُ هذه الصفحة'}
        </h2>

        <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: 14 }}>
          {chunk
            ? 'انقطع طلبٌ في الطريق — إمّا لأن نشرةً جديدة نزلت وهذه الصفحة '
              + 'مفتوحةٌ منذ ما قبلها، وإمّا لانقطاعةِ شبكةٍ عابرة. وإعادةُ '
              + 'التحميل تكفي، وما في المكتبة سليمٌ كما هو.'
            : 'وقع خللٌ في الموقع نفسه، لا في اتّصالك ولا في بياناتك — وما في '
              + 'المكتبة سليمٌ كما هو.'}
        </p>

        <pre
          style={{
            margin: '0 0 20px', padding: '10px 12px', overflowX: 'auto',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 12, direction: 'ltr', textAlign: 'left',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}
        >
          {this.state.message}
        </pre>

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '9px 22px', fontSize: 14, fontFamily: 'inherit',
            color: 'var(--surface)', background: 'var(--accent)',
            border: 'none', borderRadius: 9, cursor: 'pointer',
          }}
        >
          إعادة التحميل
        </button>
      </div>
    )
  }
}

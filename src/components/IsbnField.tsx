// حقل الردمك في نموذج الكتاب.
//
// الردمك رقمٌ معياريٌّ لا نصٌّ حرّ، فيُعامَل معاملةَ الأرقام: تُدخَل شرطاتُه
// تلقائيًّا مع الكتابة على مواضعها من المعيار، وتُقرأ منه مجموعةُ التسجيل
// فيُقال بلدُها، وتُحسب خانةُ التحقُّق فيُعلَم أَصَحَّ الرقمُ أم حُرِّف فيه
// رقم. وحسابُه كلُّه في `lib/isbn.ts` بلا نداءٍ خارجيّ.
//
// والحكمُ خبرٌ لا حاجز: الرقمُ المُحرَّف يُحفظ كما كُتب — قد يكون الخطأ في
// الكتاب نفسه مطبوعًا على ظهره، وليس للفهرس أن يُصحِّح المطبوع — وإنما
// يُنبَّه عليه.

import { isbnInfo } from '../lib/isbn'
import { CheckIcon, InfoIcon, GlobeIcon } from './ui'

interface Props {
  value: string
  onChange: (next: string) => void
  style: React.CSSProperties
}

export default function IsbnField({ value, onChange, style }: Props) {
  const info = isbnInfo(value)

  return (
    <>
      <input
        value={info.formatted}
        onChange={(e) => onChange(isbnInfo(e.target.value).formatted)}
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder="978-…"
        aria-describedby="isbn-note"
        style={{
          ...style,
          letterSpacing: '0.6px',
          borderColor: info.state === 'خطأ' ? 'var(--danger)' : style.borderColor,
        }}
      />

      <div id="isbn-note" className="isbn-note" aria-live="polite">
        {info.state === 'صحيح' && (
          <span className="isbn-flag isbn-flag-ok">
            <CheckIcon size={12} />
            ردمكٌ صحيح
          </span>
        )}

        {info.state === 'خطأ' && (
          <span className="isbn-flag isbn-flag-bad">
            <InfoIcon size={12} />
            {/* السببُ يُقال صراحةً: «غير صحيح» وحدَها لا تدلّ على موضع الخلل */}
            {info.digits.length === 10 || info.digits.length === 13
              ? `خانةُ التحقُّق لا تطابق الرقم — صوابُها ${info.expected}`
              : 'رقمٌ غير معروف'}
          </span>
        )}

        {info.state === 'ناقص' && info.digits.length > 0 && (
          <span className="isbn-flag">
            بقيت {13 - info.digits.length > 3 ? `${13 - info.digits.length} خانات` : 'خاناتٌ'} —
            الردمك ١٣ خانةً أو ١٠
          </span>
        )}

        {info.country && (
          <span className="isbn-flag">
            <GlobeIcon size={12} />
            {info.country}
          </span>
        )}

        {/* العشاريُّ لا يُرَدّ: كتبُ ما قبل ٢٠٠٧ لا تحمل غيرَه، وإنما يُعرض
            مقابلُه ليأخذه صاحبُ المكتبة إن شاء */}
        {info.as13 && (
          <button
            type="button"
            className="isbn-swap"
            onClick={() => onChange(info.as13)}
            title="الردمك العشاريّ يقابله ثلاثيَّ عشرَ هذا الرقم"
          >
            حوِّله إلى <span dir="ltr">{info.as13}</span>
          </button>
        )}
      </div>
    </>
  )
}

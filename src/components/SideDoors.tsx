// مداخلُ الصفحات التي لا تُعرض في الرأس: المحقِّقون ونحوهم، والسلاسل،
// والمتون الدرسية، والفوائد.
//
// ولا تُعرض في الرأس أبدًا: الرأسُ للطريق الذي يسلكه كل زائر — الهبوطُ
// والتصفُّح — وهذه صفحاتٌ يُقصَد إليها قصدًا. فمدخلُها من داخل «تصفُّح
// المكتبة» إلى جانب الحاسبة، ومن «عن المكتبة» تحت الإحصاءات.
//
// وهي قطعةٌ واحدة في الموضعين كي لا يفترق الاسمُ والأيقونة بينهما.

import { navigate, type Route } from '../lib/router'
import { PerkIcon, ScrollIcon, SeriesIcon, VerifyIcon } from './ui'

const DOORS: { route: Route; label: string; icon: (p: { size?: number }) => JSX.Element }[] = [
  { route: { name: 'people' }, label: 'المُحقِّقون ونحوهم', icon: VerifyIcon },
  { route: { name: 'series' }, label: 'السَّلاسل',           icon: SeriesIcon },
  { route: { name: 'matns' },  label: 'المُتُون الدَّرْسيَّة',    icon: ScrollIcon },
  { route: { name: 'perks' },  label: 'الفوائد والمقتطفات', icon: PerkIcon },
]

/**
 * `className` يجعل الأزرار تتّسق بموضعها: في التصفُّح هي ألواحٌ كالحاسبة
 * (`side-tool`)، وفي «عن المكتبة» أزرارٌ عريضة (`about-door`).
 */
export default function SideDoors({ className }: { className: string }) {
  return (
    <>
      {DOORS.map(({ route, label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          className={className}
          onClick={() => navigate(route)}
          title={label}
        >
          <Icon size={19} />
          <span>{label}</span>
        </button>
      ))}
    </>
  )
}

// مداخلُ الصفحات التي لا تُعرض في الرأس: المحقِّقون ونحوهم، والسلاسل،
// والمتون الدرسية، والفوائد.
//
// ولا تُعرض في الرأس أبدًا: الرأسُ للطريق الذي يسلكه كل زائر — الهبوطُ
// والتصفُّح — وهذه صفحاتٌ يُقصَد إليها قصدًا. فمدخلُها من داخل «تصفُّح
// المكتبة» إلى جانب الحاسبة، ومن «عن المكتبة» تحت الإحصاءات.
//
// وهي قطعةٌ واحدة في الموضعين كي لا يفترق الاسمُ والأيقونة بينهما.

import { useLibrary } from '../lib/library'
import { linkTo, type Route } from '../lib/router'
import { PerkIcon, ScrollIcon, SeriesIcon, VerifyIcon } from './ui'

type Gate = 'authors' | 'perks' | null

const DOORS: { route: Route; label: string; gate: Gate; icon: (p: { size?: number }) => JSX.Element }[] = [
  { route: { name: 'people' }, label: 'المُحقِّقون ونحوهم', gate: 'authors', icon: VerifyIcon },
  { route: { name: 'series' }, label: 'السَّلاسل',           gate: null, icon: SeriesIcon },
  { route: { name: 'matns' },  label: 'المُتُون الدَّرْسيَّة',    gate: null, icon: ScrollIcon },
  { route: { name: 'perks' },  label: 'الفوائد والمقتطفات', gate: 'perks', icon: PerkIcon },
]

/**
 * `className` يجعل الأزرار تتّسق بموضعها: في التصفُّح هي ألواحٌ كالحاسبة
 * (`side-tool`)، وفي «عن المكتبة» أزرارٌ عريضة (`about-door`).
 */
export default function SideDoors({ className }: { className: string }) {
  const { isOwner, settings } = useLibrary()
  // وما حُجب عن الزائر من الأبواب لا يُعرض له: بابٌ لا يُفتح ليس بابًا
  const open = (gate: Gate) => !gate || isOwner || settings.visibility[gate]
  return (
    <>
      {DOORS.filter((d) => open(d.gate)).map(({ route, label, icon: Icon }) => (
        // روابطُ لا أزرار: تُفتح في لسانٍ جديد، ويُنسخ عنوانُها
        <a key={label} className={className} {...linkTo(route)} title={label}>
          <Icon size={19} />
          <span>{label}</span>
        </a>
      ))}
    </>
  )
}

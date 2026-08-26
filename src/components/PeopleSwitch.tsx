// مِفتاحُ التنقُّل بين سجلَّي الأشخاص: «مؤلِّفو المكتبة» و«المحقِّقون ونحوهم».
//
// السجلُّ واحد — جدولُ `authors` — وإنما هما وجهان منه: من له تأليفٌ في
// الأولى، ومن له عملٌ بصفةٍ في الثانية، ويجتمعان فيمن جمعهما. فالانتقالُ
// بينهما مقصودٌ كثيرًا، وكان لا يُبلَغ إلا من مدخل «تصفُّح المكتبة».
//
// وهو قطعةٌ واحدة في الصفحتين كي لا يفترق الاسمُ ولا الترتيب.

import { navigate, type Route } from '../lib/router'
import { OwnerIcon, VerifyIcon } from './ui'

const FACES: { route: Route; label: string; icon: (p: { size?: number }) => JSX.Element }[] = [
  { route: { name: 'authors' }, label: 'مؤلِّفو المكتبة', icon: OwnerIcon },
  { route: { name: 'people' }, label: 'المُحقِّقون ونحوهم', icon: VerifyIcon },
]

export default function PeopleSwitch({ here }: { here: 'authors' | 'people' }) {
  return (
    <nav className="people-switch" aria-label="سجلّا الأشخاص">
      {FACES.map(({ route, label, icon: Icon }) => {
        const on = route.name === here
        return (
          <button
            key={label}
            type="button"
            className={on ? 'people-switch-btn people-switch-on' : 'people-switch-btn'}
            aria-current={on}
            onClick={() => { if (!on) navigate(route) }}
          >
            <Icon size={15} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

// أدوات صاحب المكتبة: اسمُه، ووضعُ التصفُّح فقط، والخروج.
//
// وموضعُها **ليس الترويسة**: الترويسةُ طريقُ الزائر، وهذه أدواتُ صاحبِ
// البيت لا شأن للزائر بها — وكانت تزاحم التبويباتِ فيها فيضيق العرضُ على
// المكتبة كلِّها من أجل ثلاثة أزرارٍ لا يراها إلا واحد.
//
// فلها موضعان لا ثالثَ لهما، والقطعةُ واحدة فيهما كي لا يفترق اسمٌ ولا
// سلوك:
//   • في صفحة الهبوط: عمودٌ في فراغها عن يمين اللوحة (`owner-nook`).
//   • فيما سواها: لوحٌ صغيرٌ مثبَّتٌ في زاوية الشاشة السفلى (`owner-dock`)،
//     يُطوى إلى قرصٍ صغير حتى يُطلب — فلا يشغل من الصفحة إلا موضعَ إبهام.

import { useState } from 'react'
import { useLibrary } from '../lib/library'
import { ExitIcon, EyeIcon, OwnerIcon } from './ui'

/**
 * `place` يحدّد الهيئة لا السلوك: في الهبوط تُعرض مبسوطةً لأن في الصفحة
 * فراغًا لها، وفيما سواها تُطوى.
 */
export default function OwnerTools({ place }: { place: 'nook' | 'dock' }) {
  const { isOwner, ownerName, browseOnly, toggleBrowseOnly, signOut } = useLibrary()
  const [open, setOpen] = useState(false)

  if (!isOwner) return null

  const nook = place === 'nook'
  const shown = nook || open

  return (
    <div className={nook ? 'owner-nook' : 'owner-dock'}>
      {/* في الزاوية: قرصٌ يُفتح ويُغلق. وفي الهبوط: اسمٌ لا يُضغط. */}
      {nook ? (
        <span className="owner-nook-name">
          <OwnerIcon size={16} />
          {ownerName}
        </span>
      ) : (
        <button
          type="button"
          className={open ? 'owner-dock-tab owner-dock-tab-on' : 'owner-dock-tab'}
          onClick={() => setOpen((v) => !v)}
          title={open ? 'إخفاء أدوات صاحب المكتبة' : ownerName}
          aria-expanded={open}
        >
          <OwnerIcon size={16} />
          <span>{ownerName}</span>
        </button>
      )}

      {shown && (
        <>
          <button
            type="button"
            className="owner-nook-btn"
            onClick={toggleBrowseOnly}
            style={{
              borderColor: browseOnly ? 'var(--accent)' : 'var(--border)',
              background: browseOnly ? 'color-mix(in oklch, var(--accent) 10%, transparent)' : 'none',
            }}
          >
            <EyeIcon size={16} />
            {browseOnly ? 'إظهار أدوات التعديل' : 'وضع التصفُّح فقط'}
          </button>
          <button type="button" className="owner-nook-btn" onClick={() => void signOut()}>
            <ExitIcon size={16} />
            خروج
          </button>
        </>
      )}
    </div>
  )
}

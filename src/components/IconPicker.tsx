// منتقي الأيقونة: يُفتح من كل صفٍّ في أنواع الفوائد وتصنيفاتها، فيختار
// صاحبُ المكتبة رمزَ النوع أو الباب من مكتبة الأيقونات (`lib/icons.tsx`).
//
// وهي مئةٌ وعشرون أيقونة، فلا تُعرض في شبكةٍ واحدة: تُطلب ببابها أو باسمها.
// والبحثُ بمعيار البحث في المكتبة نفسه — بلا تشكيلٍ ولا تفريقٍ بين الهمزات
// — فمن كتب «اسطرلاب» بلغ «إسطرلاب».

import { useMemo, useState } from 'react'
import { ICONS, ICON_GROUPS, Icon } from '../lib/icons'
import { QUICK_OPTS, normalizeText } from '../lib/search'
import { ClearIcon, CloseButton, Overlay, SearchIcon, chipStyle } from './ui'

/**
 * زرُّ الأيقونة في الصفّ: يعرض المختارة ويفتح المُنتقي. وما لا أيقونةَ له
 * يُعرض دائرةً منقوطة — موضعٌ شاغر يُنادي على من يملؤه.
 */
export function IconChoice(
  { value, onChange, label }: { value: string; onChange: (key: string) => void; label: string },
) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={value ? 'icon-choice icon-choice-on' : 'icon-choice'}
        onClick={() => setOpen(true)}
        title={`${label} — اختر أيقونة`}
        aria-label={`${label} — اختر أيقونة`}
      >
        <Icon name={value} size={19} />
      </button>
      {open && (
        <IconPicker
          value={value}
          onPick={(key) => { onChange(key); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export default function IconPicker(
  { value, onPick, onClose }: {
    value: string
    onPick: (key: string) => void
    onClose: () => void
  },
) {
  const [group, setGroup] = useState<string>('')
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const needle = normalizeText(query.trim(), QUICK_OPTS)
    return ICONS.filter((i) => {
      if (group && i.group !== group) return false
      if (!needle) return true
      return normalizeText(`${i.label} ${i.group}`, QUICK_OPTS).includes(needle)
    })
  }, [group, query])

  return (
    <Overlay onClose={onClose} align="flex-start">
      <div className="icon-picker overlay-sheet">
        <header className="perk-editor-head">
          <h2>اختر أيقونة</h2>
          <CloseButton onClose={onClose} />
        </header>

        <div className="icon-picker-body thin-scroll">
          <div className="perks-search icon-picker-search">
            <SearchIcon size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن أيقونة: «ميزان»، «مصحف»، «شجرة»…"
              aria-label="ابحث عن أيقونة"
              autoFocus
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="امسح البحث">
                <ClearIcon size={14} />
              </button>
            )}
          </div>

          <div className="icon-picker-groups">
            <button type="button" onClick={() => setGroup('')} style={chipStyle(!group)}>
              الكلّ
            </button>
            {ICON_GROUPS.map((g) => (
              <button key={g} type="button" onClick={() => setGroup(g)} style={chipStyle(group === g)}>
                {g}
              </button>
            ))}
          </div>

          <div className="icon-grid">
            {/* ورفعُ الأيقونة خيارٌ قائم: بابٌ بلا رمزٍ خيرٌ من رمزٍ لا يدلّ عليه */}
            <button
              type="button"
              className={value ? 'icon-cell' : 'icon-cell icon-cell-on'}
              onClick={() => onPick('')}
              title="بلا أيقونة"
            >
              <ClearIcon size={18} />
              <span>بلا أيقونة</span>
            </button>

            {shown.map((def) => (
              <button
                key={def.key}
                type="button"
                className={def.key === value ? 'icon-cell icon-cell-on' : 'icon-cell'}
                onClick={() => onPick(def.key)}
                title={def.label}
              >
                <Icon name={def.key} size={24} />
                <span>{def.label}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 && (
            <p className="perk-hint">لا أيقونةَ بهذا الاسم. جرِّب كلمةً أعمّ.</p>
          )}
        </div>
      </div>
    </Overlay>
  )
}

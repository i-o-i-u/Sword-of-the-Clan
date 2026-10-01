// منتقي الأيقونة: يُفتح من كل صفٍّ في إعدادات الفوائد ومن صفحة الكرّاسة،
// فيختار صاحبُ المكتبة رمزَ النوع أو الباب أو العَلَم أو الكرّاسة من مكتبة
// الأيقونات (`lib/icons.tsx`).
//
// وهي مئةٌ وثمانون أيقونة، فلا تُعرض في شبكةٍ واحدة: تُطلب ببابها أو باسمها.
// والبحثُ بمعيار البحث في المكتبة نفسه — بلا تشكيلٍ ولا تفريقٍ بين الهمزات،
// والكلماتُ على أيّ ترتيب — ويشمل أسماءها الأخرى (`alt`): من كتب «حصان» بلغ
// «فرس»، ومن كتب «اسطرلاب» بلغ «إسطرلاب».
//
// **وهي ثلاثةُ أثلاث كسائر النوافذ**: صدرٌ فيه المختارةُ الآن، فشريطٌ ثابتٌ فيه
// البحثُ والأبواب، فجوفٌ يُمرَّر، فذيلٌ خارج الجوف. وكان الشريطُ في الجوف لاصقًا
// وحقلُ البحث فيه يرث `flex: 1 1 260px` من صنف البحث الصغير — وهو صفٌّ في
// موضعه ذاك، وعمودٌ ههنا — فصار أساسُه **طولًا** لا عرضًا، فقام الحقلُ صندوقًا
// يأكل نصفَ النافذة. وصارت الأبوابُ شريطًا واحدًا يُمرَّر أفقيًّا لا سطرين.

import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { ICONS, ICON_GROUPS, Icon, iconByKey, type IconDef } from '../lib/icons'
import { QUICK_OPTS, normalizeText } from '../lib/search'
import { CheckIcon, ClearIcon, CloseButton, Overlay, SearchIcon } from './ui'

/** لونُ الأيقونة متغيّرًا في الأنماط، تُصبَغ به أرضُ خليّتها */
const toneVar = (def: IconDef | undefined) =>
  ({ '--tone': def ? `var(--ic-${def.tone})` : 'var(--muted)' }) as CSSProperties

/**
 * زرُّ الأيقونة في الصفّ: يعرض المختارةَ على أرضٍ من لونها ويفتح المُنتقي.
 * وما لا أيقونةَ له يُعرض دائرةً منقوطة — موضعٌ شاغر يُنادي على من يملؤه.
 */
export function IconChoice(
  { value, onChange, label, size = 'md' }: {
    value: string
    onChange: (key: string) => void
    /** ما تُختار له الأيقونة: «النوع»، «تصنيف التفسير»… */
    label: string
    size?: 'sm' | 'md'
  },
) {
  const [open, setOpen] = useState(false)
  const def = iconByKey(value)
  const title = def ? `${label} — ${def.label}. اضغط لتغييرها` : `${label} — اختر أيقونة`
  return (
    <>
      <button
        type="button"
        className={`kn-ic-choice kn-ic-choice-${size}${def ? ' on' : ''}`}
        style={toneVar(def)}
        onClick={() => setOpen(true)}
        title={title}
        aria-label={title}
      >
        <Icon name={value} size={size === 'sm' ? 18 : 22} placeholder />
      </button>
      {open && (
        <IconPicker
          value={value}
          label={label}
          onPick={(key) => { onChange(key); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

/** نصُّ البحث في كل أيقونة، مُطبَّعًا مرّةً واحدة */
const SEARCH_TEXT = new Map(
  ICONS.map((i) => [i.key, normalizeText(`${i.label} ${i.alt ?? ''} ${i.group}`, QUICK_OPTS)]),
)

export default function IconPicker(
  { value, label, onPick, onClose }: {
    value: string
    /** ما تُختار له، يُكتب في صدر النافذة */
    label?: string
    onPick: (key: string) => void
    onClose: () => void
  },
) {
  const [group, setGroup] = useState<string>('')
  const [query, setQuery] = useState('')
  const body = useRef<HTMLDivElement>(null)
  const current = iconByKey(value)

  /** ما يطابق البحث، قبل ترشيح الباب — منه تُعدّ الأبواب */
  const matched = useMemo(() => {
    const words = normalizeText(query.trim(), QUICK_OPTS).split(/\s+/).filter(Boolean)
    if (words.length === 0) return ICONS
    return ICONS.filter((i) => {
      const text = SEARCH_TEXT.get(i.key) ?? ''
      return words.every((w) => text.includes(w))
    })
  }, [query])

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of matched) m.set(i.group, (m.get(i.group) ?? 0) + 1)
    return m
  }, [matched])

  /** المعروضُ مقسومًا على أبوابه، وما خلا منها بابٌ لا يُعرض له صدر */
  const sections = useMemo(
    () => ICON_GROUPS
      .filter((name) => !group || name === group)
      .map((name) => ({ name, items: matched.filter((i) => i.group === name) }))
      .filter((s) => s.items.length > 0),
    [matched, group],
  )
  const shown = sections.reduce((n, s) => n + s.items.length, 0)

  const choose = (g: string) => {
    setGroup(g)
    body.current?.scrollTo({ top: 0 })
  }

  return (
    <Overlay onClose={onClose} align="flex-start" label="اختيار أيقونة">
      <div className="kn-ip overlay-sheet">
        <header className="kn-editor-head">
          <span className={current ? 'kn-ip-now on' : 'kn-ip-now'} style={toneVar(current)}>
            <Icon name={value} size={26} placeholder />
          </span>
          <div>
            <h2>اختر أيقونة{label ? <span className="kn-ip-for"> {label}</span> : null}</h2>
            <p className="kn-editor-sub">
              {current ? <>المختارةُ الآن: <b>{current.label}</b></> : 'لم تُختر أيقونةٌ بعد'}
            </p>
          </div>
          <CloseButton onClose={onClose} />
        </header>

        <div className="kn-ip-bar">
          <label className="kn-search kn-ip-search">
            <SearchIcon size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // الإدخالُ يختار الأولى متى لم يبقَ إلا واحدة: «فرس» ثم Enter
                if (e.key === 'Enter' && shown === 1) {
                  e.preventDefault()
                  onPick(sections[0].items[0].key)
                }
              }}
              placeholder="ابحث: «ميزان»، «مصحف»، «حصان»…"
              aria-label="ابحث عن أيقونة"
              autoFocus
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="امسح البحث">
                <ClearIcon size={14} />
              </button>
            )}
          </label>

          {/* الأبوابُ شريطٌ واحدٌ يُمرَّر أفقيًّا: في سطرين كانت تأكل
              من الشبكة ما لا تحتمله نافذةٌ على الجوّال */}
          <div className="kn-ip-groups thin-scroll" role="tablist" aria-label="أبواب الأيقونات">
            <button
              type="button"
              role="tab"
              aria-selected={!group}
              className={group ? 'kn-pill' : 'kn-pill on'}
              onClick={() => choose('')}
            >
              الكلّ <em>{matched.length}</em>
            </button>
            {ICON_GROUPS.map((g) => {
              const n = counts.get(g) ?? 0
              return (
                <button
                  key={g}
                  type="button"
                  role="tab"
                  aria-selected={group === g}
                  className={group === g ? 'kn-pill on' : 'kn-pill'}
                  onClick={() => choose(g)}
                  disabled={n === 0 && group !== g}
                >
                  {g} <em>{n}</em>
                </button>
              )
            })}
          </div>
        </div>

        <div className="kn-ip-body thin-scroll" ref={body}>
          {/* والأيقوناتُ تُعرض تحت أسماء أبوابها لا مسرودةً سردًا: مئةٌ
              وثمانون في شبكةٍ واحدة لا تُقرأ ولا يُعرف موضعُ الواحدة منها */}
          {sections.map((section) => (
            <section key={section.name} className="kn-ip-section">
              <h3 className="kn-ip-group">
                <span>{section.name}</span>
                <em>{section.items.length}</em>
              </h3>
              <div className="kn-ip-grid">
                {section.items.map((def) => {
                  const on = def.key === value
                  return (
                    <button
                      key={def.key}
                      type="button"
                      className={on ? 'kn-ip-cell on' : 'kn-ip-cell'}
                      style={toneVar(def)}
                      onClick={() => onPick(def.key)}
                      aria-pressed={on}
                      title={`${def.label} — ${def.group}`}
                    >
                      <span className="kn-ip-glyph"><Icon name={def.key} size={30} /></span>
                      <span className="kn-ip-name">{def.label}</span>
                      {on && <span className="kn-ip-tick"><CheckIcon size={11} /></span>}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          {shown === 0 && (
            <div className="kn-ip-empty">
              <Icon name="magnifier" size={34} />
              <p>لا أيقونةَ بهذا الاسم{group ? ` في باب «${group}»` : ''}.</p>
              <p>جرِّب كلمةً أعمّ{group ? '، أو ابحث في الأبواب كلِّها' : ''}.</p>
              {group && (
                <button type="button" className="kn-pill" onClick={() => choose('')}>
                  ابحث في الكلّ
                </button>
              )}
            </div>
          )}
        </div>

        {/* «بلا أيقونة» خيارٌ قائم: بابٌ بلا رمزٍ خيرٌ من رمزٍ لا يدلّ عليه.
            وموضعُه الذيلُ لا الشبكة، لأنه ليس من بابٍ منها */}
        <footer className="kn-editor-foot">
          <button
            type="button"
            className="kn-ip-none"
            onClick={() => onPick('')}
            disabled={!value}
          >
            <ClearIcon size={14} /> بلا أيقونة
          </button>
          <span className="kn-editor-status">
            {shown === ICONS.length ? `${ICONS.length} أيقونة في ${ICON_GROUPS.length} أبواب` : `يُعرض ${shown} من ${ICONS.length}`}
          </span>
        </footer>
      </div>
    </Overlay>
  )
}

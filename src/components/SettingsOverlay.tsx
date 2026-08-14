// إعدادات المكتبة (§٥-٨ و§٦) — لصاحب المكتبة وحده.
// أربعة تبويبات: المظهر والخط، وصفحة الهبوط، والمكتبة، والزوار.
// تبويب «الزوار» هو موضع الخصوصية: ما يُطفأ هنا يُحذف من استجابة الزائر
// في قاعدة البيانات نفسها، لا في المتصفح.
//
// **لا يُحفظ شيءٌ إلا بزرّ الحفظ.** ما تغيّره يسري على الشاشة فورًا لتعاينه،
// ويبقى في المتصفّح حتى تحفظه. والإغلاق بتعديلٍ معلَّق يسأل قبل أن يُهمله.
// يُستثنى ما هو إجراءٌ لا حقل — رفع صورة، وإضافة صفٍّ أو حذفه — فذاك يمضي
// حين يُضغط، ولا معنى لتأجيله.

import { useRef, useState } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { FONTS, FONT_LABELS, FONT_ORDER, THEMES, THEME_LABELS, THEME_ORDER } from '../lib/theme'
import { useEscapeKey, useScrollLock } from '../lib/useScrollLock'
import {
  CURRENCIES, META_DEFS, VIS_TOGGLES,
  type FontName, type Settings, type ThemeName, type ViewMode, type Visibility,
} from '../lib/types'
import ImageSlot from './ImageSlot'
import {
  CloseButton, DebouncedInput, DebouncedTextarea, Overlay, ToggleRow,
  cardStyle, chipStyle, outlineTabStyle, viewToggleStyle,
} from './ui'

type Tab = 'appearance' | 'landing' | 'library' | 'privacy'

/** تعديلاتٌ معلَّقة على نصوص الاقتباسات، مفتاحها معرّف الاقتباس */
type QuoteEdits = Record<string, { text?: string; author?: string }>

/** يضع تعديلًا على حقلٍ من حقول الإعدادات، معاينةً بلا حفظ */
type SetField = (patch: Partial<Settings>) => void

export default function SettingsOverlay({ onClose }: { onClose: () => void }) {
  const { settings, previewSettings, saveSettings, reload } = useLibrary()
  const [tab, setTab] = useState<Tab>('appearance')
  const [quoteEdits, setQuoteEdits] = useState<QuoteEdits>({})
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  // ما كانت عليه الإعدادات لحظة الفتح: به نعرف المعلَّق، وإليه نردّ عند الإهمال
  const snapshot = useRef<Settings>(settings)

  const fieldsDirty = JSON.stringify(settings) !== JSON.stringify(snapshot.current)
  const quotesDirty = Object.keys(quoteEdits).length > 0
  const dirty = fieldsDirty || quotesDirty

  const setField: SetField = (patch) => {
    setJustSaved(false)
    previewSettings(patch)
  }

  const editQuote = (id: string, patch: { text?: string; author?: string }) => {
    setJustSaved(false)
    setQuoteEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function save() {
    setSaving(true)
    try {
      if (fieldsDirty) await saveSettings(settings)
      for (const [id, patch] of Object.entries(quoteEdits)) {
        await api.updateLandingQuote(id, patch)
      }
      snapshot.current = settings
      setQuoteEdits({})
      if (quotesDirty) await reload()
      setJustSaved(true)
    } finally {
      setSaving(false)
    }
  }

  /** الإغلاق لا يبتلع تعديلًا بصمت: يسأل، فإن أُهمل رُدَّت المعاينة */
  function requestClose() {
    if (dirty) {
      const goOn = window.confirm('فيه تعديلاتٌ لم تُحفظ بعد. أتُغلق النافذة وتُهملها؟')
      if (!goOn) return
      previewSettings(snapshot.current)
    }
    onClose()
  }

  useScrollLock()
  useEscapeKey(requestClose)

  return (
    <Overlay onClose={requestClose} zIndex={90}>
      <div style={{
        ...cardStyle, width: 560, maxWidth: '94vw', maxHeight: '88vh', borderRadius: 20,
        boxShadow: '0 34px 80px oklch(0.1 0.01 50 / 0.45)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--heading-font)', fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
                إعدادات المكتبة
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                المظهر والخطوط، وصفحة الهبوط، وأرفف المكتبة وتصانيفها
              </div>
            </div>
            <CloseButton onClose={requestClose} />
          </div>

          <div style={{ display: 'flex', gap: 4, background: 'var(--header)', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setTab('appearance')} style={viewToggleStyle(tab === 'appearance')}>المظهر والخط</button>
            <button type="button" onClick={() => setTab('landing')} style={viewToggleStyle(tab === 'landing')}>صفحة الهبوط</button>
            <button type="button" onClick={() => setTab('library')} style={viewToggleStyle(tab === 'library')}>المكتبة</button>
            <button type="button" onClick={() => setTab('privacy')} style={viewToggleStyle(tab === 'privacy')}>الزوار</button>
          </div>
        </div>

        <div className="thin-scroll" style={{ overflowY: 'auto', overflowX: 'hidden', padding: '20px 24px 24px', flex: 1, minHeight: 0 }}>
          {tab === 'appearance' && <AppearanceTab setField={setField} />}
          {tab === 'landing' && (
            <LandingTab setField={setField} quoteEdits={quoteEdits} editQuote={editQuote} />
          )}
          {tab === 'library' && <LibraryTab setField={setField} />}
          {tab === 'privacy' && <PrivacyTab setField={setField} />}
        </div>

        {/* شريط الحفظ: ملتصقٌ بأسفل النافذة فلا يغيب مهما طال التبويب */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '12px 24px', borderTop: '1px solid var(--border)',
          background: 'var(--header)', flex: 'none',
        }}>
          <span style={{ fontSize: 11.5, color: dirty ? 'var(--accent-soft)' : 'var(--muted)', lineHeight: 1.7 }}>
            {dirty
              ? 'تعديلاتٌ لم تُحفظ بعد'
              : justSaved
                ? 'حُفِظت التعديلات.'
                : 'الصور والأرفف والتصانيف تُحفظ فور تغييرها.'}
          </span>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || saving}
            style={{
              border: 'none', borderRadius: 9, padding: '9px 22px',
              fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap',
              background: dirty && !saving ? 'var(--accent)' : 'var(--border)',
              color: dirty && !saving ? 'var(--on-accent)' : 'var(--muted)',
              cursor: dirty && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? '…يُحفظ' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

const groupLabel = {
  fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 10,
} as const

// ---------------------------------------------------------------- المظهر
function AppearanceTab({ setField }: { setField: SetField }) {
  const { settings } = useLibrary()

  const optionCard = (active: boolean) => ({
    flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    gap: 6, padding: '14px 8px', borderRadius: 10,
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'oklch(0.42 0.09 45 / 0.08)' : 'transparent',
    color: 'var(--text)',
  })

  return (
    <div>
      <div style={groupLabel}>الخط</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        {FONT_ORDER.map((key: FontName) => (
          <button key={key} type="button" onClick={() => setField({ font: key })} style={optionCard(settings.font === key)}>
            <span style={{ fontFamily: FONTS[key].heading, fontSize: 20, fontWeight: 700 }}>Aa أب</span>
            <span style={{ fontSize: 12 }}>{FONT_LABELS[key]}</span>
          </button>
        ))}
      </div>

      <div style={groupLabel}>المظهر</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        {THEME_ORDER.map((key: ThemeName) => (
          <button key={key} type="button" onClick={() => setField({ theme: key })} style={optionCard(settings.theme === key)}>
            <span style={{
              width: 36, height: 24, borderRadius: 5,
              background: THEMES[key].bg, border: `1px solid ${THEMES[key].border}`,
            }} />
            <span style={{ fontSize: 12 }}>{THEME_LABELS[key]}</span>
          </button>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
          <span>حجم الخط العام</span><span>{settings.ui_scale}%</span>
        </div>
        <input
          type="range" min={85} max={125} step={5}
          value={settings.ui_scale}
          onChange={(e) => setField({ ui_scale: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 14 }}>
        <ToggleRow
          label="إظهار نقطة حالة القراءة"
          hint="مؤشر صغير على أغلفة الشبكة"
          on={settings.show_status_dots}
          onChange={() => setField({ show_status_dots: !settings.show_status_dots })}
        />
      </div>

      <ToggleRow
        label="إظهار نجوم التقييم"
        hint="في بطاقات الشبكة"
        on={settings.show_ratings}
        onChange={() => setField({ show_ratings: !settings.show_ratings })}
      />
    </div>
  )
}

// ---------------------------------------------------------- صفحة الهبوط
const smallInput = {
  padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 13, width: '100%',
} as const

const fieldLabel = {
  display: 'flex', flexDirection: 'column' as const, gap: 5,
  fontSize: 12, color: 'var(--muted)',
}

const addButton = {
  width: '100%', border: '1.5px dashed var(--border)', background: 'none',
  color: 'var(--accent-soft)', borderRadius: 10, padding: 10,
  fontSize: 13, fontWeight: 600,
} as const

/**
 * الصور والاقتباسات قائمتان مستقلّتان: صور الخلفية تتبدّل بمهلةٍ، والاقتباسات
 * بمهلةٍ أخرى، فلا يجرّ تبديلُ إحداهما الأخرى كما كان في «الشرائح».
 */
function LandingTab(
  { setField, quoteEdits, editQuote }:
  { setField: SetField; quoteEdits: QuoteEdits; editQuote: (id: string, p: { text?: string; author?: string }) => void },
) {
  const { settings, landingImages, landingQuotes, run, reload } = useLibrary()

  return (
    <div>
      <div style={groupLabel}>صور الخلفية ({landingImages.length})</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.7 }}>
        صورٌ تظهر داخل إطار الشعار وتتبدّل بتلاشٍ. الأنسب أن تكون عريضة (١٦:٩).
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
        {landingImages.map((img) => (
          <div key={img.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 8 }}>
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden' }}>
              <ImageSlot
                url={img.image_url}
                folder="landing"
                canEdit
                placeholder="صورة المكتبة"
                onUploaded={async (url) => {
                  await run(() => api.updateLandingImage(img.id, { image_url: url }))
                  await reload()
                }}
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                await run(() => api.removeLandingImage(img.id))
                await reload()
              }}
              style={{
                border: 'none', background: 'none', fontSize: 12, padding: '6px 4px 0',
                color: 'oklch(0.55 0.15 30)',
              }}
            >
              حذف
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={async () => {
          await run(() => api.addLandingImage(landingImages.length))
          await reload()
        }}
        style={{ ...addButton, marginBottom: 22 }}
      >
        + إضافة صورة
      </button>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={groupLabel}>الاقتباسات ({landingQuotes.length})</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {landingQuotes.map((q) => (
          <div key={q.id} style={{
            border: '1px solid var(--border)', borderRadius: 12, padding: 10,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <DebouncedTextarea
              value={quoteEdits[q.id]?.text ?? q.text}
              onCommit={(v) => editQuote(q.id, { text: v })}
              placeholder="نص الاقتباس"
              style={{
                minHeight: 58, padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)', fontSize: 12.5,
                lineHeight: 1.9, resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <DebouncedInput
                value={quoteEdits[q.id]?.author ?? q.author}
                onCommit={(v) => editQuote(q.id, { author: v })}
                placeholder="القائل ومصدره"
                style={{ ...smallInput, flex: 1, fontSize: 12.5 }}
              />
              <button
                type="button"
                onClick={async () => {
                  await run(() => api.removeLandingQuote(q.id))
                  await reload()
                }}
                style={{
                  border: 'none', background: 'none', fontSize: 12, padding: '6px 10px',
                  color: 'oklch(0.55 0.15 30)',
                }}
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={async () => {
          await run(() => api.addLandingQuote(landingQuotes.length))
          await reload()
        }}
        style={{ ...addButton, marginBottom: 20 }}
      >
        + إضافة اقتباس
      </button>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
        <ToggleRow
          label="إظهار بطاقة الاقتباس"
          on={settings.show_landing_quote}
          onChange={() => setField({ show_landing_quote: !settings.show_landing_quote })}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <ToggleRow
          label="التبديل التلقائي"
          hint="تدوير الصور والاقتباسات كلٌّ على مهلته"
          on={settings.auto_rotate}
          onChange={() => setField({ auto_rotate: !settings.auto_rotate })}
        />
      </div>

      {settings.auto_rotate && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              <span>مهلة تبديل الصور</span><span>{settings.rotate_seconds} ثانية</span>
            </div>
            <input
              type="range" min={3} max={30} step={1}
              value={settings.rotate_seconds}
              onChange={(e) => setField({ rotate_seconds: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              <span>مهلة تبديل الاقتباسات</span><span>{settings.quote_seconds} ثانية</span>
            </div>
            <input
              type="range" min={4} max={60} step={2}
              value={settings.quote_seconds}
              onChange={(e) => setField({ quote_seconds: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={groupLabel}>صفحة «عن المكتبة»</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <label style={fieldLabel}>
            سطرٌ تحت الاسم
            <DebouncedInput
              value={settings.landing_tagline}
              onCommit={(v) => setField({ landing_tagline: v })}
              style={smallInput}
            />
          </label>
          <label style={fieldLabel}>
            نصّ الصفحة — يفصل بين الفقرات سطرٌ فارغ
            <DebouncedTextarea
              value={settings.about_text}
              onCommit={(v) => setField({ about_text: v })}
              style={{ ...smallInput, minHeight: 150, lineHeight: 1.9, resize: 'vertical' }}
            />
          </label>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={groupLabel}>روابط التواصل في الذيل</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
          الرابط الفارغ لا يظهر في الذيل أصلًا.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={fieldLabel}>
            إكس
            <DebouncedInput
              value={settings.x_url}
              onCommit={(v) => setField({ x_url: v.trim() })}
              dir="ltr"
              placeholder="https://x.com/…"
              style={smallInput}
            />
          </label>
          <label style={fieldLabel}>
            تلجرام
            <DebouncedInput
              value={settings.telegram_url}
              onCommit={(v) => setField({ telegram_url: v.trim() })}
              dir="ltr"
              placeholder="https://t.me/…"
              style={smallInput}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------- المكتبة
function LibraryTab({ setField }: { setField: SetField }) {
  const { settings, categories, run, reload } = useLibrary()
  const [newCategory, setNewCategory] = useState('')

  const nameChips = (
    names: string[],
    onRemove: (name: string) => void,
  ) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
      {names.map((name) => (
        <span key={name} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'var(--header)',
          borderRadius: 999, padding: '4px 6px 4px 12px', fontSize: 12.5,
        }}>
          {name}
          <button
            type="button"
            title={names.length <= 1 ? 'لا يمكن حذف الأخير' : 'حذف'}
            disabled={names.length <= 1}
            onClick={() => onRemove(name)}
            style={{
              border: 'none', background: 'none', fontSize: 14, lineHeight: 1, padding: '0 2px',
              color: 'var(--muted)', cursor: names.length <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )

  const addRow = (
    value: string,
    setValue: (v: string) => void,
    placeholder: string,
    onAdd: () => void,
  ) => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
        placeholder={placeholder}
        style={{
          flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg)', color: 'var(--text)', fontSize: 12.5,
        }}
      />
      <button
        type="button"
        onClick={onAdd}
        style={{
          border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)',
          borderRadius: 8, padding: '7px 14px', fontSize: 12.5,
        }}
      >
        إضافة
      </button>
    </div>
  )

  return (
    <div>
      <div style={{ ...groupLabel, marginBottom: 8 }}>العرض الافتراضي للمكتبة</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['grid', 'شبكة'], ['table', 'جدول'], ['shelf', 'أرفف']] as [ViewMode, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setField({ default_view: key })}
            style={outlineTabStyle(settings.default_view === key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ ...groupLabel, marginBottom: 8 }}>عملة القيمة</div>
      <select
        value={settings.currency}
        onChange={(e) => setField({ currency: e.target.value })}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg)', color: 'var(--text)', fontSize: 13, marginBottom: 20,
        }}
      >
        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* لا قائمة أرففٍ تُدار هنا: موضع الكتاب صار رقمَ دولابٍ ورقمَ رفٍّ
          يُكتبان معه، ودواليبُ صفحة التصفُّح تُشتقّ من الكتب نفسها. */}
      <div style={{ ...groupLabel, marginBottom: 8 }}>التصنيفات</div>
      {nameChips(categories, async (name) => {
        await run(() => api.removeCategory(name))
        await reload()
      })}
      {addRow(newCategory, setNewCategory, 'اسم تصنيف جديد', async () => {
        const name = newCategory.trim()
        if (!name || categories.includes(name)) { setNewCategory(''); return }
        setNewCategory('')
        await run(() => api.addCategory(name, categories.length))
        await reload()
      })}
    </div>
  )
}

// --------------------------------------------------------------- الزوار
function PrivacyTab({ setField }: { setField: SetField }) {
  const { settings, categories, books } = useLibrary()
  const vis = settings.visibility

  const toggleVis = (key: keyof Visibility) =>
    setField({ visibility: { ...vis, [key]: !vis[key] } })

  const toggleInList = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value]

  return (
    <div>
      <div style={{
        fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, background: 'var(--header)',
        borderRadius: 10, padding: '11px 13px', marginBottom: 18,
      }}>
        ما تُطفئه هنا يختفي عن الزوار وحدهم، وأنت تراه كما هو حين تكون داخلًا بحسابك.
        <br />
        مخفيّ عن الزوار: {settings.hidden_book_ids.length} كتاب، و{settings.hidden_categories.length} تصنيف،
        و{settings.hidden_fields.length} حقل
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>ما يراه الزوار</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
        {VIS_TOGGLES.map((t) => (
          <ToggleRow key={t.key} label={t.label} hint={t.hint} on={!!vis[t.key]} onChange={() => toggleVis(t.key)} />
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>حقول بيانات الكتاب</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>المُضاء ظاهرٌ للزوار، والمُطفأ مخفيٌّ عنهم</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {META_DEFS.map((def) => (
            <button
              key={def.key}
              type="button"
              onClick={() => setField({ hidden_fields: toggleInList(settings.hidden_fields, def.key) })}
              style={chipStyle(!settings.hidden_fields.includes(def.key))}
            >
              {def.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>
          التصنيفات الظاهرة للزوار
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setField({ hidden_categories: toggleInList(settings.hidden_categories, c) })}
              style={chipStyle(!settings.hidden_categories.includes(c))}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>كتبٌ بعينها</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {books.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>لا كتب في الفهرس بعد.</div>
          )}
          {books.map((b) => {
            const hidden = settings.hidden_book_ids.includes(b.id)
            return (
              <div
                key={b.id}
                onClick={() => setField({ hidden_book_ids: toggleInList(settings.hidden_book_ids, b.id) })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 9,
                  padding: '8px 11px', background: hidden ? 'var(--header)' : 'var(--bg)',
                  opacity: hidden ? 0.72 : 1,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.author_name}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                  color: hidden ? 'oklch(0.45 0.13 28)' : 'oklch(0.36 0.09 150)',
                  background: hidden ? 'oklch(0.94 0.05 28)' : 'oklch(0.93 0.04 150)',
                }}>
                  {hidden ? 'مخفيّ' : 'ظاهر'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

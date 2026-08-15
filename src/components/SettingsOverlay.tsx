// إعدادات المكتبة (§٥-٨ و§٦) — لصاحب المكتبة وحده.
// أربعة تبويبات: المظهر والخط، وصفحة الهبوط، والمكتبة، والزوار.
// تبويب «الزوار» هو موضع الخصوصية: ما يُطفأ هنا يُحذف من استجابة الزائر
// في قاعدة البيانات نفسها، لا في المتصفح.
//
// **لا يُحفظ شيءٌ إلا بزرّ الحفظ.** ما تغيّره يسري على الشاشة فورًا لتعاينه،
// ويبقى في المتصفّح حتى تحفظه. والإغلاق بتعديلٍ معلَّق يسأل قبل أن يُهمله.
// يُستثنى ما هو إجراءٌ لا حقل — رفع صورة، وإضافة صفٍّ أو حذفه — فذاك يمضي
// حين يُضغط، ولا معنى لتأجيله.

import { useMemo, useRef, useState } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { FONTS, FONT_LABELS, FONT_ORDER, THEMES, THEME_LABELS, THEME_ORDER } from '../lib/theme'
import { useEscapeKey, useScrollLock } from '../lib/useScrollLock'
import { QUICK_OPTS, normalizeText } from '../lib/search'
import {
  AUTHOR_PRIVACY_FIELDS, BOOKS_COUNT, BOOK_PRIVACY_FIELDS, CATEGORIES_COUNT,
  CURRENCIES, FIELDS_COUNT, PUBLISHER_PRIVACY_FIELDS, VIS_TOGGLES,
  aboutTextOf, countLabel,
  type FieldMap, type FontName, type Settings, type ThemeName, type ViewMode,
  type Visibility,
} from '../lib/types'
import ImageSlot from './ImageSlot'
import {
  CloseButton, DebouncedInput, DebouncedTextarea, Overlay, ToggleRow,
  cardStyle, chipStyle, outlineTabStyle, viewToggleStyle,
} from './ui'

type Tab = 'appearance' | 'landing' | 'library' | 'privacy'

/**
 * الحدّ الأقصى لحروف الاقتباس. بطاقتُه في صفحة الهبوط بحجمٍ ثابت
 * (`.quote-card` وفيه `min-height`)، فلو زاد النصُّ عن هذا القدر لفاض عنها
 * أو مدَّها فقفزت الصفحةُ عند كل تبديل. والعددُ مقدَّرٌ بارتفاع البطاقة.
 */
const QUOTE_MAX_CHARS = 320

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
        ...cardStyle, width: 'min(560px, 100%)', maxHeight: 'calc(88vh / var(--ui-scale))', borderRadius: 20,
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
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.7 }}>
          بطاقةُ الاقتباس بحجمٍ ثابت لا يتبع طولَ النصّ، فلا تقفز الصفحةُ عند
          التبديل. ولذلك حدٌّ أقصى للحروف يسع البطاقة: {QUOTE_MAX_CHARS} حرفًا.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {landingQuotes.map((q) => (
          <div key={q.id} style={{
            border: '1px solid var(--border)', borderRadius: 12, padding: 10,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <DebouncedTextarea
              value={quoteEdits[q.id]?.text ?? q.text}
              onCommit={(v) => editQuote(q.id, { text: v.slice(0, QUOTE_MAX_CHARS) })}
              maxLength={QUOTE_MAX_CHARS}
              placeholder="نص الاقتباس"
              style={{
                minHeight: 58, padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)', fontSize: 12.5,
                lineHeight: 1.9, resize: 'vertical',
              }}
            />
            <div style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'start' }}>
              {(quoteEdits[q.id]?.text ?? q.text).length} / {QUOTE_MAX_CHARS} حرفًا
            </div>
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
          {/* النصّ يُعرض هنا كما هو معروضٌ في الصفحة — لا فارغًا يُوهم أنه لم
              يُكتب. فالمكتوبُ في القاعدة إن كان فارغًا أو زرعًا تجريبيًّا حلّ
              محلَّه النصُّ المعتمَد، وهو الذي يُملأ به الحقل فيُعدَّل منه. */}
          <label style={fieldLabel}>
            نصّ الصفحة — يفصل بين الفقرات سطرٌ فارغ
            <DebouncedTextarea
              value={aboutTextOf(settings.about_text)}
              onCommit={(v) => setField({ about_text: v })}
              style={{ ...smallInput, minHeight: 260, lineHeight: 1.9, resize: 'vertical' }}
            />
          </label>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8, marginTop: -4 }}>
            تُعرَف وجوهُ النصّ بأماراتها لا بمواضعها: السطرُ الأول عنوانًا،
            و«بسم الله…» بسملةً، و«وصلى الله…» خاتمةً، وآخرُ فقرةٍ فيها تاريخٌ
            هجريّ توقيعًا. فما بينها فقراتُ المتن.
          </div>
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
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.8 }}>
        لكل تصنيفٍ رئيسٍ فروعُه: «العربية» تحتها المعاجمُ والدواوينُ والنحوُ
        والصرف. وحذفُ الرئيس يحذف فروعَه معه.
      </div>
      <CategoryManager
        categories={categories}
        onAdd={async (name, parent) => {
          await run(() => api.addCategory(name, categories.length, parent))
          await reload()
        }}
        onRemove={async (name) => {
          await run(() => api.removeCategory(name))
          await reload()
        }}
      />
    </div>
  )
}

/**
 * إدارة التصنيفات: الرئيسُ سطرٌ، وفروعُه مربَّعاتٌ تحته، ولكلٍّ زرُّ إضافة.
 * ولا يُحذف آخرُ تصنيفٍ رئيسٍ: كتابٌ بلا تصنيفٍ يجوز، ومكتبةٌ بلا تصانيف لا.
 */
function CategoryManager(
  { categories, onAdd, onRemove }: {
    categories: { name: string; parent: string }[]
    onAdd: (name: string, parent: string) => Promise<void>
    onRemove: (name: string) => Promise<void>
  },
) {
  // موضعُ حقل الإضافة المفتوح: اسمُ الرئيس، أو `''` لتصنيفٍ رئيسٍ جديد
  const [adding, setAdding] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const mains = categories.filter((c) => !c.parent)
  const childrenOf = (name: string) => categories.filter((c) => c.parent === name)
  const taken = (name: string) => categories.some((c) => c.name === name)

  async function commit(parent: string) {
    const name = draft.trim()
    setDraft('')
    setAdding(null)
    if (!name || taken(name)) return
    await onAdd(name, parent)
  }

  const addField = (parent: string) => (
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit(parent) }
          if (e.key === 'Escape') { setDraft(''); setAdding(null) }
        }}
        placeholder={parent ? `فرعٌ تحت «${parent}»` : 'اسم تصنيفٍ رئيسٍ جديد'}
        style={{ ...smallInput, fontSize: 12.5 }}
      />
      <button
        type="button"
        onClick={() => void commit(parent)}
        style={{
          border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)',
          borderRadius: 8, padding: '7px 14px', fontSize: 12.5, whiteSpace: 'nowrap',
        }}
      >
        إضافة
      </button>
    </div>
  )

  const removeX = (name: string, disabled: boolean) => (
    <button
      type="button"
      title={disabled ? 'لا يمكن حذف آخر تصنيف' : 'حذف'}
      disabled={disabled}
      onClick={() => void onRemove(name)}
      style={{
        border: 'none', background: 'none', fontSize: 14, lineHeight: 1, padding: '0 2px',
        color: 'var(--muted)', cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      ×
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
      {mains.map((main) => (
        <div key={main.name} style={{
          border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            {main.name}
            {removeX(main.name, mains.length <= 1)}
            <button
              type="button"
              onClick={() => { setDraft(''); setAdding(adding === main.name ? null : main.name) }}
              style={{
                marginInlineStart: 'auto', border: '1px dashed var(--accent)', background: 'none',
                color: 'var(--accent)', borderRadius: 8, padding: '3px 10px', fontSize: 11.5,
              }}
            >
              + فرع
            </button>
          </div>

          {childrenOf(main.name).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {childrenOf(main.name).map((sub) => (
                <span key={sub.name} style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: 'var(--header)',
                  borderRadius: 999, padding: '3px 6px 3px 11px', fontSize: 12,
                }}>
                  {sub.name}
                  {removeX(sub.name, false)}
                </span>
              ))}
            </div>
          )}

          {adding === main.name && addField(main.name)}
        </div>
      ))}

      {adding === '' ? addField('') : (
        <button
          type="button"
          onClick={() => { setDraft(''); setAdding('') }}
          style={addButton}
        >
          + إضافة تصنيفٍ رئيس
        </button>
      )}
    </div>
  )
}

// --------------------------------------------------------------- الزوار
/**
 * تبويب الزوار، مقسومٌ بصفحات الموقع نفسها: الهبوطُ، فالتصفُّح، فدُور النشر،
 * فالمؤلِّفون، فالكتب. وذلك أهدى من قائمةٍ واحدة: من أراد أن يستر شيئًا
 * فإنما يستره في موضعٍ رآه.
 *
 * والإخفاء على ثلاث درجات في كل نوع: مستندٌ بعينه، وحقلٌ من مستندات النوع
 * كلِّها ومعه استثناء، وحقلٌ من مستندٍ بعينه. وحكمُها في `convex/privacy.ts`
 * — هذه النافذةُ تكتب القوائم لا غير، والحجبُ في الخادم.
 *
 * وما لا يُخفى أصلًا فلا يُعرَض هنا: عنوانُ الكتاب، واسمُ مؤلِّفه، واسمُ
 * المكتبة، واسمُ صاحب الترجمة في بطاقته، واسمُ الدار في بطاقتها. إخفاؤها
 * يُفسد الفائدة من الفهرس.
 */
function PrivacyTab({ setField }: { setField: SetField }) {
  const { settings, categories, books, authors, publishers } = useLibrary()
  const s = settings
  const vis = s.visibility

  const toggleVis = (key: keyof Visibility) =>
    setField({ visibility: { ...vis, [key]: !vis[key] } })

  const bookDocs = useMemo(
    () => books.map((b) => ({ id: b.id, title: b.title, sub: b.author_name })),
    [books],
  )
  const authorDocs = useMemo(
    () => authors.map((a) => ({ id: a.id, title: a.name, sub: a.full_name })),
    [authors],
  )
  const publisherDocs = useMemo(
    () => publishers.map((p) => ({ id: p.id, title: p.name, sub: p.place })),
    [publishers],
  )

  const totalFields = s.hidden_fields.length
    + s.hidden_author_fields.length + s.hidden_publisher_fields.length

  return (
    <div>
      <div style={{
        fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, background: 'var(--header)',
        borderRadius: 10, padding: '11px 13px', marginBottom: 18,
      }}>
        ما تُطفئه هنا يختفي عن الزوار وحدهم، وأنت تراه كما هو حين تكون داخلًا بحسابك.
        <br />
        مخفيّ عن الزوار: {countLabel(s.hidden_book_ids.length, BOOKS_COUNT)}،
        و{countLabel(s.hidden_categories.length, CATEGORIES_COUNT)}،
        و{countLabel(totalFields, FIELDS_COUNT)}.
        <br />
        والكتابُ المخفيُّ والمؤلِّفُ المخفيّ يسقطان من عدّ الزائر وحسابه، فلا
        يدلّ عليهما رقمٌ في الإحصاء.
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>ما يراه الزوار</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8 }}>
        {VIS_TOGGLES.map((t) => (
          <ToggleRow key={t.key} label={t.label} hint={t.hint} on={!!vis[t.key]} onChange={() => toggleVis(t.key)} />
        ))}
      </div>

      {/* ------------------------------------------------ أولًا: صفحة الهبوط */}
      <PrivacySection index="أولًا" title="صفحة الهبوط">
        <ToggleRow
          label="موضع المكتبة"
          hint="أبها — حيّ الموظَّفين… ويسري إخفاؤه على صفحة «عن المكتبة» أيضًا"
          on={s.show_landing_place}
          onChange={() => setField({ show_landing_place: !s.show_landing_place })}
        />
      </PrivacySection>

      {/* ------------------------------------------ ثانيًا: تصفُّح المكتبة */}
      <PrivacySection index="ثانيًا" title="صفحة تصفُّح المكتبة">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <ToggleRow
            label="حاسبة القراءة"
            hint="زرُّها في صدر الصفحة"
            on={s.show_calculator}
            onChange={() => setField({ show_calculator: !s.show_calculator })}
          />
          <ToggleRow
            label="الإحصائيات المفصَّلة"
            hint="الأعدادُ العامّة — الكتبُ والمؤلِّفون — لا تُخفى، وإنما تسقط منها حسبةُ ما أُخفي"
            on={vis.stats}
            onChange={() => toggleVis('stats')}
          />
        </div>

        <SubHead>تصنيفٌ بعينه</SubHead>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          المُضاء ظاهرٌ للزوار، والمُطفأ مخفيٌّ عنهم بكتبه. وإخفاءُ الرئيس
          يُخفي فروعَه معه.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {categories.length === 0 && <Note>لا تصنيفات بعد.</Note>}
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setField({
                hidden_categories: toggleIn(s.hidden_categories, c.name),
              })}
              style={chipStyle(!s.hidden_categories.includes(c.name))}
            >
              {c.parent ? `${c.parent} ← ${c.name}` : c.name}
            </button>
          ))}
        </div>

        <SubHead>كتابٌ بعينه</SubHead>
        <DocPicker
          docs={bookDocs}
          chosen={s.hidden_book_ids}
          onToggle={(id) => setField({ hidden_book_ids: toggleIn(s.hidden_book_ids, id) })}
          placeholder="ابحث في عناوين الكتب المسجَّلة…"
          empty="لا كتاب مخفيّ. ابحث عن عنوانٍ لتُخفيه."
        />
      </PrivacySection>

      {/* -------------------------------------------- ثالثًا: دُور النشر */}
      <PrivacySection index="ثالثًا" title="صفحة دُوْر النَّشْر">
        <SubHead>دارٌ بعينها</SubHead>
        <DocPicker
          docs={publisherDocs}
          chosen={s.hidden_publisher_ids}
          onToggle={(id) => setField({
            hidden_publisher_ids: toggleIn(s.hidden_publisher_ids, id),
          })}
          placeholder="ابحث في أسماء الدُّور…"
          empty="لا دار مخفيّة. ابحث عن دارٍ لتُخفيها."
        />

        <GlobalFields
          title="حقلٌ من الدُّور جميعها"
          fields={PUBLISHER_PRIVACY_FIELDS}
          hiddenFields={s.hidden_publisher_fields}
          exceptions={s.publisher_field_exceptions}
          docs={publisherDocs}
          onToggleField={(key) => setField({
            hidden_publisher_fields: toggleIn(s.hidden_publisher_fields, key),
          })}
          onToggleException={(key, id) => setField({
            publisher_field_exceptions: toggleInMap(s.publisher_field_exceptions, key, id),
          })}
        />

        <PerDocFields
          title="حقلٌ من دارٍ بعينها"
          fields={PUBLISHER_PRIVACY_FIELDS}
          overrides={s.publisher_field_overrides}
          docs={publisherDocs}
          searchLabel="ابحث في أسماء الدُّور…"
          onToggle={(id, key) => setField({
            publisher_field_overrides: toggleInMap(s.publisher_field_overrides, id, key),
          })}
        />
      </PrivacySection>

      {/* -------------------------------------------- رابعًا: المؤلِّفون */}
      <PrivacySection index="رابعًا" title="صفحة المؤلِّفين">
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.8 }}>
          إخفاءُ مؤلِّفٍ يُخفي كتبَه معه — لا يُعرض عنوانُ كتابٍ بلا مؤلِّفه.
          وإخفاءُ كتبه كلِّها واحدًا واحدًا يُخفيه هو أيضًا، إذ لا معنى لعرض
          مؤلِّفٍ لا كتاب له عندنا.
        </div>

        <SubHead>مؤلِّفٌ بعينه</SubHead>
        <DocPicker
          docs={authorDocs}
          chosen={s.hidden_author_ids}
          onToggle={(id) => setField({ hidden_author_ids: toggleIn(s.hidden_author_ids, id) })}
          placeholder="ابحث في أسماء المؤلِّفين…"
          empty="لا مؤلِّف مخفيّ. ابحث عن اسمٍ لتُخفيه."
        />

        <GlobalFields
          title="حقلٌ من المؤلِّفين جميعًا"
          fields={AUTHOR_PRIVACY_FIELDS}
          hiddenFields={s.hidden_author_fields}
          exceptions={s.author_field_exceptions}
          docs={authorDocs}
          onToggleField={(key) => setField({
            hidden_author_fields: toggleIn(s.hidden_author_fields, key),
          })}
          onToggleException={(key, id) => setField({
            author_field_exceptions: toggleInMap(s.author_field_exceptions, key, id),
          })}
        />

        <PerDocFields
          title="حقلٌ من مؤلِّفٍ بعينه"
          fields={AUTHOR_PRIVACY_FIELDS}
          overrides={s.author_field_overrides}
          docs={authorDocs}
          searchLabel="ابحث في أسماء المؤلِّفين…"
          onToggle={(id, key) => setField({
            author_field_overrides: toggleInMap(s.author_field_overrides, id, key),
          })}
        />
      </PrivacySection>

      {/* ------------------------------------------------ خامسًا: الكتب */}
      <PrivacySection index="خامسًا" title="بيانات الكتب">
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.8 }}>
          الإخفاء يشمل الصور: يُخفى غلافُ كتابٍ بعينه، أو أغلفةُ الكتب جميعًا.
          وإخفاءُ اسم الدار من كتابٍ يجعله عند الزائر غيرَ منسوبٍ إليها، فإن
          أُخفي من كتبها كلِّها لم تُعرض الدارُ أصلًا.
        </div>

        <GlobalFields
          title="حقلٌ من الكتب جميعها"
          fields={BOOK_PRIVACY_FIELDS}
          hiddenFields={s.hidden_fields}
          exceptions={s.field_exceptions}
          docs={bookDocs}
          onToggleField={(key) => setField({ hidden_fields: toggleIn(s.hidden_fields, key) })}
          onToggleException={(key, id) => setField({
            field_exceptions: toggleInMap(s.field_exceptions, key, id),
          })}
        />

        <PerDocFields
          title="حقلٌ من كتابٍ بعينه"
          fields={BOOK_PRIVACY_FIELDS}
          overrides={s.book_field_overrides}
          docs={bookDocs}
          searchLabel="ابحث في عناوين الكتب…"
          onToggle={(id, key) => setField({
            book_field_overrides: toggleInMap(s.book_field_overrides, id, key),
          })}
        />
      </PrivacySection>
    </div>
  )
}

// ------------------------------------------------- قطعُ تبويب الزوار
/** مستندٌ كما يُعرض في قوائم الاختيار: معرّفُه واسمُه وخبرٌ تحته */
interface PickDoc { id: string; title: string; sub?: string }

const toggleIn = (list: string[], value: string) =>
  list.includes(value) ? list.filter((x) => x !== value) : [...list, value]

/** يبدّل قيمةً في خريطةٍ من مفتاحٍ إلى قائمة، ويحذف المفتاح إن فرغ */
function toggleInMap(map: FieldMap, key: string, value: string): FieldMap {
  const next = toggleIn(map[key] ?? [], value)
  const out = { ...map }
  if (next.length === 0) delete out[key]
  else out[key] = next
  return out
}

function PrivacySection(
  { index, title, children }: { index: string; title: string; children: React.ReactNode },
) {
  return (
    <section style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 18 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12,
        fontFamily: 'var(--heading-font)', fontSize: 15, fontWeight: 700,
      }}>
        <span style={{ color: 'var(--accent-soft)', fontSize: 12.5 }}>{index}</span>
        {title}
      </div>
      {children}
    </section>
  )
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700, marginBottom: 6 }}>
      {children}
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>{children}</div>
}

/**
 * اختيارُ مستنداتٍ بأعيانها. لا تُعرض القائمةُ كلُّها واحدًا واحدًا — تكبر
 * فتُعمي — بل يُعرض المخفيُّ وحده، ويُبحث عمّا سواه بالاسم. والبحثُ بمعيار
 * بحث المكتبة نفسه: بلا تشكيلٍ ولا تفريقٍ بين الهمزات.
 */
function DocPicker(
  { docs, chosen, onToggle, placeholder, empty, max = 12 }: {
    docs: PickDoc[]
    chosen: string[]
    onToggle: (id: string) => void
    placeholder: string
    empty: string
    max?: number
  },
) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  const shown = useMemo(() => {
    if (!trimmed) return docs.filter((d) => chosen.includes(d.id))
    const needle = normalizeText(trimmed, QUICK_OPTS)
    return docs
      .filter((d) => normalizeText(`${d.title} ${d.sub ?? ''}`, QUICK_OPTS).includes(needle))
      .slice(0, max)
  }, [docs, chosen, trimmed, max])

  return (
    <div style={{ marginBottom: 18 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{ ...smallInput, marginBottom: 8 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {shown.length === 0 && <Note>{trimmed ? 'لا مطابق.' : empty}</Note>}
        {shown.map((d) => {
          const on = chosen.includes(d.id)
          return (
            <div
              key={d.id}
              onClick={() => onToggle(d.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 9,
                padding: '7px 10px', background: on ? 'var(--header)' : 'var(--bg)',
                opacity: on ? 0.78 : 1,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {d.title}
                </div>
                {d.sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.sub}</div>}
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
                whiteSpace: 'nowrap',
                color: on ? 'oklch(0.45 0.13 28)' : 'oklch(0.36 0.09 150)',
                background: on ? 'oklch(0.94 0.05 28)' : 'oklch(0.93 0.04 150)',
              }}>
                {on ? 'مخفيّ' : 'ظاهر'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * حقولٌ تُخفى من مستندات النوع كلِّها، ولكلّ حقلٍ مخفيٍّ زرُّ استثناء: يُفتح
 * فيُختار من يُردّ إلى الظهور وحده. والمُضاء ظاهرٌ والمُطفأ مخفيّ، كما في
 * سائر مربَّعات هذه النافذة.
 */
function GlobalFields(
  { title, fields, hiddenFields, exceptions, docs, onToggleField, onToggleException }: {
    title: string
    fields: { label: string; key: string }[]
    hiddenFields: string[]
    exceptions: FieldMap
    docs: PickDoc[]
    onToggleField: (key: string) => void
    onToggleException: (key: string, id: string) => void
  },
) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div style={{ marginBottom: 18 }}>
      <SubHead>{title}</SubHead>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
        المُضاء ظاهرٌ للزوار، والمُطفأ مخفيٌّ عنهم
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {fields.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onToggleField(f.key)}
            style={chipStyle(!hiddenFields.includes(f.key))}
          >
            {f.label}
          </button>
        ))}
      </div>

      {hiddenFields.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fields.filter((f) => hiddenFields.includes(f.key)).map((f) => {
            const list = exceptions[f.key] ?? []
            return (
              <div key={f.key} style={{
                border: '1px solid var(--border)', borderRadius: 9, padding: '8px 10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{f.label}</span>
                  <span style={{ color: 'var(--muted)' }}>
                    {list.length > 0 ? `مُستثنى: ${list.length}` : 'مخفيٌّ من الجميع'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(open === f.key ? null : f.key)}
                    style={{
                      marginInlineStart: 'auto', border: '1px solid var(--accent)', background: 'none',
                      color: 'var(--accent)', borderRadius: 8, padding: '3px 11px', fontSize: 11.5,
                    }}
                  >
                    {open === f.key ? 'إغلاق' : 'استثناء'}
                  </button>
                </div>

                {open === f.key && (
                  <div style={{ marginTop: 8 }}>
                    <ExceptionPicker
                      docs={docs}
                      chosen={list}
                      onToggle={(id) => onToggleException(f.key, id)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** قائمةُ الاستثناء: المستثنى يبقى ظاهرًا وحدَه من بين ما أُخفي حقلُه */
function ExceptionPicker(
  { docs, chosen, onToggle }: { docs: PickDoc[]; chosen: string[]; onToggle: (id: string) => void },
) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  const shown = useMemo(() => {
    if (!trimmed) return docs.filter((d) => chosen.includes(d.id))
    const needle = normalizeText(trimmed, QUICK_OPTS)
    return docs
      .filter((d) => normalizeText(`${d.title} ${d.sub ?? ''}`, QUICK_OPTS).includes(needle))
      .slice(0, 10)
  }, [docs, chosen, trimmed])

  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عمّن يُستثنى من هذا الإخفاء…"
        style={{ ...smallInput, fontSize: 12, marginBottom: 6 }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {shown.length === 0 && (
          <Note>{trimmed ? 'لا مطابق.' : 'لا مستثنى بعد. ابحث لتستثني.'}</Note>
        )}
        {shown.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onToggle(d.id)}
            style={chipStyle(chosen.includes(d.id))}
          >
            {d.title}
          </button>
        ))}
      </div>
    </>
  )
}

/**
 * حقولٌ تُخفى من مستندٍ بعينه: يُبحث عنه أوّلًا، ثم تُطفأ حقولُه. وهذا يُقدَّم
 * على الإخفاء العامّ واستثنائه جميعًا — أخصُّ الأحكام أولاها.
 */
function PerDocFields(
  { title, fields, overrides, docs, searchLabel, onToggle }: {
    title: string
    fields: { label: string; key: string }[]
    overrides: FieldMap
    docs: PickDoc[]
    searchLabel: string
    onToggle: (id: string, key: string) => void
  },
) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const trimmed = query.trim()

  const matches = useMemo(() => {
    if (!trimmed) return []
    const needle = normalizeText(trimmed, QUICK_OPTS)
    return docs
      .filter((d) => normalizeText(`${d.title} ${d.sub ?? ''}`, QUICK_OPTS).includes(needle))
      .slice(0, 8)
  }, [docs, trimmed])

  /** ما سبق أن أُخفي منه حقلٌ، فيبقى معروضًا ليُراجَع */
  const touched = docs.filter((d) => (overrides[d.id] ?? []).length > 0)
  const shown = picked ? docs.filter((d) => d.id === picked) : touched

  return (
    <div style={{ marginBottom: 6 }}>
      <SubHead>{title}</SubHead>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setPicked(null) }}
        placeholder={searchLabel}
        style={{ ...smallInput, marginBottom: 8 }}
      />

      {trimmed && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {matches.length === 0 && <Note>لا مطابق.</Note>}
          {matches.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setPicked(d.id)}
              style={chipStyle(picked === d.id)}
            >
              {d.title}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 && !trimmed && (
        <Note>لم يُخفَ حقلٌ من مستندٍ بعينه بعد. ابحث لتختار.</Note>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((d) => {
          const hiddenHere = overrides[d.id] ?? []
          return (
            <div key={d.id} style={{
              border: '1px solid var(--border)', borderRadius: 9, padding: '8px 10px',
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 7 }}>{d.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {fields.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => onToggle(d.id, f.key)}
                    style={chipStyle(!hiddenHere.includes(f.key))}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

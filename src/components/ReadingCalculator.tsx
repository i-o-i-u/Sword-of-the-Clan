// حاسبة القِراءة: تحسب وِرْدك من الكتاب على ما تُحدِّده، بثلاث طرق —
// مدّةٌ معيَّنة، أو تاريخُ خَتْمٍ معيَّن، أو مقدارٌ معيَّنٌ في اليوم.
//
// أمّا الكسور فتُرفع إلى صفحةٍ كاملة: لا يُقرأ سُبعُ صفحة، ورفعُ الكسر يضمن
// الخَتْم في موعده ويجعل آخرَ يومٍ أخفَّ — وهو يُقال صراحةً في النتيجة. ولو
// خُفِض الكسر لتأخّر الخَتْم عن موعده.
//
// وتكشف المغالطة ولا تُخرج لها رقمًا: مَن أراد كتابًا صغيرًا في خمسين سنة
// وقع دون صفحةٍ في اليوم، ومَن أراد سِفرًا ضخمًا في يومٍ طلب ما لا يُقرأ.
// ففي الحالين يُقال له وجهُ الخلل، ويُعرض عليه ما يُقارب مراده.
//
// والمشي على الأيام يجري بالتقويم الهجريّ (hijri.ts)، لا بحسابٍ تقريبيّ:
// «شهر» في حقل المدّة ثلاثون يومًا لأنها مدّةٌ يختارها القارئ لا شهرٌ بعينه.

import { useMemo, useState } from 'react'
import { useLibrary } from '../lib/library'
import {
  WEEKDAYS, addDays, fullDayLabel, hijriToDate, hijriToday, shortDayLabel,
  toArabicDigits, weekdayOf,
} from '../lib/hijri'
import { parseNumber } from '../lib/types'
import HijriDatePicker from './HijriDatePicker'
import { CalculatorIcon, CloseButton, Overlay, cardStyle, inputStyle } from './ui'

type Mode = 'مدَّة مُعيَّنة' | 'تاريخ مُعيَّن' | 'مِقْدار مُعيَّن'
const MODES: Mode[] = ['مدَّة مُعيَّنة', 'تاريخ مُعيَّن', 'مِقْدار مُعيَّن']

/** فوق هذا الحدّ لا يكون وِردًا يُقرأ في يومٍ واحد */
const MAX_DAILY = 200
/** وِردٌ ثقيلٌ لكنه ممكن، يُعرض على من طلب ما لا يُقرأ */
const HEAVY_DAILY = 50

export default function ReadingCalculator({ onClose }: { onClose: () => void }) {
  const { books } = useLibrary()

  const [bookName, setBookName] = useState('')
  const [pages, setPages] = useState('')
  const [started, setStarted] = useState(false)
  const [atPage, setAtPage] = useState('')
  const [mode, setMode] = useState<Mode>(MODES[0])

  // كل أيام الأسبوع معلَّمةٌ ابتداءً: الأصل أن يقرأ كل يوم، والراحة استثناء
  const [days, setDays] = useState<boolean[]>(() => Array(7).fill(true))

  const [spanDays, setSpanDays] = useState('')
  const [spanMonths, setSpanMonths] = useState('')
  const [spanYears, setSpanYears] = useState('')
  const [startAt, setStartAt] = useState<Triple>([null, null, null])
  const [endAt, setEndAt] = useState<Triple>([null, null, null])
  const [perDay, setPerDay] = useState('')

  /** اختيار كتابٍ من المكتبة يملأ عدد صفحاته من المسجَّل عندنا */
  function pickBook(name: string) {
    setBookName(name)
    const found = books.find((b) => b.title === name.trim())
    if (found?.pages) setPages(String(found.pages))
  }

  const total = parseNumber(pages) ?? 0
  const read = started ? (parseNumber(atPage) ?? 0) : 0
  const remaining = Math.max(0, total - read)

  const result = useMemo(
    () => compute({
      mode, total, read, remaining, started, days,
      spanDays, spanMonths, spanYears, startAt, endAt, perDay, bookName,
    }),
    [mode, total, read, remaining, started, days,
      spanDays, spanMonths, spanYears, startAt, endAt, perDay, bookName],
  )

  return (
    /*
     * حاشيةُ الطبقة تكفيها، فلا `paddingTop` تُلصقها بترويسة الموقع — كانت
     * ٥٤ والترويسةُ ٧٠، فتقع النافذةُ تحت حرفها بثلاث نقاط.
     *
     * وحدُّ ارتفاعها من `.overlay-sheet` لا من `vh`: تلك لا تتبع التكبير،
     * فتخرج النافذةُ عن الشاشة كلّما كبّر القارئ الخطّ.
     */
    <Overlay onClose={onClose} align="flex-start">
      <div
        className="overlay-sheet"
        style={{
          ...cardStyle, borderRadius: 18, padding: 0, width: 'min(640px, 100%)',
          overflow: 'hidden',
        }}
      >
        {/* رأسٌ ثابت لا يعلو مع التمرير، وللأيقونة فيه موضعٌ لا يتزحزح */}
        <div
          style={{
            flex: 'none', display: 'flex', alignItems: 'center', gap: 14,
            padding: '18px 22px', borderBottom: '1px solid var(--border)',
            background: 'var(--header)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              flex: 'none', width: 46, height: 46, borderRadius: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent)', color: 'var(--on-accent)',
              boxShadow: '0 8px 18px oklch(0.42 0.09 45 / 0.32)',
            }}
          >
            <CalculatorIcon size={25} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--heading-font)', fontSize: 21, fontWeight: 700 }}>
              حاسبة القِراءة
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
              احسب وِرْدك من القراءة على ما ترغبُه وتُحدِّده.
            </div>
          </div>
          <CloseButton onClose={onClose} />
        </div>

        {/*
          عمودُ الحقول، وهو المُمرَّر. و`minWidth: 0` فيه لازم: هو ابنٌ مرنٌ
          في عمود، والابنُ المرن لا يضيق عن أضيق ما فيه ما لم يُؤذن له.
          و`overflowX: hidden` يمنع حقلًا واحدًا عريضًا — شبكةَ الأيام مثلًا —
          أن يمدّ العمودَ فيخرج ما بعده عن حدّ البطاقة، والبطاقةُ تقصّ
          الزائد (`overflow: hidden`) فيضيع النصّ ولا يُرى باقيه.
        */}
        <div style={{
          flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden',
          padding: 22, display: 'flex', flexDirection: 'column', gap: 15,
        }}>
          <Field label="اسم الكتاب المُراد قِراءَتُه" need="اختياري">
            <input
              value={bookName}
              onChange={(e) => pickBook(e.target.value)}
              list="calc-books"
              placeholder="اكتب اسمًا أو اختر كتابًا من كتب المكتبة"
              style={inputStyle}
            />
            <datalist id="calc-books">
              {books.map((b) => <option key={b.id} value={b.title} />)}
            </datalist>
          </Field>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14 }}>
            <Field label="عدد صفحاته إجمالًا" need="لازم">
              <input
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                inputMode="numeric"
                style={inputStyle}
              />
            </Field>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
                <input type="checkbox" checked={started} onChange={(e) => setStarted(e.target.checked)} />
                شرَعت في قراءته
              </label>
              {started && (
                <input
                  value={atPage}
                  onChange={(e) => setAtPage(e.target.value)}
                  inputMode="numeric"
                  placeholder="رقم الصفحة التي بلغْتها"
                  aria-label="رقم الصفحة التي بلغْتها"
                  style={inputStyle}
                />
              )}
            </div>
          </div>

          <Field label="طريقة الحساب" need="لازم">
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} style={inputStyle}>
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          {mode === MODES[0] && (
            <Field label="في كم تريد خَتْم الكتاب؟" need="لازم" plain>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
                <SpanBox label="أيام" value={spanDays} onChange={setSpanDays} />
                <SpanBox label="أشهر" value={spanMonths} onChange={setSpanMonths} />
                <SpanBox label="سنوات" value={spanYears} onChange={setSpanYears} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                الشهر هنا ثلاثون يومًا والسنة اثنا عشر شهرًا، فهي مدّةٌ تختارها لا شهرًا بعينه.
              </span>
            </Field>
          )}

          {mode === MODES[1] && (
            <Field label="تاريخ الخَتْم" need="لازم" plain>
              <HijriDatePicker
                label=""
                day={endAt[0]}
                month={endAt[1]}
                year={endAt[2]}
                onChange={(d, m, y) => setEndAt([d, m, y])}
              />
            </Field>
          )}

          {mode === MODES[2] && (
            <Field label="كم تقرأ صفحةً في اليوم؟" need="لازم">
              <input
                value={perDay}
                onChange={(e) => setPerDay(e.target.value)}
                inputMode="numeric"
                style={{ ...inputStyle, maxWidth: 200 }}
              />
            </Field>
          )}

          <Field label="الالتزام في أيام الأسبوع" need="لازم" plain>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {WEEKDAYS.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setDays((prev) => prev.map((on, idx) => (idx === i ? !on : on)))}
                  aria-pressed={days[i]}
                  style={{
                    padding: '6px 12px', borderRadius: 999, fontSize: 12.5,
                    border: `1px solid ${days[i] ? 'var(--accent)' : 'var(--border)'}`,
                    background: days[i] ? 'var(--accent)' : 'none',
                    color: days[i] ? 'var(--on-accent)' : 'var(--muted)',
                    fontWeight: days[i] ? 600 : 400,
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </Field>

          {mode === MODES[0] && (
            <Field label="بداية المُدَّة" need="اختياري" plain>
              <HijriDatePicker
                label=""
                day={startAt[0]}
                month={startAt[1]}
                year={startAt[2]}
                onChange={(d, m, y) => setStartAt([d, m, y])}
              />
            </Field>
          )}

          {/*
            مربَّع النتيجة. كان نصُّه يخرج عن حدوده أحيانًا، وعلّتُه أنّ
            المربَّع عنصرٌ في عمودٍ مرن، والعنصرُ المرن لا يضيق عن عرض أضيق
            ما فيه (min-content). فإذا وقع في النتيجة ما لا ينكسر — عنوانُ
            كتابٍ طويلٍ يُحكى في الجملة، أو تاريخٌ بأرقامه وأقواسه — اتّسع
            المربَّع عن أبيه فخرج عن حدوده.

            و`overflow-wrap: anywhere` هو الدواء بعينه: يكسر الكلمة عند
            الضرورة، **ويُصغِّر معه حسابَ min-content** — بخلاف
            `break-word` الذي يكسر ولا يُصغِّره، فيبقى الاتّساع على حاله.
            ومعه `min-width: 0` و`max-width: 100%` سدًّا للباب.

            والسطور مضبوطة الطرفين كسائر النصّ المعروض.
          */}
          <div
            style={{
              background: result.wrong ? 'oklch(0.95 0.04 65)' : 'var(--header)',
              border: `1px solid ${result.wrong ? 'oklch(0.82 0.09 65)' : 'transparent'}`,
              borderRadius: 12, padding: '16px 18px',
              fontSize: 14.5, lineHeight: 2.1, minHeight: 64,
              minWidth: 0, width: '100%', maxWidth: '100%',
              // `anywhere` هو الذي يُصغِّر حسابَ min-content معه، لكنّه لا
              // يُعرف في المتصفّحات الأقدم — وأكثرُها في الجوّالات. فيُتبع
              // بـ`break-word` احتياطًا: يكسر ولا يُصغِّر، وكِلا الكسرين
              // يمنع النصّ أن يخرج.
              overflowWrap: 'anywhere', wordBreak: 'break-word',
              /*
               * ولا تُضبط طرفاها: النتيجةُ جملٌ قصار فيها أرقامٌ وتواريخُ
               * لا تنكسر، فيمطّ الضبطُ ما بين كلماتها مطًّا قبيحًا. وقاعدةُ
               * ضبط الطرفين لِما زاد على سطرين من النثر المسترسل، وليست
               * النتيجةُ منه.
               */
              textAlign: 'start', textWrap: 'pretty',
              color: result.wrong ? 'oklch(0.36 0.08 55)' : 'var(--text)',
            }}
          >
            {result.lines.length === 0 ? (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{result.hint}</span>
            ) : (
              result.lines.map((line, i) => (
                <div
                  key={i}
                  style={i === 0 || result.wrong ? undefined : { color: 'var(--accent-soft)', fontWeight: 600 }}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Overlay>
  )
}

/**
 * حقلٌ بعنوانه ووسمِ لزومه، فيُعرف اللازم من الاختياري بنظرة. وما كان جوفُه
 * أزرارًا أو حقولًا متداخلة يُلفّ بـ div لا بـ label: النقر على العنوان
 * يُمرَّر إلى أول عنصرٍ فيه، فيفتح اللوحة أو يقلب اليوم بلا قصد.
 */
function Field(
  { label, need, plain, children }:
  { label: string; need: 'لازم' | 'اختياري'; plain?: boolean; children: React.ReactNode },
) {
  const Tag = plain ? 'div' : 'label'
  return (
    <Tag style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {label}
        <span style={{
          fontSize: 10.5, padding: '1px 7px', borderRadius: 999, fontWeight: 600,
          background: need === 'لازم' ? 'oklch(0.42 0.09 45 / 0.12)' : 'var(--header)',
          color: need === 'لازم' ? 'var(--accent-soft)' : 'var(--muted)',
        }}>
          {need}
        </span>
      </span>
      {children}
    </Tag>
  )
}

function SpanBox(
  { label, value, onChange }: { label: string; value: string; onChange: (v: string) => void },
) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11.5, color: 'var(--muted)' }}>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" style={inputStyle} />
    </label>
  )
}

// ---------------------------------------------------------------- الصياغة

/** «الجمعة والسبت» — واوُ العطف تلتصق بما بعدها */
function joinAr(names: string[]): string {
  return names.join(' و')
}

/**
 * أيام الأسبوع نكرةً مجرورةً بعد «كلّ»: «كلّ خميسٍ وجمعةٍ وسبتٍ». والاثنين
 * مثنّى في أصله فلا يُنوَّن، والثلاثاء والأربعاء ممنوعان من الصرف.
 */
const WEEKDAYS_BOUND = ['أحدٍ', 'اثنينِ', 'ثلاثاءَ', 'أربعاءَ', 'خميسٍ', 'جمعةٍ', 'سبتٍ']

/** أيام القراءة في صياغة المدّة: «كل أيام الأسبوع»، «… إلا الجمعة»، «يومَي كذا فقط» */
function daysPhrase(days: boolean[]): string {
  const on = WEEKDAYS.filter((_, i) => days[i])
  const off = WEEKDAYS.filter((_, i) => !days[i])
  if (off.length === 0) return 'كل أيام الأسبوع'
  if (off.length <= 3) return `كلّ أيام الأسبوع إلا ${joinAr(off)}`
  if (on.length === 1) return `يوم ${on[0]} فقط`
  if (on.length === 2) return `يومَي ${joinAr(on)} فقط`
  return `${joinAr(on)} فقط`
}

/** الصياغة التي تأتي بعد «تقرأ» في طريقة التاريخ المعيَّن */
function shortDaysPhrase(days: boolean[]): string {
  const off = WEEKDAYS.filter((_, i) => !days[i])
  const onBound = WEEKDAYS_BOUND.filter((_, i) => days[i])
  if (off.length === 0) return 'كلّ يوم'
  if (off.length <= 3) return `كلّ يوم إلا ${joinAr(off)}`
  return `كلّ ${joinAr(onBound)}`
}

/** تمييزُ العدد: صفحةً واحدةً، صفحتَين، ٧ صفحاتٍ، ١٥ صفحةً */
function pagesText(n: number): string {
  if (n === 1) return 'صفحةً واحدةً'
  if (n === 2) return 'صفحتَين'
  if (n <= 10) return `${toArabicDigits(n)} صفحاتٍ`
  return `${toArabicDigits(n)} صفحةً`
}

function unitText(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one
  if (n === 2) return two
  if (n <= 10) return `${toArabicDigits(n)} ${few}`
  return `${toArabicDigits(n)} ${many}`
}

/** «شهرٍ و١٠ أيام» */
function spanText(y: number, m: number, d: number): string {
  const parts: string[] = []
  if (y) parts.push(unitText(y, 'سنةٍ', 'سنتَين', 'سنوات', 'سنةً'))
  if (m) parts.push(unitText(m, 'شهرٍ', 'شهرَين', 'أشهر', 'شهرًا'))
  if (d) parts.push(unitText(d, 'يومٍ', 'يومَين', 'أيام', 'يومًا'))
  return joinAr(parts)
}

/** عددُ أيامٍ يُنطق مدّةً: «٢٥ يومًا»، «شهرٍ ويومَين»، «سنةٍ و٣ أشهر و١٩ يومًا» */
function daysAsSpan(n: number): string {
  const y = Math.floor(n / 360)
  const m = Math.floor((n % 360) / 30)
  const d = n % 30
  return spanText(y, m, d) || 'يومٍ واحد'
}

function daysText(n: number): string {
  return unitText(n, 'يومٍ واحد', 'يومَين', 'أيام', 'يومًا')
}

/** اسم الكتاب بين قوسَي الحكاية، فيصحّ إعرابه على حاله */
function bookPhrase(name: string): string {
  const t = name.trim()
  return t ? `كتاب «${t}»` : 'الكتاب'
}

// ---------------------------------------------------------------- الحساب

type Triple = [number | null, number | null, number | null]

interface Input {
  mode: Mode
  total: number
  read: number
  remaining: number
  started: boolean
  days: boolean[]
  spanDays: string
  spanMonths: string
  spanYears: string
  startAt: Triple
  endAt: Triple
  perDay: string
  bookName: string
}

interface Result { lines: string[]; hint: string; wrong?: boolean }

/** يعدّ أيام القراءة في مدّةٍ تبدأ من `start` وطولُها `span` يومًا */
function countReadingDays(start: Date, span: number, days: boolean[]): number {
  let count = 0
  for (let i = 0; i < span; i++) {
    if (days[weekdayOf(addDays(start, i))]) count += 1
  }
  return count
}

/** كم يومًا بالتقويم حتى تستوفي `need` يومًا من أيام القراءة */
function calendarDaysFor(start: Date, need: number, days: boolean[]): number {
  let walked = 0
  let counted = 0
  while (counted < need && walked < 40000) {
    if (days[weekdayOf(addDays(start, walked))]) {
      counted += 1
      if (counted === need) break
    }
    walked += 1
  }
  return walked
}

function toDate(parts: Triple): Date | null {
  const [d, m, y] = parts
  return d && m && y ? hijriToDate(y, m, d) : null
}

/** غدًا: من الغد يبدأ الحساب في طريقتَي التاريخ والمقدار */
function tomorrow(): Date {
  const t = hijriToday()
  return addDays(hijriToDate(t.y, t.m, t.d), 1)
}

function compute(input: Input): Result {
  const { mode, total, read, remaining, started, days, bookName } = input
  const book = bookPhrase(bookName)
  // ما يُقرأ: الكتاب كلُّه، أو ما بقي منه لمن شرع فيه
  const subject = started
    ? `الصفحات الباقية من ${book} وعددها ${pagesText(remaining)}`
    : `${book} كاملًا`
  const object = started
    ? `الصفحات الباقية من ${book} (${pagesText(remaining)})`
    : book

  const none = (hint: string): Result => ({ lines: [], hint })
  const wrong = (...lines: string[]): Result => ({ lines, hint: '', wrong: true })

  if (total <= 0) return none('أدخل عدد صفحات الكتاب لتظهر النتيجة.')
  if (started && read >= total) {
    return wrong(`بلغتَ الصفحة ${toArabicDigits(read)} من ${toArabicDigits(total)}، فالكتاب مختوم أو قارَبَ.`)
  }
  if (days.filter(Boolean).length === 0) {
    return none('اختر يومًا واحدًا على الأقل من أيام الأسبوع.')
  }

  /** المغالطتان اللتان تشتركان في الطرق كلّها */
  function fallacy(reading: number, span: number | null): Result | null {
    if (remaining < reading) {
      const enough = calendarDaysFor(tomorrow(), remaining, days)
      return wrong(
        `هذه مدّةٌ أوسع من الكتاب: ${pagesText(remaining)} على ${daysText(reading)} من القراءة`
        + ' تقعُ دون صفحةٍ في اليوم، ولا يُقرأ أقلُّ من صفحة.',
        `لو قرأتَ صفحةً واحدةً في كلّ يوم قراءة لختمتَه في ${daysText(remaining)} من القراءة`
        + `، أي بعد ${daysAsSpan(enough + 1)} من الغد.`,
      )
    }
    const per = Math.ceil(remaining / reading)
    if (per > MAX_DAILY) {
      const sane = Math.ceil(remaining / HEAVY_DAILY)
      return wrong(
        `هذه مدّةٌ أضيق من الكتاب: تلزمك ${pagesText(per)} في اليوم الواحد، وهذا فوق ما يُقرأ في يوم.`,
        `ولو قرأتَ ${pagesText(HEAVY_DAILY)} في اليوم — وهو وِرْدٌ ثقيل — لاحتجتَ ${daysText(sane)} من القراءة.`
        + (span ? ` وأنت حدّدتَ المدّة في ${daysAsSpan(span)}.` : ''),
      )
    }
    return null
  }

  // ------------------------------------------------- مدّةٌ معيَّنة
  if (mode === MODES[0]) {
    const y = parseNumber(input.spanYears) ?? 0
    const m = parseNumber(input.spanMonths) ?? 0
    const d = parseNumber(input.spanDays) ?? 0
    const span = y * 360 + m * 30 + d
    if (span <= 0) return none('حدِّد المدّة التي تريد ختم الكتاب فيها.')

    const start = toDate(input.startAt)
    // بلا تاريخ بدء لا يُعرف على أيّ يومٍ تقع المدّة، فتُقدَّر أيام القراءة
    const reading = start
      ? countReadingDays(start, span, days)
      : Math.ceil((span * days.filter(Boolean).length) / 7)
    if (reading === 0) return none('لا يقع في هذه المدّة يومٌ من أيام القراءة التي اخترتها.')

    const bad = fallacy(reading, span)
    if (bad) return bad

    const per = Math.ceil(remaining / reading)
    const last = remaining - per * (reading - 1)
    const lines = [
      `لقراءة ${subject} في ${spanText(y, m, d)}، تقرأ ${daysPhrase(days)}:`,
      `فعليك أن تقرأ ${pagesText(per)}، في أيام القراءة.`,
    ]
    if (last > 0 && last < per) lines.push(`ويكون آخرُ يومٍ أخفَّ: ${pagesText(last)}.`)
    if (start) {
      lines.push(`تبدأ ${fullDayLabel(start)}، وتنتهي ${fullDayLabel(addDays(start, span))}.`)
    }
    return { lines, hint: '' }
  }

  // ------------------------------------------------ تاريخٌ معيَّن
  if (mode === MODES[1]) {
    const end = toDate(input.endAt)
    if (!end) return none('اختر تاريخ الخَتْم لتظهر النتيجة.')

    const start = tomorrow()
    const span = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    if (span <= 0) return none('تاريخ الخَتْم قد مضى؛ اختر تاريخًا بعد اليوم.')

    const reading = countReadingDays(start, span, days)
    if (reading === 0) return none('لا يقع قبل هذا التاريخ يومٌ من أيام القراءة التي اخترتها.')

    const bad = fallacy(reading, span)
    if (bad) return bad

    const per = Math.ceil(remaining / reading)
    const last = remaining - per * (reading - 1)
    const lines: string[] = []
    if (started) lines.push(`الباقي من ${book}: ${pagesText(remaining)}.`)
    lines.push(
      `عليك من الغد، أن تقرأ ${shortDaysPhrase(days)} ${pagesText(per)}، حتى تختم في ${shortDayLabel(end)}.`,
      `وذلك ${daysText(reading)} من القراءة، في ${daysText(span)} بالتقويم.`,
    )
    if (last > 0 && last < per) lines.push(`ويكون آخرُ يومٍ أخفَّ: ${pagesText(last)}.`)
    return { lines, hint: '' }
  }

  // ----------------------------------------------- مقدارٌ معيَّن
  const per = parseNumber(input.perDay) ?? 0
  if (per <= 0) return none('حدِّد ما تقرؤه في اليوم لتظهر النتيجة.')
  if (per > MAX_DAILY) {
    return wrong(
      `${pagesText(per)} في اليوم فوق ما يُقرأ. وأثقلُ ما يُحتمل نحو ${pagesText(MAX_DAILY)}.`,
      `ولو قرأتَ ${pagesText(HEAVY_DAILY)} في اليوم لختمتَ ${object} في `
      + `${daysText(Math.ceil(remaining / HEAVY_DAILY))} من القراءة.`,
    )
  }

  const reading = Math.ceil(remaining / per)
  const start = tomorrow()
  const walked = calendarDaysFor(start, reading, days)
  const end = addDays(start, walked)
  const last = remaining - per * (reading - 1)

  const lines = [
    `إذا قرأتَ ${daysPhrase(days)} ${pagesText(per)} من ${object}، ختمتَه بعد ${daysAsSpan(walked + 1)}`
    + `، وذلك ${daysText(reading)} من القراءة.`,
    `وتختمه ${fullDayLabel(end)}.`,
  ]
  if (last > 0 && last < per) lines.push(`ويكون آخرُ يومٍ أخفَّ: ${pagesText(last)}.`)
  return { lines, hint: '' }
}

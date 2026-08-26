// صفحة الهبوط.
//
// تُجمع على شاشةٍ واحدة في الحواسيب فلا تحتاج تمريرًا، وتنساب على الجوّال.
// الصورة محصورةٌ في إطارٍ خلف الشعار والاسم والموضع، وما دونها — الأزرار
// وورقة التقويم وبطاقة الاقتباس — خارج الإطار.
//
// مدخل صاحب المكتبة مخفيّ: ثلاث نقراتٍ على الإطار تفتح نافذة الدخول. لا
// يعرفه إلا من يعرفه، ولا يرى الزائر بابًا مقفلًا.
//
// ------------------------------------------------------------------ الحِمْل
// الصفحة تُرسم قبل أن تصل صورةٌ واحدة، ولا تنتظرها: للإطار زخرفتُه وهالتُه
// فيقوم بنفسه، ثم تحلّ الصورةُ فيه إذا وصلت. وهذا هو الفرق بين انتظارٍ
// صريحٍ يراه الزائر وبين صفحةٍ تامّةٍ تزداد حُسنًا.
//
// ولا يُركَّب في الصفحة من الصور إلا ما يُحتاج إليه: الأولى وحدها في أوّل
// رسم، ثم تُضاف التي تليها **بعد أن تفرغ الأولى من الجلب** فلا تزاحمها على
// شبكةٍ ضيّقة. وكانت تُركَّب كلُّها دفعةً واحدة، فتتقاسم خمسُ صورٍ عرضَ
// الشبكة وتبطؤ أُولاها — وهي وحدها المعروضة.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { makkahMoment } from '../lib/hijri'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import {
  AUTHORS_COUNT, BOOKS_COUNT, LIBRARY_NAME, LIBRARY_PLACE, PRESSES_COUNT,
  countLabel,
} from '../lib/types'
import Footer from '../components/Footer'
import OwnerTools from '../components/OwnerTools'
import {
  BookPlusIcon, BooksIcon, ClockIcon, PinIcon,
  PressIcon, QuillIcon, SearchIcon, SuggestIcon, resolveAsset,
} from '../components/ui'

interface Props {
  onOpenSearch: (query?: string) => void
  onOpenLogin: () => void
}

/** مهلة النقرات الثلاث المتتابعة على الإطار */
const TRIPLE_CLICK_MS = 900

/** زمنُ تلاشي الاقتباس قبل أن يحلّ محلَّه الذي بعده */
const QUOTE_FADE_MS = 320

export default function Landing({ onOpenSearch, onOpenLogin }: Props) {
  const {
    settings, landingImages, landingQuotes, books, authors, publishers, loading,
    isOwner, canEdit,
  } = useLibrary()

  const images = useMemo(
    () => landingImages.filter((img) => img.image_url),
    [landingImages],
  )
  const quotes = useMemo(
    () => landingQuotes.filter((q) => q.text.trim() || q.author.trim()),
    [landingQuotes],
  )

  // ------------------------------------------------------------- الصور
  const [imageIndex, setImageIndex] = useState(0)
  /** ما رُكِّب منها في الصفحة فعلًا — تكبر على مهلها لا دفعةً واحدة */
  const [mounted, setMounted] = useState<string[]>([])
  /** وما فرغ منها المتصفّح من الجلب، فصار يُعرض */
  const [loaded, setLoaded] = useState<string[]>([])

  const markLoaded = useCallback((id: string) => {
    setLoaded((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  // المعروضةُ تُركَّب فورًا: هي وحدها ما يراه الداخل
  useEffect(() => {
    const current = images[imageIndex]
    if (!current) return
    setMounted((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]))
  }, [images, imageIndex])

  // والتي تليها تُركَّب بعد أن تفرغ الحاليّةُ من الجلب، فتكون حاضرةً في
  // موعدها ولم تزاحمها في الطريق
  useEffect(() => {
    const current = images[imageIndex]
    if (!current || !loaded.includes(current.id)) return
    const next = images[(imageIndex + 1) % images.length]
    if (!next) return
    setMounted((prev) => (prev.includes(next.id) ? prev : [...prev, next.id]))
  }, [images, imageIndex, loaded])

  // الصور تتبدّل على مهلها، والاقتباسات على مهلٍ آخر — كلٌّ بمؤقّته.
  // ولا يُنتقل إلا إلى صورةٍ وصلت: الانتقالُ إلى ما لم يصل يُخلي الإطار.
  useEffect(() => {
    if (!settings.auto_rotate || images.length <= 1) return
    const timer = setInterval(() => {
      setImageIndex((i) => {
        for (let step = 1; step < images.length; step++) {
          const candidate = (i + step) % images.length
          if (loaded.includes(images[candidate].id)) return candidate
        }
        return i
      })
    }, Math.max(2, settings.rotate_seconds) * 1000)
    return () => clearInterval(timer)
  }, [settings.auto_rotate, settings.rotate_seconds, images, loaded])

  // ------------------------------------------------------- الاقتباسات
  //
  // البطاقة قائمةٌ لا تتزحزح، وإنما يتلاشى ما فيها ثم يحلّ الذي بعده. وكان
  // القديمُ يُرفع في اللحظة ويُبدأ بإظهار الجديد، فيُرى في الوسط فراغٌ ثم
  // قفزةٌ — وهو الذي كان يُشكى منه. فالآن مرحلتان: يخفت المعروضُ، فإذا خفت
  // بُدِّل النصُّ وأُصعد الجديد.
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [shownQuote, setShownQuote] = useState(0)
  const [fading, setFading] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!settings.auto_rotate || quotes.length <= 1 || paused) return
    const timer = setInterval(
      () => setQuoteIndex((i) => (i + 1) % quotes.length),
      Math.max(2, settings.quote_seconds) * 1000,
    )
    return () => clearInterval(timer)
  }, [settings.auto_rotate, settings.quote_seconds, quotes.length, paused])

  useEffect(() => {
    if (shownQuote === quoteIndex) return
    setFading(true)
    const timer = setTimeout(() => {
      setShownQuote(quoteIndex)
      setFading(false)
    }, QUOTE_FADE_MS)
    return () => clearTimeout(timer)
  }, [quoteIndex, shownQuote])

  // حذفُ صورةٍ أو اقتباسٍ يترك المؤشّر خارج القائمة، فيُردّ إلى أوّلها
  useEffect(() => { if (imageIndex >= images.length) setImageIndex(0) }, [images.length, imageIndex])
  useEffect(() => {
    if (quoteIndex < quotes.length) return
    setQuoteIndex(0)
    setShownQuote(0)
  }, [quotes.length, quoteIndex])

  const quote = quotes[Math.min(shownQuote, Math.max(0, quotes.length - 1))]

  // ------------------------------------------------ المدخل المخفيّ للمالك
  const clickTimes = useRef<number[]>([])
  function countFrameClick() {
    const now = Date.now()
    clickTimes.current = [...clickTimes.current.filter((t) => now - t < TRIPLE_CLICK_MS), now]
    if (clickTimes.current.length >= 3) {
      clickTimes.current = []
      onOpenLogin()
    }
  }

  /** كتابٌ يُنتقى بالقرعة، والانتقال إلى صفحته مباشرة */
  function suggestBook() {
    if (!books.length) return
    const pick = books[Math.floor(Math.random() * books.length)]
    navigate({ name: 'book', id: pick.id })
  }

  return (
    <div className="landing">
      {/* ورقُ الجدران وهالتاه صارا في `body` يعمّان الموقعَ كلَّه، فلا طبقةَ
          خاصّة بالهبوط ههنا */}
      <section className="hero">
        <div className="stage">
          <div className="frame" onClick={countFrameClick}>
            <div className="frame-shots" aria-hidden="true">
              {images.map((img, i) => (
                mounted.includes(img.id) && (
                  <img
                    key={img.id}
                    src={resolveAsset(img.image_url) ?? ''}
                    alt=""
                    // فكّ الصورة خارج خيط الرسم: صورُ الإطار خلفيّةٌ باهتة،
                    // فلا تستحقّ أن تُجمّد الصفحة ريثما تُفكّ
                    decoding="async"
                    // الأولى هي المعروضة أوّلَ ما تُفتح الصفحة، فتُقدَّم على
                    // ما سواها من الطلبات.
                    //
                    // والاسمُ يُكتب صغيرًا كما هو في HTML لا بصيغة React:
                    // React 18 لا يعرف `fetchPriority` فيُسقطه من العنصر
                    // إسقاطًا — ويشكو منه في السجلّ — فيذهب المقصودُ منه
                    // ولا يبلغ المتصفّحَ حرف. وتُعرَف الصيغةُ الأولى في
                    // React 19، فمتى رُقّي رُدَّ إليها.
                    {...{ fetchpriority: i === 0 ? 'high' : 'low' }}
                    onLoad={() => markLoaded(img.id)}
                    // ولو أخفق جلبُها عُدَّت واصلةً: الإطارُ يبقى على زخرفته،
                    // ولا يقف الدورانُ على صورةٍ لا تجيء
                    onError={() => markLoaded(img.id)}
                    className={
                      i === imageIndex && loaded.includes(img.id)
                        ? 'frame-shot frame-shot-on'
                        : 'frame-shot'
                    }
                  />
                )
              ))}
            </div>
            <div className="frame-veil" aria-hidden="true" />
            {/* أركانٌ أربعة تُبَرْوِز اللوحة */}
            <span className="frame-corners" aria-hidden="true">
              <i /><i /><i /><i />
            </span>

            <div className="frame-content">
              <img
                className="hero-logo"
                src={resolveAsset('assets/logo.svg') ?? ''}
                alt="شعار مكتبة سيف العشيرة"
              />
              <h1 className="hero-title">{LIBRARY_NAME}</h1>
              {/* موضع المكتبة يُخفى عن الزوار إن شاء صاحبُها، ويراه هو أبدًا.
                  ولا يظهر قبل وصول الإعدادات: الهبوطُ يُرسم الآن قبلها،
                  وافتراضيُّ الحقل الإظهار — فلو عُرض لبرقَ موضعٌ أخفاه
                  صاحبُها ثم اختفى. وما سواه يُضاف عند وصوله لا يُسحب. */}
              {!loading && (isOwner || settings.show_landing_place) && (
                <p className="hero-place">
                  <PinIcon size={14} />
                  {LIBRARY_PLACE}
                </p>
              )}
            </div>

            {/*
              أعدادُ المكتبة شريطًا في ذيل اللوحة، داخل الإطار لا تحته.
              وموضعُها هذا مقصود: اللوحةُ صندوقٌ ارتفاعُه مضبوط، فما وُضع
              فيه لا يكلّف الصدرَ ارتفاعًا — فتبقى صفحةُ الهبوط شاشةً واحدة
              بلا تمرير كما هي. وكانت صفًّا تحت الأزرار فزادت في طوله فلم
              يعد يسع الشاشةَ القصيرة، فوقع بعضُه على بطاقة الاقتباس.

              وما كان صفرًا لا يُعرض: لوحٌ يقول «لا كتاب في المكتبة» ليس خبرًا.
            */}
            {settings.show_landing_stats && books.length > 0 && (
              <div className="frame-tally">
                <span className="frame-tally-item">
                  <BooksIcon size={14} />
                  {countLabel(books.length, BOOKS_COUNT)}
                </span>
                {authors.length > 0 && (
                  <span className="frame-tally-item">
                    <QuillIcon size={14} />
                    {countLabel(authors.length, AUTHORS_COUNT)}
                  </span>
                )}
                {publishers.length > 0 && (
                  <span className="frame-tally-item">
                    <PressIcon size={14} />
                    {countLabel(publishers.length, PRESSES_COUNT)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* كل زرٍّ أيقونةٌ وحدها، واسمه ينزلق من تحتها عند التمرير */}
          <div className="hero-actions">
            <button
              type="button"
              className="hero-btn hero-btn-main"
              onClick={() => navigate({ name: 'browse' })}
              title="الدخول إلى المكتبة"
              aria-label="الدخول إلى المكتبة"
            >
              <BooksIcon size={21} />
              <span>الدخول إلى المكتبة</span>
            </button>

            <button
              type="button"
              className="hero-btn"
              onClick={() => onOpenSearch()}
              title="ابحث عن كتاب"
              aria-label="ابحث عن كتاب"
            >
              <SearchIcon size={19} />
              <span>ابحث عن كتاب</span>
            </button>

            {canEdit && (
              <button
                type="button"
                className="hero-btn"
                onClick={() => navigate({ name: 'add' })}
                title="إضافة كتاب"
                aria-label="إضافة كتاب"
              >
                <BookPlusIcon size={20} />
                <span>إضافة كتاب</span>
              </button>
            )}

            <button
              type="button"
              className="hero-btn"
              onClick={suggestBook}
              disabled={books.length === 0}
              title={books.length === 0 ? 'لا كتب في الفهرس بعد' : 'اقترح لي كتابًا — بالقرعة'}
              aria-label="اقترح لي كتابًا"
            >
              <SuggestIcon size={21} />
              <span>اقترح لي كتابًا</span>
            </button>
          </div>

        </div>

        {/* أدوات صاحب المكتبة في فراغ الهبوط عن يمين الصورة، لا في الرأس:
            الزائر لا يرى منها شيئًا أصلًا. والقطعةُ هي نفسُها التي تظهر
            مطويّةً في زاوية سائر الصفحات، فلا يفترق اسمٌ ولا سلوك. */}
        <OwnerTools place="nook" />

        <CalendarLeaf />
      </section>

      {settings.show_landing_quote && quote && (
        <section className="quote-wrap">
          <figure
            className="quote-card"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            <span className="quote-mark quote-mark-open" aria-hidden="true">”</span>
            <span className="quote-mark quote-mark-close" aria-hidden="true">“</span>

            {/* المفتاحُ على جوف البطاقة لا على البطاقة: البطاقةُ قائمةٌ لا
                تتزحزح، وإنما يتلاشى ما فيها ويحلّ محلَّه الآخر. ولو كان
                المفتاحُ عليها لأُعيد بناؤها كلَّها عند كل تبديل، فرآها
                القارئُ تختفي وتظهر — وهي في موضعها لم تبرح. */}
            <div className={fading ? 'quote-body quote-body-out' : 'quote-body'}>
              <blockquote className="quote-text">{quote.text}</blockquote>

              {quote.author && (
                <figcaption className="quote-source">
                  <span className="quote-rule" aria-hidden="true" />
                  {quote.author}
                  <span className="quote-rule quote-rule-flip" aria-hidden="true" />
                </figcaption>
              )}
            </div>

            {quotes.length > 1 && (
              <div className="quote-dots">
                {quotes.map((q, i) => (
                  <button
                    key={q.id}
                    type="button"
                    aria-label={`الاقتباس ${i + 1}`}
                    aria-current={i === quoteIndex}
                    onClick={() => setQuoteIndex(i)}
                    className={i === quoteIndex ? 'quote-dot quote-dot-on' : 'quote-dot'}
                  />
                ))}
              </div>
            )}

            {/* خيطٌ يقطع عرض البطاقة بمقدار ما بقي من مهلة الاقتباس: التبديلُ
                يصير متوقَّعًا فلا يُفاجئ القارئ في وسط سطر. ويقف متى وقف
                المؤشّر على البطاقة. */}
            {quotes.length > 1 && settings.auto_rotate && (
              <span
                key={quoteIndex}
                className="quote-progress"
                aria-hidden="true"
                style={{
                  animationDuration: `${Math.max(2, settings.quote_seconds)}s`,
                  animationPlayState: paused ? 'paused' : 'running',
                }}
              />
            )}
          </figure>
        </section>
      )}

      <Footer />
    </div>
  )
}

/**
 * ورقة التقويم: تاريخ مكة الهجريّ وساعتها، بالأرقام العربية الهندية.
 * تُحدَّث كل ثانية، ولا تتبع ساعة جهاز الزائر.
 */
function CalendarLeaf() {
  const [moment, setMoment] = useState(() => makkahMoment())

  useEffect(() => {
    const timer = setInterval(() => setMoment(makkahMoment()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <aside className="cal" aria-label="تاريخ مكة المكرمة وساعتها">
      {/* حلقتا التعليق: ما يجعلها ورقةَ تقويمٍ لا بطاقةً */}
      <span className="cal-rings" aria-hidden="true">
        <span /><span />
      </span>

      <div className="cal-band">{moment.weekday}</div>

      <div className="cal-body">
        <div className="cal-day">{moment.day}</div>
        <div className="cal-date">{moment.month} {moment.year} هـ</div>

        <div className="cal-clock">
          <ClockIcon size={12} />
          <span className="cal-time">{moment.time}</span>
          <span className="cal-meridiem">{moment.meridiem}</span>
        </div>
        <div className="cal-zone">بتوقيت مكة المكرمة</div>
      </div>
    </aside>
  )
}

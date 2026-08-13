// صفحة الهبوط.
//
// أربعة أقسام: صدرٌ فيه الشعار واسم المكتبة وأزرارها فوق صورٍ تتبدّل، وورقة
// تقويمٍ في الركن الأيسر بتوقيت مكة، ثم بطاقة الاقتباس، ثم الذيل.
//
// مدخل صاحب المكتبة مخفيٌّ هنا: ثلاث نقراتٍ على صورة الخلفية تفتح نافذة
// الدخول. لا يعرفه إلا من يعرفه، ولا يرى الزائر بابًا مقفلًا.

import { useEffect, useMemo, useRef, useState } from 'react'
import { makkahMoment } from '../lib/hijri'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { LIBRARY_NAME } from '../lib/types'
import Footer from '../components/Footer'
import {
  BooksIcon, ClockIcon, SearchIcon, SuggestIcon, resolveAsset,
} from '../components/ui'

interface Props {
  onOpenSearch: (query?: string) => void
  onOpenLogin: () => void
}

/** مهلة النقرات الثلاث المتتابعة على الصورة */
const TRIPLE_CLICK_MS = 900

export default function Landing({ onOpenSearch, onOpenLogin }: Props) {
  const { settings, landingImages, landingQuotes, books } = useLibrary()

  const images = useMemo(
    () => landingImages.filter((img) => img.image_url),
    [landingImages],
  )
  const quotes = useMemo(
    () => landingQuotes.filter((q) => q.text.trim() || q.author.trim()),
    [landingQuotes],
  )

  const [imageIndex, setImageIndex] = useState(0)
  const [quoteIndex, setQuoteIndex] = useState(0)

  // الصور تتبدّل على مهلها، والاقتباسات على مهلٍ آخر — كلٌّ بمؤقّته
  useEffect(() => {
    if (!settings.auto_rotate || images.length <= 1) return
    const timer = setInterval(
      () => setImageIndex((i) => (i + 1) % images.length),
      Math.max(2, settings.rotate_seconds) * 1000,
    )
    return () => clearInterval(timer)
  }, [settings.auto_rotate, settings.rotate_seconds, images.length])

  useEffect(() => {
    if (!settings.auto_rotate || quotes.length <= 1) return
    const timer = setInterval(
      () => setQuoteIndex((i) => (i + 1) % quotes.length),
      Math.max(2, settings.quote_seconds) * 1000,
    )
    return () => clearInterval(timer)
  }, [settings.auto_rotate, settings.quote_seconds, quotes.length])

  // حذفُ صورةٍ أو اقتباسٍ يترك المؤشّر خارج القائمة، فيُردّ إلى أوّلها
  useEffect(() => { if (imageIndex >= images.length) setImageIndex(0) }, [images.length, imageIndex])
  useEffect(() => { if (quoteIndex >= quotes.length) setQuoteIndex(0) }, [quotes.length, quoteIndex])

  const quote = quotes[Math.min(quoteIndex, Math.max(0, quotes.length - 1))]

  // ------------------------------------------------ المدخل المخفيّ للمالك
  const clickTimes = useRef<number[]>([])
  function countBackdropClick() {
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
    <>
      <section className="hero">
        <div className="hero-bg" onClick={countBackdropClick} aria-hidden="true">
          {images.map((img, i) => (
            <img
              key={img.id}
              src={resolveAsset(img.image_url) ?? ''}
              alt=""
              className={i === imageIndex ? 'hero-shot hero-shot-on' : 'hero-shot'}
            />
          ))}
        </div>
        <div className="hero-scrim" />

        <div className="hero-content">
          <img
            className="hero-logo"
            src={resolveAsset('assets/logo.svg') ?? ''}
            alt="شعار مكتبة سيف العشيرة"
          />
          <h1 className="hero-title">{LIBRARY_NAME}</h1>

          <div className="hero-actions">
            <button type="button" className="hero-btn hero-btn-main" onClick={() => navigate({ name: 'browse' })}>
              <BooksIcon size={19} />
              الدخول إلى المكتبة
            </button>
            <button type="button" className="hero-btn" onClick={() => onOpenSearch()}>
              <SearchIcon size={17} />
              ابحث عن كتاب
            </button>
            <button
              type="button"
              className="hero-btn"
              onClick={suggestBook}
              disabled={books.length === 0}
              title={books.length === 0 ? 'لا كتب في الفهرس بعد' : 'كتابٌ بالقرعة'}
            >
              <SuggestIcon size={19} />
              اقترح لي كتابًا
            </button>
          </div>
        </div>

        <CalendarLeaf />
      </section>

      {settings.show_landing_quote && quote && (
        <section className="quote-wrap">
          <figure className="quote-card">
            <span className="quote-mark" aria-hidden="true">”</span>

            <blockquote className="quote-text">{quote.text}</blockquote>

            {quote.author && (
              <figcaption className="quote-source">
                <span className="quote-rule" aria-hidden="true" />
                {quote.author}
              </figcaption>
            )}

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
          </figure>
        </section>
      )}

      <Footer />
    </>
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
    <aside className="cal-leaf" aria-label="تاريخ مكة المكرمة وساعتها">
      <div className="cal-top">{moment.weekday}</div>
      <div className="cal-day">{moment.day}</div>
      <div className="cal-month">{moment.month}</div>
      <div className="cal-year">{moment.year} هـ</div>

      <div className="cal-time">
        <ClockIcon size={13} />
        <span className="cal-clock">{moment.time}</span>
        <span className="cal-meridiem">{moment.meridiem}</span>
      </div>
      <div className="cal-zone">بتوقيت مكة المكرمة</div>
    </aside>
  )
}

// صفحة «عن المكتبة». نصّها بقلم صاحب المكتبة: يُقرأ من الإعدادات
// (`about_text`) إن كتب فيها شيئًا، وإلّا فالنصّ المعتمَد في `types.ts`.
//
// وتنسيقُه ليس فقراتٍ متساوية: للنصّ وجوهٌ يُفرَّق بينها — البسملة سطرٌ مفرد
// مزخرف، وخاتمةُ الصلاة سطرٌ موسَّط، والتوقيع كتلةٌ في آخر الصفحة كما يوقّع
// الكاتب في آخر ورقته. وما بينهما فقراتُ المتن، أولاها بحرفٍ مُصدَّر.

import { useMemo } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import {
  AUTHORS_COUNT, BOOKS_COUNT, LIBRARY_NAME, aboutTextOf, countLabel,
} from '../lib/types'
import Footer from '../components/Footer'
import { ChartIcon, resolveAsset } from '../components/ui'

/** ما ينقسم إليه نصّ الصفحة، ولكلّ وجهٍ تنسيقُه */
interface AboutParts {
  /** العنوان في صدر النصّ، إن كان اسم المكتبة نفسه — فلا يُكرَّر تحته */
  title: string | null
  /** البسملة */
  basmala: string | null
  /** فقرات المتن */
  body: string[]
  /** «وصلى الله على نبيِّنا مُحمَّد» ونحوها */
  closing: string | null
  /** سطور التوقيع والتاريخ */
  signature: string[]
}

/**
 * يقسم النصّ على وجوهه. والتعرُّف على كلّ وجهٍ بأمارته لا بموضعه، فيبقى
 * التنسيق قائمًا وإن غيَّر صاحبُ المكتبة نصَّه أو رتّبه على غير هذا.
 */
function splitAbout(text: string): AboutParts {
  const blocks = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const parts: AboutParts = { title: null, basmala: null, body: [], closing: null, signature: [] }

  blocks.forEach((block, i) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)

    // عنوانٌ في الصدر: سطرٌ واحد قصير فيه اسم المكتبة
    if (i === 0 && lines.length === 1 && block.length < 60 && block.includes('مكتبة')) {
      parts.title = block
      return
    }
    if (/^بسم\s+الله/.test(block)) { parts.basmala = block; return }
    // الصلاة على النبيّ ﷺ خاتمةٌ توسَّط، ولا تُخلط بفقرات المتن
    if (lines.length === 1 && /^وصلى\s+الله/.test(block)) { parts.closing = block; return }
    // التوقيع: آخرُ كتلةٍ فيها اسم الكاتب أو تاريخٌ هجريّ
    const isLast = i === blocks.length - 1
    if (isLast && (/هـ\s*\.?$/.test(block) || block.includes('العشيرة،'))) {
      parts.signature = lines
      return
    }
    parts.body.push(block)
  })

  return parts
}

export default function About() {
  const { settings, books, authors, isOwner } = useLibrary()
  // مدخل الإحصائيات صار من هنا لا من الرأس
  const canSeeStats = isOwner || settings.visibility.stats

  const parts = useMemo(() => splitAbout(aboutTextOf(settings.about_text)), [settings.about_text])

  const authorCount = new Set(books.map((b) => b.author_name).filter(Boolean)).size

  return (
    <>
      <main className="app-main about-main">
        <header className="about-head">
          <img
            className="about-logo"
            src={resolveAsset('assets/logo.svg') ?? ''}
            alt="شعار مكتبة سيف العشيرة"
          />
          {/* النقطة تُحذف من العنوان وحده: العناوين لا تُنقَّط، والنصّ
              في موضعه على حاله */}
          <h1 className="about-title">{(parts.title ?? LIBRARY_NAME).replace(/\.$/, '')}</h1>
          {settings.landing_tagline && (
            <p className="about-tagline">{settings.landing_tagline}</p>
          )}
          <span className="about-rule" aria-hidden="true" />
        </header>

        <article className="about-body">
          {parts.basmala && (
            <p className="about-basmala">{parts.basmala}</p>
          )}

          {parts.body.length === 0 && !parts.basmala && !parts.closing ? (
            <p className="about-empty">لم يُكتب تعريف المكتبة بعد.</p>
          ) : (
            parts.body.map((p, i) => (
              // الفقرة الأولى بحرفٍ مُصدَّر، كما تُفتتح صفحات الكتب
              <p key={i} className={i === 0 ? 'about-lead' : undefined}>{p}</p>
            ))
          )}

          {parts.closing && <p className="about-closing">{parts.closing}</p>}

          {parts.signature.length > 0 && (
            <footer className="about-sign">
              <span className="about-sign-rule" aria-hidden="true" />
              {parts.signature.map((line, i) => (
                <p key={i} className={i === 0 ? 'about-sign-name' : 'about-sign-date'}>
                  {line}
                </p>
              ))}
            </footer>
          )}
        </article>

        {/* العدد جملةٌ تامّة لا رقمٌ يليه اسم: «كتابٌ واحد» لا «١ كتابًا» */}
        <div className="about-figures">
          {([
            [countLabel(books.length, BOOKS_COUNT), 'في الفهرس'],
            [countLabel(authorCount || authors.length, AUTHORS_COUNT), 'لهم فيه كتاب'],
          ] as const).map(([value, caption]) => (
            <div key={caption} className="about-figure">
              <span className="about-figure-value">{value}</span>
              <span className="about-figure-label">{caption}</span>
            </div>
          ))}
        </div>

        {canSeeStats && (
          <div className="about-stats-link">
            <button type="button" onClick={() => navigate({ name: 'stats' })}>
              <ChartIcon size={17} />
              إحصائيات المكتبة بالتفصيل
            </button>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}

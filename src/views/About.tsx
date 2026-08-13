// صفحة «عن المكتبة». نصّها في الإعدادات (`about_text`) ليكتب صاحب المكتبة ما
// شاء دون أن يُمسّ الملف، وفقراتها ما فصله سطرٌ فارغ.

import { useLibrary } from '../lib/library'
import { LIBRARY_NAME } from '../lib/types'
import Footer from '../components/Footer'
import { resolveAsset } from '../components/ui'

export default function About() {
  const { settings, books, authors } = useLibrary()

  const paragraphs = settings.about_text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

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
          <h1 className="about-title">{LIBRARY_NAME}</h1>
          {settings.landing_tagline && (
            <p className="about-tagline">{settings.landing_tagline}</p>
          )}
          <span className="about-rule" aria-hidden="true" />
        </header>

        <article className="about-body">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p className="about-empty">لم يُكتب تعريف المكتبة بعد.</p>
          )}
        </article>

        <div className="about-figures">
          {([
            [books.length, 'كتابٌ مفهرس'],
            [authorCount || authors.length, 'مؤلِّفًا'],
          ] as const).map(([value, label]) => (
            <div key={label} className="about-figure">
              <span className="about-figure-value">{value}</span>
              <span className="about-figure-label">{label}</span>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </>
  )
}

// الذيل: أعدادُ المكتبة، ثم سطر الحقوق بالسنة الهجرية وبإزائه سبيلُ التواصل
// مع صاحب المكتبة. والرابط الفارغ لا يُعرض أصلًا، فلا يظهر زرٌّ لا يذهب إلى
// شيء.
//
// وأعدادُ المكتبة ههنا لا في جوف إطار الهبوط: كانت شريطًا في ذيل اللوحة
// فوقعت تحت سطر الموضع مباشرةً فزاحمته — واللوحةُ صندوقٌ ارتفاعُه مضبوط، فما
// طال محتواه ضاق عنه. والتذييلُ موضعُها: هو أسفلُ الصفحة على الحقيقة، وهو
// دون الطيّة أصلًا فلا يكلّف الصدرَ ارتفاعًا — وذلك كان مقصودَ وضعها في
// اللوحة أوّلَ مرّة.
//
// وهي في سطر الحقوق نفسِه، بينه وبين سبيل التواصل: كانت سطرًا فوقه فطال
// الذيلُ سطرًا كاملًا، وصفحةُ الهبوط شاشةٌ واحدة بلا تمرير — فما زِيد في
// ذيلها اقتُطع من صدرها.

import { bookCount } from '../lib/editions'
import { makkahMoment } from '../lib/hijri'
import { useLibrary } from '../lib/library'
import { countAuthors } from '../lib/people'
import {
  AUTHORS_COUNT, BOOKS_COUNT, LIBRARY_NAME, PRESSES_COUNT, countLabel,
} from '../lib/types'
import { BooksIcon, PressIcon, QuillIcon, TelegramIcon, XIcon } from './ui'

/**
 * `tally` يطلب شريطَ الأعداد. وهو للهبوط وحده: صفحةُ «عن المكتبة» تعرض
 * أعدادَها في لوحها الخاصّ، فلو عُرضت ههنا أيضًا لتكرَّر الرقمُ في صفحةٍ
 * واحدة.
 */
export default function Footer({ tally = false }: { tally?: boolean }) {
  const { settings, books, authors, publishers } = useLibrary()

  // السنة تُقرأ مرّةً عند العرض: لا داعي لمؤقّتٍ من أجل رقمٍ يتبدّل مرّةً في العام
  const year = makkahMoment().year

  // المؤلِّفون مَن له تأليفٌ مسجَّل لا أهلُ السجلّ كلُّهم: فيه المحقِّقُ ومن
  // على صفته، وعدُّه كلِّه يجعلهم مؤلِّفين وليسوا كذلك.
  const authorTotal = countAuthors(books, authors)

  // وعددُ الكتب عددُ عناوينها: النشرتان لكتابٍ واحد عنوانٌ واحد، والمجموعةُ
  // لا تُعدّ وإنما يُعدّ ما طُبع فيها. ومَرْجِعُه `editions.bookCount` في كل
  // موضع، فلا يختلف رقمانِ عن شيءٍ واحد.
  const bookTotal = bookCount(books)

  // وما كان صفرًا لا يُعرض: لوحٌ يقول «لا كتاب في المكتبة» ليس خبرًا
  const figures = [
    { key: 'books', icon: <BooksIcon size={14} />, text: countLabel(bookTotal, BOOKS_COUNT), n: bookTotal },
    { key: 'authors', icon: <QuillIcon size={14} />, text: countLabel(authorTotal, AUTHORS_COUNT), n: authorTotal },
    { key: 'presses', icon: <PressIcon size={14} />, text: countLabel(publishers.length, PRESSES_COUNT), n: publishers.length },
  ].filter((f) => f.n > 0)

  const showTally = tally && settings.show_landing_stats && figures.length > 0

  const links = [
    { url: settings.x_url, label: 'إكس', icon: <XIcon size={14} /> },
    { url: settings.telegram_url, label: 'تلجرام', icon: <TelegramIcon size={15} /> },
  ].filter((l) => l.url.trim())

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span className="footer-ornament" aria-hidden="true">
          <span className="footer-line" />
          <span className="footer-lozenge" />
          <span className="footer-line" />
        </span>

        {/* والأعدادُ في سطر الحقوق نفسِه لا فوقه: صفحةُ الهبوط شاشةٌ واحدة
            بلا تمرير، وكلُّ سطرٍ يُزاد في ذيلها يُقتطع من صدرها. */}
        <div className={`footer-row${showTally ? ' footer-row-tally' : ''}`}>
          <p className="footer-copy">
            <span className="footer-name">{LIBRARY_NAME}</span>
            <span className="footer-sep" aria-hidden="true">◆</span>
            <span>© جميع الحقوق محفوظة</span>
            <span className="footer-sep" aria-hidden="true">◆</span>
            <span className="footer-year">{year} هـ</span>
          </p>

          {showTally && (
            <div className="footer-tally">
              {figures.map((f) => (
                <span key={f.key} className="footer-tally-item">
                  {f.icon}
                  {f.text}
                </span>
              ))}
            </div>
          )}

          {links.length > 0 && (
            <div className="footer-contact">
              <span className="footer-contact-label">التواصل مع صاحب المكتبة</span>
              <span className="footer-links">
                {links.map((l) => (
                  <a
                    key={l.label}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="footer-link"
                    title={`سيف العشيرة على ${l.label}`}
                    aria-label={`سيف العشيرة على ${l.label}`}
                  >
                    {l.icon}
                    <span>{l.label}</span>
                  </a>
                ))}
              </span>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}

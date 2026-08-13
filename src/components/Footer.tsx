// الذيل: سطر الحقوق بالسنة الهجرية، وبإزائه سبيلُ التواصل مع صاحب المكتبة.
// الرابط الفارغ لا يُعرض أصلًا، فلا يظهر زرٌّ لا يذهب إلى شيء.

import { makkahMoment } from '../lib/hijri'
import { useLibrary } from '../lib/library'
import { LIBRARY_NAME } from '../lib/types'
import { TelegramIcon, XIcon } from './ui'

export default function Footer() {
  const { settings } = useLibrary()

  // السنة تُقرأ مرّةً عند العرض: لا داعي لمؤقّتٍ من أجل رقمٍ يتبدّل مرّةً في العام
  const year = makkahMoment().year

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

        <div className="footer-row">
          <p className="footer-copy">
            <span className="footer-name">{LIBRARY_NAME}</span>
            <span className="footer-sep" aria-hidden="true">◆</span>
            <span>جميع الحقوق محفوظة</span>
            <span className="footer-sep" aria-hidden="true">◆</span>
            <span className="footer-year">{year} هـ</span>
          </p>

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

// ذيل صفحة الهبوط: سطر الحقوق، وبجانبه روابط التواصل مع صاحب المكتبة.
// الرابط الفارغ لا يُعرض أصلًا، فلا يظهر زرٌّ لا يذهب إلى شيء.

import { useLibrary } from '../lib/library'
import { LIBRARY_NAME } from '../lib/types'
import { TelegramIcon, XIcon } from './ui'

export default function Footer() {
  const { settings } = useLibrary()

  const links = [
    { url: settings.x_url, label: 'إكس', icon: <XIcon size={15} /> },
    { url: settings.telegram_url, label: 'تلجرام', icon: <TelegramIcon size={16} /> },
  ].filter((l) => l.url.trim())

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span className="footer-rule" aria-hidden="true" />

        <div className="footer-row">
          <p className="footer-copy">
            © جميع الحقوق محفوظة — <span className="footer-name">{LIBRARY_NAME}</span>
          </p>

          {links.length > 0 && (
            <div className="footer-links">
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
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}

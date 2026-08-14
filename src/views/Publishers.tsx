// دُوْر النَّشْر: سجلٌّ مستقلٌّ للدار لا يتكرّر مع كل كتاب.
//
// الصفحة على هيئة صفحة المؤلِّفين: بطاقةٌ لكل دار تُدخِل إلى صفحتها، وفيها
// شعارُها وبياناتُها وكتبُها. والتعديل داخل صفحة الدار وحدها، فبطاقةُ الفهرس
// عرضٌ لا نموذجُ إدخال.
//
// ومكان الدار مُثبَتٌ هنا لا في الكتاب: يُكتب مرةً أولى ثم يُملأ تلقائيًّا في
// كل كتابٍ نشرَته. وتعديلُ الاسم أو المكان يسري على كتبها كلِّها، يتكفّل به
// `catalog.updatePublisher` في الخادم.

import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import ImageSlot from '../components/ImageSlot'
import {
  BackButton, DebouncedInput, DebouncedTextarea, EmptyState, PressIcon,
  cardStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, resolveAsset,
} from '../components/ui'

/** عدد كتب كل دارٍ في المكتبة، مفتاحُه معرّف الدار */
function useCounts() {
  const { books } = useLibrary()
  return useMemo(() => {
    const map = new Map<string, number>()
    books.forEach((b) => {
      if (b.publisher_id) map.set(b.publisher_id, (map.get(b.publisher_id) ?? 0) + 1)
    })
    return map
  }, [books])
}

/** شعار الدار، أو حرفُ اسمها الأول حين لا شعار */
function Logo({ url, name, size }: { url: string | null; name: string; size: number }) {
  const resolved = resolveAsset(url)
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, flex: 'none', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--header)', border: '1px solid var(--border)',
    }}>
      {resolved ? (
        <img
          src={resolved}
          alt={`شعار ${name}`}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <span style={{ color: 'var(--accent-soft)', opacity: 0.6, display: 'flex' }}>
          <PressIcon size={Math.round(size * 0.5)} />
        </span>
      )}
    </div>
  )
}

// ============================================================ فهرس دُور النشر
export default function Publishers() {
  const { publishers, canEdit, run, reload } = useLibrary()
  const counts = useCounts()

  const [newName, setNewName] = useState('')
  const [newPlace, setNewPlace] = useState('')
  const [busy, setBusy] = useState(false)

  async function addPublisher() {
    const name = newName.trim()
    if (!name || busy) return
    setBusy(true)
    await run(async () => {
      await api.findOrCreatePublisher(name, newPlace.trim())
      await reload()
    })
    setNewName('')
    setNewPlace('')
    setBusy(false)
  }

  return (
    <main className="app-main" style={{ maxWidth: 1120, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>
        دُوْر النَّشْر
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)' }}>
        كل دارٍ تُكتب مرةً واحدة ببلدها، ثم يأتي بلدُها مع كل كتابٍ نشرَته.
        اضغط على دارٍ لتصفَّح كتبها{canEdit && ' وتعديل بياناتها وشعارها'}.
      </p>

      {canEdit && (
        <div
          className="form-row"
          style={{
            ...cardStyle, borderRadius: 12, padding: 16, marginBottom: 20,
            display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) auto', gap: 12, alignItems: 'end',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            اسم الدار
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: دار المِنهاج"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            بلدها
            <input
              value={newPlace}
              onChange={(e) => setNewPlace(e.target.value)}
              placeholder="مثال: جدة"
              style={inputStyle}
            />
          </label>
          <button
            type="button"
            onClick={() => void addPublisher()}
            disabled={!newName.trim() || busy}
            style={primaryButtonStyle(!!newName.trim() && !busy)}
          >
            {busy ? '…جارٍ الحفظ' : 'إضافة دار'}
          </button>
        </div>
      )}

      {publishers.length === 0 ? (
        <EmptyState
          title="لا دُور نشرٍ بعد"
          hint="تُسجَّل الدار أوّلَ ما يُضاف كتابٌ من نشرها، أو تُضاف هنا ابتداءً."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
          {publishers.map((p) => (
            <div
              key={p.id}
              className="author-card"
              onClick={() => navigate({ name: 'publisher', id: p.id })}
              style={{
                ...cardStyle, cursor: 'pointer', borderRadius: 12, padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: 13,
              }}
            >
              <Logo url={p.logo_url ?? null} name={p.name} size={52} />
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{
                  fontFamily: 'var(--heading-font)', fontSize: 17.5, fontWeight: 700, lineHeight: 1.35,
                }}>
                  {p.name}
                </div>
                {p.place && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{p.place}</div>}
                <div style={{ fontSize: 12.5, color: 'var(--accent-soft)', fontWeight: 600 }}>
                  {counts.get(p.id) ?? 0} كتاب في المكتبة
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

// ================================================================ صفحة الدار
export function PublisherPage({ publisherId }: { publisherId: string }) {
  const { publishers, books, canEdit, run, reload } = useLibrary()
  const publisher = publishers.find((p) => p.id === publisherId)

  const houseBooks = useMemo(
    () => books
      .filter((b) => b.publisher_id === publisherId)
      .sort((a, b) => a.title.localeCompare(b.title, 'ar')),
    [books, publisherId],
  )

  if (!publisher) {
    return (
      <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
        <BackButton label="العودة إلى دُوْر النَّشْر" onClick={() => navigate({ name: 'publishers' })} />
        <EmptyState title="لم يُعثَر على هذه الدار" hint="قد تكون حُذفت، أو أنها غير ظاهرةٍ للزوار." />
      </main>
    )
  }

  const p = publisher
  const save = (patch: Parameters<typeof api.updatePublisher>[1]) =>
    void run(() => api.updatePublisher(p.id, patch))

  return (
    <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
      <BackButton label="العودة إلى دُوْر النَّشْر" onClick={() => navigate({ name: 'publishers' })} />

      <div style={{ ...cardStyle, borderRadius: 14, padding: '24px 26px', marginBottom: 26 }}>
        <div className="publisher-head" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
          {/* الشعار يُرفع من هنا وحدها، كما تُعدَّل بقيّة بيانات الدار */}
          <div style={{ flex: 'none' }}>
            {canEdit ? (
              <>
                <div style={{
                  width: 110, height: 110, borderRadius: 12, overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}>
                  <ImageSlot
                    url={p.logo_url ?? null}
                    folder="publishers"
                    canEdit
                    placeholder="شعار الدار"
                    onUploaded={(url) => save({ logo_url: url })}
                  />
                </div>
                {p.logo_url && (
                  <button
                    type="button"
                    onClick={() => save({ logo_url: null })}
                    style={{
                      marginTop: 7, border: '1px solid var(--border)', background: 'none',
                      color: 'var(--muted)', borderRadius: 8, padding: '4px 10px', fontSize: 11.5,
                      width: '100%',
                    }}
                  >
                    إزالة الشعار
                  </button>
                )}
              </>
            ) : (
              <Logo url={p.logo_url ?? null} name={p.name} size={110} />
            )}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 30, fontWeight: 700, margin: '0 0 6px' }}>
              {p.name}
            </h1>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {p.place && <span>{p.place}</span>}
              {p.founded && <span>تأسّست: {p.founded}</span>}
              <span style={{ color: 'var(--accent-soft)', fontWeight: 600 }}>
                {houseBooks.length} كتاب في المكتبة
              </span>
            </div>
          </div>
        </div>

        {canEdit ? (
          <>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14, marginBottom: 14 }}>
              <label style={fieldLabel}>
                اسم الدار
                <DebouncedInput
                  value={p.name}
                  onCommit={(v) => save({ name: v.trim() || p.name })}
                  style={{ ...inputStyle, fontFamily: 'var(--heading-font)', fontWeight: 700 }}
                />
              </label>
              <label style={fieldLabel}>
                بلدها
                <DebouncedInput
                  value={p.place}
                  onCommit={(v) => save({ place: v.trim() })}
                  style={inputStyle}
                />
              </label>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14, marginBottom: 14 }}>
              <label style={fieldLabel}>
                سنة التأسيس
                <DebouncedInput
                  value={p.founded}
                  onCommit={(v) => save({ founded: v.trim() })}
                  style={inputStyle}
                />
              </label>
              <label style={fieldLabel}>
                الموقع
                <DebouncedInput
                  value={p.website}
                  onCommit={(v) => save({ website: v.trim() })}
                  dir="ltr"
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={fieldLabel}>
              ملاحظات عن الدار
              <DebouncedTextarea
                value={p.notes}
                onCommit={(v) => save({ notes: v })}
                style={{ ...inputStyle, minHeight: 80, lineHeight: 1.9, resize: 'vertical' }}
              />
            </label>

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 16 }}>
              {/* الحذف يفكّ الدار عن كتبها ويُبقي اسمها مكتوبًا عليها */}
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`حذف «${p.name}»؟ يبقى اسمها على كتبها ويسقط ربطُها بسجلّها.`)) return
                  void run(async () => {
                    await api.removePublisher(p.id)
                    await reload()
                    navigate({ name: 'publishers' })
                  })
                }}
                style={{ ...ghostButtonStyle, fontSize: 12, padding: '6px 12px' }}
              >
                حذف الدار
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {p.website && (
              <a href={p.website} target="_blank" rel="noreferrer" dir="ltr" style={{ fontSize: 13, color: 'var(--accent-soft)' }}>
                {p.website}
              </a>
            )}
            {p.notes && <div style={{ fontSize: 14.5, lineHeight: 2, whiteSpace: 'pre-line' }}>{p.notes}</div>}
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'var(--heading-font)', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        كتبُها في مكتبتي ({houseBooks.length})
      </div>

      {houseBooks.length === 0 ? (
        <EmptyState title="لا كتب من هذه الدار بعد" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 18 }}>
          {houseBooks.map((book) => (
            <div
              key={book.id}
              className="book-card"
              onClick={() => navigate({ name: 'book', id: book.id })}
              style={{ ...cardStyle, cursor: 'pointer', borderRadius: 12, overflow: 'hidden' }}
            >
              <div style={{ width: '100%', aspectRatio: '3/4', background: 'var(--cover-bg)' }}>
                <ImageSlot url={book.cover_url} folder="covers" canEdit={false} placeholder="غلاف الكتاب" />
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontFamily: 'var(--heading-font)', fontWeight: 700, fontSize: 14.5, lineHeight: 1.35 }}>
                  {book.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{book.author_name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

const fieldLabel = {
  display: 'flex', flexDirection: 'column' as const, gap: 5, fontSize: 11.5, color: 'var(--muted)',
}

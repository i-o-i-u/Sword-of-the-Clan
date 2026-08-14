// دُوْر النَّشْر: سجلٌّ مستقلٌّ للدار لا يتكرّر مع كل كتاب.
//
// مكان الدار مُثبَتٌ هنا لا في الكتاب: يُكتب مرةً أولى ثم يُملأ تلقائيًّا في
// كل كتابٍ نشرَته، ولا يُعدَّل إلا من هذه الصفحة — فلا يختلف مكانُ الدار
// الواحدة من كتابٍ إلى كتاب. وتعديلُ الاسم أو المكان يسري على كتبها كلِّها،
// يتكفّل به `catalog.updatePublisher` في الخادم.

import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import {
  DebouncedInput, DebouncedTextarea, EmptyState, cardStyle, ghostButtonStyle,
  inputStyle, primaryButtonStyle,
} from '../components/ui'

export default function Publishers() {
  const { publishers, books, canEdit, run, reload } = useLibrary()

  const [newName, setNewName] = useState('')
  const [newPlace, setNewPlace] = useState('')
  const [busy, setBusy] = useState(false)

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    books.forEach((b) => {
      if (b.publisher_id) map.set(b.publisher_id, (map.get(b.publisher_id) ?? 0) + 1)
    })
    return map
  }, [books])

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
        كل دارٍ تُكتب مرةً واحدة بمكانها، ثم يأتي مكانُها مع كل كتابٍ نشرَته.
        {canEdit && ' وما يُعدَّل هنا يسري على كتب الدار كلِّها.'}
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
            مكانها
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 14 }}>
          {publishers.map((p) => {
            const count = counts.get(p.id) ?? 0
            return (
              <div
                key={p.id}
                style={{
                  ...cardStyle, borderRadius: 12, padding: '16px 18px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                {canEdit ? (
                  <>
                    <label style={fieldLabel}>
                      اسم الدار
                      <DebouncedInput
                        value={p.name}
                        onCommit={(v) => void run(() => api.updatePublisher(p.id, { name: v.trim() || p.name }))}
                        style={{ ...inputStyle, fontFamily: 'var(--heading-font)', fontWeight: 700 }}
                      />
                    </label>
                    <label style={fieldLabel}>
                      مكانها
                      <DebouncedInput
                        value={p.place}
                        onCommit={(v) => void run(() => api.updatePublisher(p.id, { place: v.trim() }))}
                        style={inputStyle}
                      />
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                      <label style={fieldLabel}>
                        سنة التأسيس
                        <DebouncedInput
                          value={p.founded}
                          onCommit={(v) => void run(() => api.updatePublisher(p.id, { founded: v.trim() }))}
                          style={inputStyle}
                        />
                      </label>
                      <label style={fieldLabel}>
                        الموقع
                        <DebouncedInput
                          value={p.website}
                          onCommit={(v) => void run(() => api.updatePublisher(p.id, { website: v.trim() }))}
                          dir="ltr"
                          style={inputStyle}
                        />
                      </label>
                    </div>
                    <label style={fieldLabel}>
                      ملاحظات عن الدار
                      <DebouncedTextarea
                        value={p.notes}
                        onCommit={(v) => void run(() => api.updatePublisher(p.id, { notes: v }))}
                        style={{ ...inputStyle, minHeight: 60, lineHeight: 1.9, resize: 'vertical' }}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: 'var(--heading-font)', fontSize: 19, fontWeight: 700 }}>{p.name}</div>
                    {p.place && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{p.place}</div>}
                    {p.founded && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>تأسّست: {p.founded}</div>}
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noreferrer"
                        dir="ltr"
                        style={{ fontSize: 12.5, color: 'var(--accent-soft)' }}
                      >
                        {p.website}
                      </a>
                    )}
                    {p.notes && <div style={{ fontSize: 13, lineHeight: 1.9 }}>{p.notes}</div>}
                  </>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--accent-soft)', fontWeight: 600 }}>
                    {count} كتاب في المكتبة
                  </span>
                  {canEdit && (
                    // الحذف يفكّ الدار عن كتبها ويُبقي اسمها مكتوبًا عليها
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`حذف «${p.name}»؟ يبقى اسمها على كتبها ويسقط ربطُها بسجلّها.`)) return
                        void run(async () => {
                          await api.removePublisher(p.id)
                          await reload()
                        })
                      }}
                      style={{ ...ghostButtonStyle, fontSize: 12, padding: '5px 10px' }}
                    >
                      حذف الدار
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

const fieldLabel = {
  display: 'flex', flexDirection: 'column' as const, gap: 5, fontSize: 11.5, color: 'var(--muted)',
}

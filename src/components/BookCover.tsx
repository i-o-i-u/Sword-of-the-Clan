import { useState } from 'react'
import { coverInitial, coverPalette } from '../lib/coverPlaceholder'

interface Props {
  title: string
  coverUrl?: string | null
}

export default function BookCover({ title, coverUrl }: Props) {
  const [failed, setFailed] = useState(false)
  const [from, to] = coverPalette(title)

  if (coverUrl && !failed) {
    return (
      <img
        className="book-cover"
        src={coverUrl}
        alt={`غلاف كتاب ${title}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className="book-cover book-cover-placeholder"
      style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      <span>{coverInitial(title)}</span>
    </div>
  )
}

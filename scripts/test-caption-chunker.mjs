// KINEO-SPRINT-12H-2026-07-29 — regression test for the caption chunker.
//
// ⚠️ READ THIS FIRST: unlike every other file in scripts/, this one touches
// NOTHING. No Supabase, no service role, no network, no env var. It is pure
// logic over a hardcoded fixture and is safe to run at any time:
//
//     node scripts/test-caption-chunker.mjs
//
// WHY IT EXISTS
// The homepage proof reel shipped for weeks with the caption `IT IT'S CALLED`
// burned into it. Root cause: Whisper's word-level tokens carry no punctuation,
// so buildCaptionsFromWhisperWords() sliced a fixed number of words and walked
// straight through a full stop. The fixture below is that exact sentence.
//
// It also guards the fix itself. The first version of the anti-stutter guard
// stemmed a trailing `'s`, which made `it` and `It's` compare equal and
// silently DELETED a spoken word from the caption. This test caught it before
// it reached a customer. That is the invariant that matters most here: a
// caption may be re-split any way we like, but it may never LOSE a word the
// narrator said.
//
// The logic below is a faithful port of the grouping in lib/compose.ts. If you
// change the chunker there, change it here and re-run.

const W = (word, start, end, sentenceEnd) => ({
  word,
  start,
  end,
  ...(sentenceEnd ? { sentenceEnd: true } : {}),
})

// "An AI that hires other AIs to think for it. It's called Fugu"
// Note the 0.42s silence after "it" — that gap is the audible full stop, and
// the sentenceEnd flag is what markSentenceEnds() recovers from the Whisper
// SEGMENT stream. Either signal alone is enough to split correctly.
const FIXTURE = [
  W('An', 0.0, 0.14),
  W('AI', 0.14, 0.4),
  W('that', 0.4, 0.6),
  W('hires', 0.6, 0.92),
  W('other', 0.92, 1.18),
  W('AIs', 1.18, 1.52),
  W('to', 1.52, 1.66),
  W('think', 1.66, 1.96),
  W('for', 1.96, 2.12),
  W('it', 2.12, 2.3, true),
  W("It's", 2.72, 2.98),
  W('called', 2.98, 3.3),
  W('Fugu', 3.3, 3.8, true),
]

const SENTENCE_GAP_SECONDS = 0.28

function normalizeCaptionWord(w) {
  return (w ?? '')
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '')
    .trim()
}

function chunk(windowWords, maxWords) {
  const groups = []
  let current = []
  for (let i = 0; i < windowWords.length; i++) {
    const w = windowWords[i]
    current.push(w)
    const next = windowWords[i + 1]
    const gap = next ? next.start - w.end : Number.POSITIVE_INFINITY
    if (
      current.length >= maxWords ||
      w.sentenceEnd === true ||
      (Number.isFinite(gap) && gap >= SENTENCE_GAP_SECONDS)
    ) {
      groups.push(current)
      current = []
    }
  }
  if (current.length) groups.push(current)

  const out = []
  for (let i = 0; i < groups.length; i++) {
    let words = groups[i].map((w) => w.word)
    const prev = groups[i - 1]
    const prevLast = prev?.[prev.length - 1]?.word ?? ''
    if (
      words.length > 1 &&
      prevLast &&
      normalizeCaptionWord(prevLast) === normalizeCaptionWord(words[0])
    ) {
      words = words.slice(1)
    }
    const text = words.join(' ').trim()
    if (text) out.push(text)
  }
  return out
}

let failures = 0
function check(label, ok, detail) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${ok ? '' : ` — ${detail}`}`)
  if (!ok) failures++
}

console.log('caption chunker — "…think for it. It\'s called Fugu"\n')

for (const maxWords of [1, 3, 7]) {
  const captions = chunk(FIXTURE, maxWords)
  console.log(`maxWords=${maxWords}: ${JSON.stringify(captions)}`)

  // 1. The artefact this whole fix exists to kill.
  check(
    'no chunk straddles the full stop',
    !captions.some((c) => /\bit\s+it'?s?\b/i.test(c)),
    'a caption contains "it It\'s"',
  )

  // 2. The invariant that outranks everything else. Re-splitting is free;
  //    losing a spoken word is a broken product.
  const emitted = captions.join(' ').split(/\s+/).filter(Boolean)
  const spoken = FIXTURE.map((w) => w.word)
  const missing = spoken.filter((w) => !emitted.includes(w))
  check('every spoken word survives', missing.length === 0, `dropped ${JSON.stringify(missing)}`)

  // 3. Order must be preserved — captions are read against live audio.
  check(
    'order preserved',
    emitted.join(' ') === spoken.join(' '),
    `got "${emitted.join(' ')}"`,
  )
  console.log('')
}

console.log(failures === 0 ? 'PASS — 9/9 assertions' : `FAIL — ${failures} assertion(s)`)
process.exit(failures === 0 ? 0 : 1)

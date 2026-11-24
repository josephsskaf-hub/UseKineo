// Approved playback and saved-card changes. The legacy guard still compares every other byte.
const changes = [
  [
    `import VisibleClipVideo from '@/components/clips/VisibleClipVideo'
import { CLIPS_TELA_CSS, clipsTelaMaisOpcoes, efeitosDaVitrineDoClipe } from '@/lib/clips/clipsTela0511' // KINEO-CLIPS-TELA-0511 — a caixa primeiro, a grade embaixo, sem Halloween`,
    `import VisibleClipVideo from '@/components/clips/VisibleClipVideo'
import ClipEffectCard from '@/components/clips/ClipEffectCard'
import SavedClipCard from '@/components/clips/SavedClipCard'
import { CLIPS_TELA_CSS, clipsTelaMaisOpcoes, efeitosDaVitrineDoClipe } from '@/lib/clips/clipsTela0511' // KINEO-CLIPS-TELA-0511 — a caixa primeiro, a grade embaixo, sem Halloween`,
  ],
  [
    `
export default function ClipsClient({ measurementActor = null, moldura, rotuloDosAjustes, semRepetir }: { measurementActor?: string | null; moldura?: (p: PartesDoClipe) => ReactNode; /** KINEO-CLIP-RECREATE-JUNTOS-1511 — títulos (minúsculos) que a tela única já mostra na grade de modelos: o efeito igual não se repete nas fileiras do Clips. Sem ele, nada some. */ semRepetir?: ReadonlySet<string>; /** KINEO-CLIP-NA-MOLDURA-1011 — na moldura, o resumo do <details> chama "Details" como os outros passos */ rotuloDosAjustes?: string }) {
  const language = useInterfaceLanguage()`,
    `
export default function ClipsClient({ measurementActor = null, moldura, rotuloDosAjustes, semRepetir, separateEffectPlayback = false }: { measurementActor?: string | null; separateEffectPlayback?: boolean; moldura?: (p: PartesDoClipe) => ReactNode; /** KINEO-CLIP-RECREATE-JUNTOS-1511 — títulos (minúsculos) que a tela única já mostra na grade de modelos: o efeito igual não se repete nas fileiras do Clips. Sem ele, nada some. */ semRepetir?: ReadonlySet<string>; /** KINEO-CLIP-NA-MOLDURA-1011 — na moldura, o resumo do <details> chama "Details" como os outros passos */ rotuloDosAjustes?: string }) {
  const language = useInterfaceLanguage()`,
  ],
  [
    `              return (
                <button key={tr.key} type="button" className="fx-card trend-card" data-clip-action="select_trend" data-clip-trend={tr.key} onClick={() => applyTrend(tr)}>
                  <span className="fx-media">
                    <VisibleClipVideo src={tr.preview.video} poster={tr.preview.poster} autoPlay muted loop playsInline aria-hidden="true" />
                  </span>
                  <span className="fx-title"><UiLabel>{tr.title}</UiLabel></span>`,
    `              return (
                <ClipEffectCard key={tr.key} className="fx-card trend-card" data-clip-action="select_trend" data-clip-trend={tr.key} onClick={() => applyTrend(tr)}
                  separatePlayback={separateEffectPlayback} preview={tr.preview} previewLabel={tr.title}>
                  <span className="fx-title"><UiLabel>{tr.title}</UiLabel></span>`,
  ],
  [
    `                  </span>
                </button>
              )`,
    `                  </span>
                </ClipEffectCard>
              )`,
  ],
  [
    `            {trendRowEffects(efeitosDaVitrine, CLIP_TRENDS.filter((tr) => trendTarget(tr, engines)).length).filter((fx) => !semRepetir?.has(fx.title.trim().toLowerCase())).map((fx) => ( // KINEO-CLIP-RECREATE-JUNTOS-1511 — sem repetir o modelo da grade
              <button key={'season-' + fx.key} type="button" className="fx-card trend-card" data-clip-action="select_season_effect" data-clip-effect={fx.key} onClick={() => { if (fx.key !== effectKey) chooseEffect(fx.key); else document.getElementById('clip-effect-panel')?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }}>
                <span className="fx-media">
                  <VisibleClipVideo src={fx.preview!.video} poster={fx.preview!.poster} autoPlay muted loop playsInline aria-hidden="true" />
                </span>
                <span className="fx-title"><UiLabel>{fx.title}</UiLabel></span>`,
    `            {trendRowEffects(efeitosDaVitrine, CLIP_TRENDS.filter((tr) => trendTarget(tr, engines)).length).filter((fx) => !semRepetir?.has(fx.title.trim().toLowerCase())).map((fx) => ( // KINEO-CLIP-RECREATE-JUNTOS-1511 — sem repetir o modelo da grade
              <ClipEffectCard key={'season-' + fx.key} className="fx-card trend-card" data-clip-action="select_season_effect" data-clip-effect={fx.key} onClick={() => { if (fx.key !== effectKey) chooseEffect(fx.key); else document.getElementById('clip-effect-panel')?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }}
                separatePlayback={separateEffectPlayback} preview={fx.preview} previewLabel={fx.title} unavailableText={t('previewSoon')}>
                <span className="fx-title"><UiLabel>{fx.title}</UiLabel></span>`,
  ],
  [
    `                </span>
              </button>
            ))}`,
    `                </span>
              </ClipEffectCard>
            ))}`,
  ],
  [
    `            {houseRemixes.map((rx) => ( // KINEO-DANCA-PUBLICA-3110 — sem preço no cartão: o preço mora só no botão do painel
              <button key={'remix-' + rx.id} type="button" className="fx-card" data-clip-action="select_face_remix" data-face-remix={rx.id} onClick={() => chooseHouseRemix(rx.id)}>{/* KINEO-DANCA-PUBLICA-3110 */}
                <span className="fx-media"><VisibleClipVideo src={rx.video} poster={rx.poster} autoPlay muted loop playsInline aria-hidden="true" /></span>{/* KINEO-DANCA-PUBLICA-3110 */}
                <span className="fx-title"><UiLabel>{rx.title}</UiLabel></span>{/* KINEO-DANCA-PUBLICA-3110 */}`,
    `            {houseRemixes.map((rx) => ( // KINEO-DANCA-PUBLICA-3110 — sem preço no cartão: o preço mora só no botão do painel
              <ClipEffectCard key={'remix-' + rx.id} className="fx-card" data-clip-action="select_face_remix" data-face-remix={rx.id} onClick={() => chooseHouseRemix(rx.id)}
                separatePlayback={separateEffectPlayback} preview={rx} previewLabel={rx.title}>
                <span className="fx-title"><UiLabel>{rx.title}</UiLabel></span>{/* KINEO-DANCA-PUBLICA-3110 */}`,
  ],
  [
    `                <span className="fx-foot">{/* KINEO-CLIPS-SEM-SELO-1111 — sem selo de motor */}<span className="pr trend-go"><UiLabel>Put your face in it →</UiLabel></span></span>{/* KINEO-DANCA-PUBLICA-3110 */}
              </button>
            ))}
            {efeitosDaVitrine.filter((fx) => !semRepetir?.has(fx.title.trim().toLowerCase())).map((fx) => ( // KINEO-CLIP-RECREATE-JUNTOS-1511 sem repetir · KINEO-CLIPS-TELA-0511 — fora de estação sai da grade; o link ?effect= segue abrindo o efeito
              <button key={fx.key} type="button" className="fx-card" data-clip-action="select_effect" data-clip-effect={fx.key} aria-pressed={fx.key === effectKey} onClick={() => chooseEffect(fx.key)}>
                <span className="fx-media">
                  {fx.preview
                    ? <VisibleClipVideo src={fx.preview.video} poster={fx.preview.poster} autoPlay muted loop playsInline aria-hidden="true" />
                    : <span className="fx-soon">{t('previewSoon')}</span>}
                </span>
                <span className="fx-title"><UiLabel>{fx.title}</UiLabel></span>`,
    `                <span className="fx-foot">{/* KINEO-CLIPS-SEM-SELO-1111 — sem selo de motor */}<span className="pr trend-go"><UiLabel>Put your face in it →</UiLabel></span></span>{/* KINEO-DANCA-PUBLICA-3110 */}
              </ClipEffectCard>
            ))}
            {efeitosDaVitrine.filter((fx) => !semRepetir?.has(fx.title.trim().toLowerCase())).map((fx) => ( // KINEO-CLIP-RECREATE-JUNTOS-1511 sem repetir · KINEO-CLIPS-TELA-0511 — fora de estação sai da grade; o link ?effect= segue abrindo o efeito
              <ClipEffectCard key={fx.key} className="fx-card" data-clip-action="select_effect" data-clip-effect={fx.key} aria-pressed={fx.key === effectKey} onClick={() => chooseEffect(fx.key)}
                separatePlayback={separateEffectPlayback} preview={fx.preview} previewLabel={fx.title} unavailableText={t('previewSoon')} selectionLabel={ui(fx.key === effectKey ? 'Selected' : 'Choose')}>
                <span className="fx-title"><UiLabel>{fx.title}</UiLabel></span>`,
  ],
  [
    `                {/* KINEO-CLIPS-SEM-SELO-1111 — o cartão do efeito sem selo de motor nem a nota "Made with … (motor)"; era o fx-foot com a tag e o fx-note */}
              </button>
            ))}`,
    `                {/* KINEO-CLIPS-SEM-SELO-1111 — o cartão do efeito sem selo de motor nem a nota "Made with … (motor)"; era o fx-foot com a tag e o fx-note */}
              </ClipEffectCard>
            ))}`,
  ],
  [
    `            {clips.map((c) => (
              <div key={c.id} className="card clip-card" style={{ padding: 10 }}>
                {c.status === 'done' && c.video_url
                  ? <VisibleClipVideo src={c.video_url} controls playsInline style={{ aspectRatio: c.aspect === '16:9' ? '16 / 9' : c.aspect === '1:1' ? '1 / 1' : '9 / 16', objectFit: 'contain' }} />
                  : <div className="clip-wait">{c.status === 'failed' ? (c.credits_refunded > 0 ? t('failedRefunded', { n: c.credits_refunded }) : t('failed')) : c.stage === 'keyframe' ? <UiLabel>Placing you in the scene…</UiLabel> : c.stage === 'video' ? <UiLabel>Filming your scene…</UiLabel> : t('inProgress')}</div>}{/* KINEO-ROSTO-QUADRO-CHAVE-2810 — as duas etapas do remix com nome */}
                <div className="clip-meta">{/* KINEO-CLIPS-SEM-SELO-1111 — sem motor no cartão de My clips */}{c.seconds} s · {c.aspect === 'image' ? t('samePhoto') : c.aspect}{semMotor ? null : <> · {c.credits} cr</>}</div>`,
    `            {clips.map((c) => (
              <SavedClipCard key={c.id} className="card clip-card" style={{ padding: 10 }} aspect={c.aspect}
                src={c.status === 'done' ? c.video_url : null} lazy>
                {!(c.status === 'done' && c.video_url) && <div className="clip-wait">{c.status === 'failed' ? (c.credits_refunded > 0 ? t('failedRefunded', { n: c.credits_refunded }) : t('failed')) : c.stage === 'keyframe' ? <UiLabel>Placing you in the scene…</UiLabel> : c.stage === 'video' ? <UiLabel>Filming your scene…</UiLabel> : t('inProgress')}</div>}{/* KINEO-ROSTO-QUADRO-CHAVE-2810 — as duas etapas do remix com nome */}
                <div className="clip-meta">{/* KINEO-CLIPS-SEM-SELO-1111 — sem motor no cartão de My clips */}{c.seconds} s · {c.aspect === 'image' ? t('samePhoto') : c.aspect}{semMotor ? null : <> · {c.credits} cr</>}</div>`,
  ],
  [
    `                )}
              </div>
            ))}`,
    `                )}
              </SavedClipCard>
            ))}`,
  ],
]

export function comAjustesClips2311(source) {
  return changes.reduce((text, [before, after]) => {
    if (text.split(before).length !== 2) throw new Error('Clip presentation anchor: ' + before.slice(0, 80))
    return text.replace(before, () => after)
  }, source)
}

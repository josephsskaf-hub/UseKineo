// KINEO-FILMES-VIRAIS-1511 [dono 15/11: "adicionar o número de likes e wiews como os líderes fazem (usa o jeito que eles fazem como referência)"]
// O jeito do Higgsfield (Explore/presets): no canto de baixo do vídeo, "👁 72.9K  ♥ 5K", texto branco pequeno com sombra, sem caixa.
// SÓ número REAL do post do MESMO vídeo (lib/home/cardSocialStats.ts, com link e data da leitura). Cartão sem post = nada aparece.
// Leitor de tela: "63,200 views and 3,500 likes on Instagram". Puro (sem estado): serve em componente de servidor e de cliente.
import { cardStatFor, compactCount } from '@/lib/home/cardSocialStats'

export const CONTAGEM_SOCIAL_CSS = `
.kx-social{display:inline-flex;align-items:center;gap:10px;font-size:11.5px;font-weight:650;line-height:1;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.65);pointer-events:none;white-space:nowrap}
.kx-social span{display:inline-flex;align-items:center;gap:4px}
.kx-social svg{width:13px;height:13px;flex:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))}
.kx-social-sobre{position:absolute;left:10px;top:10px;z-index:3}
.cx-exemplo-nome .kx-social,.rc-card-bottom .kx-social{display:flex;margin-bottom:6px}
`

export default function ContagemSocial({ video, sobre = false }: { video?: string | null; sobre?: boolean }) {
  const s = cardStatFor(video ?? undefined)
  if (!s) return null
  const leitura = `${s.views.toLocaleString('en-US')} views${typeof s.likes === 'number' ? ` and ${s.likes.toLocaleString('en-US')} likes` : ''} on ${s.source}`
  return (
    <span className={sobre ? 'kx-social kx-social-sobre' : 'kx-social'} title={leitura} data-contagem-social={s.source}>
      <span aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="2" /></svg>
        {compactCount(s.views)}
      </span>
      {typeof s.likes === 'number' ? (
        <span aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 14s-5.5-3.3-5.5-7.4A3.1 3.1 0 0 1 8 4.4a3.1 3.1 0 0 1 5.5 2.2C13.5 10.7 8 14 8 14Z" /></svg>
          {compactCount(s.likes)}
        </span>
      ) : null}
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{leitura}</span>
    </span>
  )
}

// KINEO-HOME-NOVOS-EFEITOS-2910 — fundador 29/10 ("Home A"): os efeitos novos aparecem na home, logo abaixo dos filmes.
// Medido em 29/10: a home não mostrava NENHUM efeito; as páginas /effects tiveram 10 visitas em 30 dias. Regras:
//   · os 4 mais NOVOS do catálogo (as últimas entradas de CLIP_EFFECTS com página pública) — entrou efeito novo, a faixa
//     troca sozinha, sem lista digitada aqui;
//   · prévia = o clipe feito com o próprio efeito a partir de uma foto gerada (o mesmo selo honesto da página do efeito);
//   · cada cartão leva à página pública do efeito (/effects/<slug>), que já cuida de login e volta para o efeito;
//   · vídeo mudo em loop com pôster e preload="none" (a home não baixa os 4 MP4 antes de aparecerem).
import Link from 'next/link'
import { UiLabel } from '@/components/InterfaceLanguage'
import { publicEffectPages, effectSlug, effectPagePath } from '@/lib/clips/clipEffectPages'

export const HOME_NEW_EFFECTS_COUNT = 4

export function homeNewEffects() {
  return publicEffectPages().slice(-HOME_NEW_EFFECTS_COUNT).reverse()
}

export default function HomeNewEffects() {
  const effects = homeNewEffects()
  if (effects.length === 0) return null
  return (
    <section aria-labelledby="home-new-effects" data-home-section="new_effects" style={{ padding: '30px 0 8px' }}>
      <div className="wrap">
        <div className="home-business-heading" style={{ marginBottom: 6 }}>
          <h2 id="home-new-effects"><UiLabel>New effects</UiLabel></h2>
          <Link href="/clips" className="btn btn-ghost" data-home-cta="new_effects_all"><UiLabel>See all effects</UiLabel> ↗</Link>
        </div>
        <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 15, maxWidth: 640 }}>
          <UiLabel>Upload one photo, pick an effect, get your clip in about a minute.</UiLabel>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {effects.map((effect) => (
            <Link
              key={effect.key}
              href={effectPagePath(effectSlug(effect))}
              data-home-cta={`new_effect_${effect.key}`}
              style={{ position: 'relative', display: 'block', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--card)', color: 'inherit', textDecoration: 'none' }}
            >
              <video
                src={effect.preview!.video}
                poster={effect.preview!.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                aria-label={effect.title}
                style={{ display: 'block', width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', maxWidth: '100%' }}
              />
              <span style={{ position: 'absolute', top: 10, left: 10, background: '#ff3b6b', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', padding: '3px 8px', borderRadius: 999 }}>NEW</span>
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 12px 12px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.78))', color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>
                <UiLabel>{effect.title}</UiLabel>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

'use client'

// KINEO-ADS-CENA-2026-10-13 — o campo "Where does your product appear?" do MODO COMPLETO do /ads/v2 (o modo simples tem o
// mesmo campo dentro do passo de texto). Opcional, ≤ 160 caracteres, 4 climas prontos (presets que preenchem o campo — nunca
// efeito novo da fal), desligado no nível Standard com o porquê. A limpeza, a régua de honestidade e a moderação são do
// servidor (lib/ads/v2Scene.ts + lib/ads/v2SceneServer.ts); aqui a tela só avisa antes.
import { ADS_V2_SCENE_MAX_CHARS, ADS_V2_SCENE_PRESETS, adsV2ApplyScenePreset, adsV2SceneErrorText, adsV2SceneIssues, sanitizeAdsV2Scene, type AdsV2SceneCopy } from '@/lib/ads/v2Scene'

export function AdsV2SceneField({ value, onChange, enabled, disabled, copy, lang }: {
  value: string
  onChange: (next: string) => void
  /** false = o nível escolhido não cria cena (Standard): campo desligado com a frase do porquê. */
  enabled: boolean
  disabled: boolean
  copy: AdsV2SceneCopy
  lang: string
}) {
  const problem = enabled ? adsV2SceneIssues(sanitizeAdsV2Scene(value))[0] ?? null : null
  return (
    <div className="adsw-f" data-kineo="ads-scene">
      <label htmlFor="adv2-scene">{copy.scene.label}</label>
      <small>{enabled ? copy.scene.hint : copy.scene.standard}</small>
      <input id="adv2-scene" type="text" value={value} maxLength={ADS_V2_SCENE_MAX_CHARS} disabled={disabled || !enabled} onChange={(e) => onChange(e.target.value)} placeholder={copy.scene.placeholder} />
      {enabled ? (
        <p style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, margin: '8px 0 0', fontSize: 13 }}>
          <span>{copy.scene.tryLabel}</span>
          {ADS_V2_SCENE_PRESETS.map((p) => (
            <button key={p.id} type="button" className="adsw-btn ghost small" data-preset={p.id} disabled={disabled} onClick={() => onChange(adsV2ApplyScenePreset(value, copy.presets[p.id].text))}>
              <span aria-hidden="true">{p.emoji}</span> {copy.presets[p.id].label}
            </button>
          ))}
        </p>
      ) : null}
      {problem ? <p className="adsw-warn" role="alert">{adsV2SceneErrorText(problem, lang)}</p> : null}
    </div>
  )
}

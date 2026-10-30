'use client'

// KINEO-HALLOWEEN-SKIN-2910 — fundador 29/10 ("A"): enfeite de Halloween na home, na medida. Faixa fina no topo levando
// à página de Halloween + 3 morcegos discretos (só tela grande, sem animação para quem pede menos movimento). Some sozinho
// em 1º/11 00:00 BRT (03:00 UTC). Prévia antes de ligar: ?halloween=preview mostra mesmo com o interruptor desligado.
import Link from 'next/link'
import { useEffect, useState } from 'react'

export const HALLOWEEN_SKIN_PUBLIC = true // fundador 29/10: "gostei desse Halloween, tá bonito"
export const HALLOWEEN_SKIN_ENDS_AT = '2026-11-01T03:00:00.000Z'

export function halloweenSkinOn(now: number, search: string, publicFlag: boolean = HALLOWEEN_SKIN_PUBLIC): boolean {
  if (now >= Date.parse(HALLOWEEN_SKIN_ENDS_AT)) return false
  return publicFlag || new URLSearchParams(search).get('halloween') === 'preview'
}

const CSS = `
.kh-bar{display:flex;align-items:center;justify-content:center;gap:10px;padding:9px 16px;background:linear-gradient(90deg,#3b1255,#6b2a0f 55%,#3b1255);color:#fff;font-size:14px;font-weight:700;text-align:center;text-decoration:none;line-height:1.3}
.kh-bar:hover{filter:brightness(1.12)}
.kh-bar,.kh-bar:visited,.kh-bar span{color:#fff !important;text-decoration:none !important}
.kh-bar .kh-cta{color:#ffb347 !important;white-space:nowrap}
.kh-bats{position:fixed;inset:0;pointer-events:none;z-index:5;overflow:hidden}
.kh-bat{position:absolute;width:34px;height:18px;opacity:.45;animation:kh-fly 26s linear infinite}
.kh-bat svg{width:100%;height:100%;fill:#2a1a3a;animation:kh-flap .35s ease-in-out infinite alternate;transform-origin:center}
.kh-bat:nth-child(2){top:14%;animation-duration:34s;animation-delay:-12s;width:26px;height:14px}
.kh-bat:nth-child(3){top:22%;animation-duration:41s;animation-delay:-25s;width:22px;height:12px;opacity:.4}
.kh-bat:nth-child(1){top:9%}
@keyframes kh-fly{0%{transform:translateX(-8vw) translateY(0)}25%{transform:translateX(22vw) translateY(18px)}50%{transform:translateX(52vw) translateY(-6px)}75%{transform:translateX(80vw) translateY(14px)}100%{transform:translateX(110vw) translateY(0)}}
@keyframes kh-flap{from{transform:scaleY(1)}to{transform:scaleY(.45)}}
@media (max-width:900px){.kh-bats{display:none}}
@media (prefers-reduced-motion:reduce){.kh-bats{display:none}}
`

const Bat = () => (
  <svg viewBox="0 0 64 32" aria-hidden="true"><path d="M32 12c-2-4-5-6-8-6 1 3 0 5-2 6-3-3-8-4-12-2 3 1 5 4 5 7-3-1-7 0-9 3 6-1 11 1 14 5 2-3 5-5 8-5h8c3 0 6 2 8 5 3-4 8-6 14-5-2-3-6-4-9-3 0-3 2-6 5-7-4-2-9-1-12 2-2-1-3-3-2-6-3 0-6 2-8 6z" /></svg>
)

export default function HalloweenSkin() {
  const [on, setOn] = useState(false)
  useEffect(() => { setOn(halloweenSkinOn(Date.now(), window.location.search)) }, [])
  if (!on) return null
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Link href="/ai-halloween-video" className="kh-bar" data-home-cta="halloween_bar">
        <span aria-hidden="true">🎃</span>
        <span>Halloween: turn 1 photo into a witch or a zombie</span>
        <span className="kh-cta">Try it →</span>
      </Link>
      <div className="kh-bats" aria-hidden="true">
        <div className="kh-bat"><Bat /></div>
        <div className="kh-bat"><Bat /></div>
        <div className="kh-bat"><Bat /></div>
      </div>
    </>
  )
}

'use client'

// KINEO-CARTOON-TELA-0411 — o 1º episódio grátis com marca-d'água, agora sem o quadro de planos em volta (fundador 05/11: "a pessoa escolhe e vamos embora").
// Mesmas regras de antes: quem decide é o servidor (/api/kids-venda/status diz se a conta pode; /api/kids-venda/sample confere de novo e grava o pedido).
// Só aparece para quem pode pedir. Usa o personagem, a língua e a ideia que já estão na tela. Botão secundário: o principal da tela continua sendo um só.
import { useEffect, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { KIDS_THEME_MAX_CHARS, kidsVendaCardText } from '@/lib/kidsVenda/kidsVenda'
import { kidsTelaCopy } from '@/lib/kidsCartoon/telaCartoon'
import type { KidsCartoonLanguage, KidsCharacterId } from '@/lib/kidsCartoon/kidsCartoon'

/** O painel de episódios escuta este evento para mostrar o pedido novo sem recarregar a página. */
export const KIDS_VENDA_MUDOU = 'kids-venda-mudou'

export default function KidsEpisodioGratis({ character, language, tema }: { character: KidsCharacterId; language: KidsCartoonLanguage; tema: string }) {
  const ui = useInterfaceLanguage()
  const card = kidsVendaCardText(ui)
  const tela = kidsTelaCopy(ui)
  const [pode, setPode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let vivo = true
    fetch('/api/kids-venda/status', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { open?: unknown; ready?: unknown; sample?: { eligible?: unknown } } | null) => { if (vivo) setPode(d?.open === true && d?.ready === true && d?.sample?.eligible === true) })
      .catch(() => undefined)
    return () => { vivo = false }
  }, [])

  async function pedir() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/kids-venda/sample', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ character, language, theme: tema.trim().slice(0, KIDS_THEME_MAX_CHARS) }) })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) { setMsg({ ok: false, text: data.error ?? tela.err }); return }
      setMsg({ ok: true, text: tela.free })
      setPode(false)
      void trackEvent('kids_sample_requested_click', { character, language })
      window.dispatchEvent(new Event(KIDS_VENDA_MUDOU))
    } catch { setMsg({ ok: false, text: tela.err }) } finally { setBusy(false) }
  }

  if (!pode && !msg) return null
  return (
    <div data-kineo="kids-episodio-gratis" style={{ width: '100%', display: 'grid', gap: 8 }}>
      {pode ? <p className="ace-hint">{card.sample}</p> : null}
      {pode ? <div><button type="button" data-kineo="kids-cta-sample" onClick={() => { void pedir() }} disabled={busy}>{card.ctaSample}</button></div> : null}
      {msg ? <p className={msg.ok ? 'ace-hint' : 'kkc-err'} role="status">{msg.text}</p> : null}
    </div>
  )
}

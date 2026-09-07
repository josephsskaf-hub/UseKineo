import { Expired } from './HandoffNotice'

// ═══ KINEO-GPT-VERDADE-2026-09-07 — /go/<token inexistente> é 404 de verdade ═
//
// page.tsx chama notFound() quando o token está fora do padrão ou não existe
// no banco; o Next responde HTTP 404 e renderiza ISTO — o mesmo visual que a
// tela "missing" sempre teve (mesmo Shell, Wordmark, BUTTON, mesmo texto e o
// mesmo botão "Open the Studio"). Muda só o status: sonda e rastreador passam
// a ver 404 onde antes viam um 200 mentiroso.
export default function GoNotFound() {
  return <Expired reason="missing" />
}

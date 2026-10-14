// KINEO-STUDIO-DURACAO-SALDO-1510 — DESFAZ, em memória, o conserto "a duração que o saldo paga" no Studio de filmes
// (app/(dashboard)/studio/StudioClient.tsx), para os guardiões que conferem o Studio BYTE A BYTE contra uma base antiga
// (scripts/test-ads-fluxo-1310.mjs, D4). Módulo auxiliar; não é teste (o nome não começa com test-).
//
// O que o conserto acrescenta, e só isto (qualquer outra coisa marcada = lança, e o guardião fica vermelho):
//   · 1 linha de import com a marca;
//   · 2 blocos novos delimitados por "KINEO-STUDIO-DURACAO-SALDO-1510 ▼" … "KINEO-STUDIO-DURACAO-SALDO-1510 ▲" (o efeito e a nota);
//   · o atributo ` onClickCapture={marcarEscolhaDeDuracao}` nos 5 botões de duração (o onClick deles fica o de antes).
// scripts/test-studio-duracao-saldo-1510.mjs prova que, desfeito isto, o arquivo é EXATAMENTE a base.
export const MARCA_DURACAO_SALDO_1510 = 'KINEO-STUDIO-DURACAO-SALDO-1510'
export const ATRIBUTO_ESCOLHA_1510 = ' onClickCapture={marcarEscolhaDeDuracao}'
const IMPORT_1510 = "import { duracaoQueOSaldoPaga, notaDaDuracaoPeloSaldo, DURACAO_PELO_SALDO_EVENT, DURACAO_PELO_SALDO_VERSION } from '@/lib/growth/duracaoPeloSaldo' // KINEO-STUDIO-DURACAO-SALDO-1510"
const ABRE = 'KINEO-STUDIO-DURACAO-SALDO-1510 ▼'
const FECHA = 'KINEO-STUDIO-DURACAO-SALDO-1510 ▲'

/** O Studio de ANTES deste conserto (LF). Idempotente: sem nada marcado, devolve o texto igual (só LF). */
export function semDuracaoSaldo1510(s) {
  const texto = String(s).replace(/\r\n/g, '\n')
  const atributos = texto.split(ATRIBUTO_ESCOLHA_1510).length - 1
  if (atributos !== 0 && atributos !== 5) throw new Error(`desfaz-duracao-saldo-1510: ${atributos} atributos onClickCapture (esperado 5)`)
  const out = []
  let dentro = false
  let blocos = 0
  let imports = 0
  for (const l of texto.split(ATRIBUTO_ESCOLHA_1510).join('').split('\n')) {
    if (dentro) {
      if (l.includes(FECHA)) dentro = false
      continue
    }
    if (l.includes(ABRE)) { dentro = true; blocos++; continue }
    if (!l.includes(MARCA_DURACAO_SALDO_1510)) { out.push(l); continue }
    if (l === IMPORT_1510) { imports++; continue }
    throw new Error('desfaz-duracao-saldo-1510: linha marcada inesperada: ' + l.slice(0, 120))
  }
  if (dentro) throw new Error('desfaz-duracao-saldo-1510: bloco aberto sem fechamento')
  const marcado = atributos + blocos + imports > 0
  if (marcado && (blocos !== 2 || imports !== 1 || atributos !== 5)) throw new Error(`desfaz-duracao-saldo-1510: forma inesperada (blocos ${blocos}, imports ${imports}, atributos ${atributos})`)
  return out.join('\n')
}

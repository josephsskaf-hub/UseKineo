// KINEO-ELENCO-ATE-O-FIM-0511 — [TRAVA 8.2 — fundador 05/11, vendo o filme do Roland: "são pessoas diferentes"]. Desfaz exato desta entrega nos
// 4 arquivos do motor, para os guardiões históricos que comparam com a base. Trecho ausente ou repetido = lança (edição desconhecida continua
// reprovando). Nunca usar em lib/app.
import { semReservaH30611 } from './desfaz-reserva-h3-0611.mjs' // KINEO-RESERVA-H3-0611
import { semRepeticaoFree151011 } from './desfaz-repeticao-free15-1011.mjs' // KINEO-REPETICAO-FREE15-1011
import { semCenaForaDoPedido1111 } from './desfaz-cena-fora-do-pedido-1111.mjs' // KINEO-CENA-FORA-DO-PEDIDO-1111
import { readFileSync } from 'node:fs'
import { semEmailParadoSemMotor1211 } from './desfaz-email-parado-sem-motor-1211.mjs' // KINEO-EMAIL-PARADO-SEM-MOTOR-1211 — a camada mais nova (11/11 noite) sai primeiro
import { semH3Turbo0511 } from './desfaz-h3-turbo-0511.mjs' // KINEO-H3-TURBO-0511 — a camada mais nova sai primeiro
import { semFimNaoVolta0611 } from './desfaz-fim-nao-volta-0611.mjs' // KINEO-FIM-NAO-VOLTA-0611 — a camada mais nova (06/11, laço do revisor) sai primeiro
import { semLegendaNegacao0911 } from './desfaz-legenda-negacao-0911.mjs' // KINEO-LEGENDA-NEGACAO-0911 — a camada mais nova (09/11, laço do revisor) sai primeiro
import { semAmostraTextoLongo0711 } from './desfaz-amostra-texto-longo-0711.mjs' // KINEO-AMOSTRA-TEXTO-LONGO-0711 — a camada mais nova (07/11, laço do revisor) sai primeiro
import { semCriticoObserva0911 } from './desfaz-critico-observa-0911.mjs' // KINEO-CRITICO-OBSERVA-0911 — a camada mais nova (09/11, "vai no crítico") sai primeiro
import { semQuandoNaoEGalinha0911 } from './desfaz-quando-nao-e-galinha-0911.mjs' // KINEO-QUANDO-NAO-E-GALINHA-0911 — a camada mais nova (09/11, laço do revisor) sai primeiro
const ESCOPO = JSON.parse(readFileSync(new URL('./desfaz-elenco-fim-0511-fontes.json', import.meta.url), 'utf8'))
const MARCA = 'KINEO-ELENCO-ATE-O-FIM-0511'
export function semElencoFim0511(source, file) {
  source = semEmailParadoSemMotor1211(source, file) // KINEO-EMAIL-PARADO-SEM-MOTOR-1211
  source = semLegendaNegacao0911(source, file) // KINEO-LEGENDA-NEGACAO-0911
  source = semCenaForaDoPedido1111(source, file) // KINEO-CENA-FORA-DO-PEDIDO-1111 — a camada mais nova (11/11, laço do revisor) sai primeiro
  source = semRepeticaoFree151011(source, file) // KINEO-REPETICAO-FREE15-1011 — a camada mais nova (10/11, laço do revisor) sai primeiro
  source = semCriticoObserva0911(source, file) // KINEO-CRITICO-OBSERVA-0911
  source = semQuandoNaoEGalinha0911(source, file) // KINEO-QUANDO-NAO-E-GALINHA-0911
  source = semAmostraTextoLongo0711(source, file) // KINEO-AMOSTRA-TEXTO-LONGO-0711
  source = semReservaH30611(source, file) // KINEO-RESERVA-H3-0611 — a camada mais nova sai primeiro
  source = semFimNaoVolta0611(source, file) // KINEO-FIM-NAO-VOLTA-0611
  source = semH3Turbo0511(source, file) // KINEO-H3-TURBO-0511
  const hunks = ESCOPO[String(file ?? '').replace(/\\/g, '/')]
  if (typeof source !== 'string' || !hunks || !source.includes(MARCA)) return source
  const crlf = source.includes('\r\n')
  let t = source.replace(/\r\n/g, '\n')
  for (const h of hunks) {
    if (t.split(h.depois).length !== 2) throw new Error('desfaz-elenco-fim-0511: trecho ausente ou repetido em ' + file)
    t = t.replace(h.depois, () => h.antes)
  }
  if (t.includes(MARCA)) throw new Error('desfaz-elenco-fim-0511: sobrou edição desta entrega em ' + file)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
/** O arquivo de hoje é exatamente "base + esta entrega"? */
export function deltaElencoFim0511Exato(source, upstream, file) {
  if (typeof source !== 'string' || typeof upstream !== 'string' || !ESCOPO[String(file ?? '').replace(/\\/g, '/')] || !source.includes(MARCA)) return false
  return semElencoFim0511(source, file).replace(/\r\n/g, '\n') === upstream.replace(/\r\n/g, '\n')
}

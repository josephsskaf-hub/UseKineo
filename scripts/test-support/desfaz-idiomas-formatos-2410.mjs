import { semDuracaoColadaSaldo0411 } from './desfaz-duracao-colada-saldo-0411.mjs' // KINEO-DURACAO-COLADA-SALDO-0411 — camada mais nova (04/11, laço do revisor) sai primeiro
import { semVozNativaHollywood0211 } from './desfaz-voz-nativa-hollywood-0211.mjs' // KINEO-VOZ-NATIVA-HOLLYWOOD-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]: a camada mais nova (voz nativa na estrada hollywood) sai primeiro, pelo recibo exato
import { semAnoInventado0211 } from './desfaz-ano-inventado-0211.mjs' // KINEO-ANO-INVENTADO-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]: a camada mais nova (generate-script + analyze-idea: o escritor nunca inventa o ano) sai primeiro, pelo recibo exato
import { semFilmeGratisComeca0211 } from './desfaz-filme-gratis-comeca-0211.mjs' // KINEO-FILME-GRATIS-COMECA-0211 — [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]: a camada mais nova (GenerateClient: o clique do filme grátis começa o filme) sai primeiro, pelo recibo exato
import { semK4PagoSilencio0211 } from './desfaz-k4-pago-silencio-0211.mjs' // KINEO-K4-PAGO-SILENCIO-0211 — camada mais nova (02/11, laço do revisor) sai primeiro
import { semK4Despacho0211 } from './desfaz-k4-despacho-0211.mjs' // KINEO-K4-DESPACHO-0211 — camada mais nova (02/11, laço do revisor) sai primeiro
import { semK4PagoCabe0211 } from './desfaz-k4-pago-cabe-0211.mjs' // KINEO-K4-PAGO-CABE-0211 — camada mais nova (02/11, laço do revisor) sai primeiro
import { semCasaFichaSemLetras0211 } from './desfaz-casa-ficha-sem-letras-0211.mjs' // KINEO-CASA-FICHA-SEM-LETRAS-0211 — camada mais nova (02/11, laço do revisor) sai primeiro
import { semLegendaMilhar0211 } from './desfaz-legenda-milhar-0211.mjs' // KINEO-LEGENDA-MILHAR-0211 — camada mais nova (02/11, laço do revisor) sai primeiro
import { semK4NarracaoCabe0111 } from './desfaz-k4-narracao-cabe-0111.mjs' // KINEO-K4-NARRACAO-CABE-0111 — camada mais nova (01/11, laço do revisor) sai primeiro
import { semProtagonistaSeedance0111 } from './desfaz-protagonista-seedance-0111.mjs' // KINEO-PROTAGONISTA-SEEDANCE-0111 — camada mais nova (01/11, depois do revisor) sai primeiro
import { semRoteiroNoTamanho0111 } from './desfaz-roteiro-no-tamanho-0111.mjs' // KINEO-ROTEIRO-NO-TAMANHO-0111 — camada mais nova (01/11, laço do revisor) sai primeiro
import { semJuizPlano0111 } from './desfaz-juiz-plano-0111.mjs' // KINEO-JUIZ-PLANO-0111 — camada mais nova (01/11, juiz do plano) sai primeiro
import { semK4SujeitoFinal0111 } from './desfaz-k4-sujeito-final-0111.mjs' // KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111 — camada mais nova (01/11, "vai tudo") sai primeiro
import { semRevisor100111 } from './desfaz-revisor-10-0111.mjs' // KINEO-REVISOR-10-0111 — camada mais nova (01/11) sai primeiro
import { semLegendaCena3110 } from './desfaz-legenda-cena-3110.mjs' // KINEO-LEGENDA-CENA-3110 — camada mais nova (31/10) sai primeiro
import { semFluxoLeva13010 } from './desfaz-fluxo-leva1-3010.mjs' // KINEO-FLUXO-LEVA1-3010 — camada mais nova (30/10) sai primeiro
import { semConsertos2710 } from './desfaz-consertos-2710.mjs' // KINEO-CONSERTOS-2710 — as 6 entregas de 27/10 (camada mais nova) saem primeiro
import { semApresentadores2410 } from './desfaz-apresentadores-2410.mjs' // KINEO-APRESENTADORES-2410
// KINEO-IDIOMAS-FORMATOS-2410 — exact leaf layer; no import of another task's undo chain.
import { semCompraAvulsa2410 } from './desfaz-compra-avulsa-2410.mjs' // KINEO-COMPRA-AVULSA-2410 — exact newer leaf before historical assertions.
import { readFileSync } from 'node:fs'
import { semDesenho15s2710 } from './desfaz-desenho-15s-aceita-2710.mjs' // KINEO-DESENHO-15S-ACEITA-2710 — camada mais nova sai primeiro
import { createHash } from 'node:crypto'
import { semVideoFiel2610 } from './desfaz-video-fiel-2610.mjs' // VIDEO-FIEL-2610: exact later layer, historical readers only.
import { semCardsGiro2410 } from './desfaz-cards-giro-2410.mjs' // KINEO-CARDS-GIRO-2410 — remove the exact newer layer before every historical chain.
import { semAmostraAnuncio2410 } from './desfaz-amostra-anuncio-2410.mjs'

import { semCartoonTracao2210 } from './desfaz-cartoon-tracao-2210.mjs' // KINEO-CARTOON-TRACAO-2210

export const IDIOMAS_FORMATOS_2410_BASE = 'dd0abba8cc711be4bde2faaac39f0aef29f3f90d'
export const IDIOMAS_FORMATOS_2410_MANIFEST = JSON.parse(readFileSync(new URL('./desfaz-idiomas-formatos-2410-fontes.json', import.meta.url), 'utf8'))
const sourceHash = text => createHash('sha256').update(text).digest('hex')
function verifiedBefore(known, integrated, rel) {
  const text = integrated ? known.integratedBefore : known.before
  const expected = integrated ? known.integratedBeforeHash : known.beforeHash
  if (typeof text !== 'string' || typeof expected !== 'string' || sourceHash(text) !== expected) throw new Error('desfaz-idiomas-formatos-2410: manifesto divergente ' + rel)
  return text
}
export function semIdiomasFormatos2410(text, file) {
  text = semDuracaoColadaSaldo0411(text, file) // KINEO-DURACAO-COLADA-SALDO-0411
  text = semVozNativaHollywood0211(text, file) // KINEO-VOZ-NATIVA-HOLLYWOOD-0211
  text = semAnoInventado0211(text, file) // KINEO-ANO-INVENTADO-0211
  text = semFilmeGratisComeca0211(text, file) // KINEO-FILME-GRATIS-COMECA-0211
  text = semK4PagoSilencio0211(text, file) // KINEO-K4-PAGO-SILENCIO-0211
  text = semK4Despacho0211(text, file) // KINEO-K4-DESPACHO-0211
  text = semK4PagoCabe0211(text, file) // KINEO-K4-PAGO-CABE-0211
  text = semCasaFichaSemLetras0211(text, file) // KINEO-CASA-FICHA-SEM-LETRAS-0211
  text = semLegendaMilhar0211(text, file) // KINEO-LEGENDA-MILHAR-0211
  text = semK4NarracaoCabe0111(text, file) // KINEO-K4-NARRACAO-CABE-0111
  text = semProtagonistaSeedance0111(text, file) // KINEO-PROTAGONISTA-SEEDANCE-0111
  text = semRoteiroNoTamanho0111(text, file) // KINEO-ROTEIRO-NO-TAMANHO-0111
  text = semJuizPlano0111(text, file) // KINEO-JUIZ-PLANO-0111
  text = semK4SujeitoFinal0111(text, file) // KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111
  text = semRevisor100111(text, file) // KINEO-REVISOR-10-0111
  text = semLegendaCena3110(text, file) // KINEO-LEGENDA-CENA-3110
  text = semFluxoLeva13010(text, file) // KINEO-FLUXO-LEVA1-3010
  text = semConsertos2710(text, file) // KINEO-CONSERTOS-2710
  text = semDesenho15s2710(text, file) // KINEO-DESENHO-15S-ACEITA-2710 — camada mais nova sai primeiro
  text = semVideoFiel2610(text, file)
  text = semCardsGiro2410(text, file) // KINEO-CARDS-GIRO-2410 — leaf has no older imports, so this creates no cycle.
  const rel = String(file ?? '').replace(/\\/g, '/')
  const known = IDIOMAS_FORMATOS_2410_MANIFEST.sources[rel]
  if (!known || typeof text !== 'string') return text
  const hash = sourceHash(text.replace(/\r\n/g, '\n'))
  if (hash === known.beforeHash) { verifiedBefore(known, false, rel); return text }
  if (known.integratedBeforeHash && hash === known.integratedBeforeHash) { verifiedBefore(known, true, rel); return text }
  // The merged current source restores the upstream source; the original pre-integration
  // source still restores its original dd0 base. Equal after hashes have the same before.
  let before
  if (hash === known.afterHash) before = verifiedBefore(known, Object.hasOwn(known, 'integratedBefore'), rel)
  else if (known.originalAfterHash && hash === known.originalAfterHash) before = verifiedBefore(known, false, rel)
  else {
    // Historical guardians re-enter with older sources and their own mutants.
    // Only an identifiable task layer can be undone; evidence survives removed comments.
    if (!text.includes('KINEO-IDIOMAS-FORMATOS-2410') && !(known.evidence ?? []).some(fragment => text.includes(fragment))) return text
    throw new Error('desfaz-idiomas-formatos-2410: fonte divergente ' + rel)
  }
  return text.includes('\r\n') ? before.replace(/\n/g, '\r\n') : before
}

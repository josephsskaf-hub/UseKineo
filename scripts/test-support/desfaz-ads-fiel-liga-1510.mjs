// KINEO-ADS-FIEL-LIGA-1510 — DESFAZ, em memória, o LIGA da trava do produto do Studio Ads v2 para TODOS os clientes (fundador 15/10,
// "liga já", depois do reteste 4): ADS_V2_PRODUCT_LOCK_MODE 'internal' → 'all' em lib/ads/v2ShotLists.ts. Para os guardiões que conferem
// esse arquivo BYTE A BYTE contra uma base antiga (ou que desfazem consertos ANTIGOS da trava e precisam do texto de antes deste). Módulo
// auxiliar; não é teste (o nome não começa com test-).
//
// É o diff REVERSO exato (gerado contra o pai do commit com a marca): o bloco de AGORA tem de aparecer UMA vez no texto e volta a ser o
// bloco de ANTES. Bloco ausente ou repetido = lança (o guardião fica vermelho em vez de engolir uma mudança). Arquivo sem bloco = o texto
// igual (só LF). comLiga1510 é o caminho de IDA (antes → agora), para o guardião que precisa do módulo vivo a partir do texto desfeito.
// scripts/test-ads-fiel-liga-1510.mjs prova que, desfeito isto, o arquivo é EXATAMENTE o da base, e que a ida devolve o arquivo vivo.
//
// ENCADEAMENTO: este é o conserto MAIS NOVO da trava (veio depois do fiel-4): desfaça ESTE primeiro, colado no readFileSync, e passe o
// resultado ao desfaz antigo — ex.: semFiel4_1510(rel, semFielLiga1510(rel, readFileSync(...))).
export const MARCA_FIEL_LIGA_1510 = 'KINEO-ADS-FIEL-LIGA-1510'
export const FIEL_LIGA_1510_BASE = 'c56e121ee58f57e8c903ce33d9593cc71719daa1'
const DESFAZ = {
  'lib/ads/v2ShotLists.ts': [
    {
      now: [
        "// KINEO-ADS-FIEL-LIGA-1510 — fundador 15/10 'liga já' depois do reteste 4: rostos livres, nada boiando, lado alternado; falta pousar no",
        '// KINEO-ADS-FIEL-LIGA-1510 — tampo — KINEO-ADS-FIEL-5-1510 em andamento. A trava vale para TODO pedido; o preço do nível não muda (visão',
        "// KINEO-ADS-FIEL-LIGA-1510 — 'high', recorte e a refação do canto são custo da casa, nunca débito extra ao cliente).",
        "export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'all' // KINEO-ADS-FIEL-1510 · KINEO-ADS-FIEL-LIGA-1510",
      ],
      before: ["export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'internal' // KINEO-ADS-FIEL-1510"],
    },
  ],
}
/** O texto de ANTES deste conserto (LF). Lança se o bloco deste conserto não estiver lá exatamente uma vez. */
export function semFielLiga1510(rel, text) {
  let s = String(text).replace(/\r\n/g, '\n')
  const hunks = DESFAZ[rel]
  if (!hunks) return s
  for (const h of hunks) {
    const now = h.now.join('\n')
    const parts = s.split(now)
    if (parts.length !== 2) throw new Error('semFielLiga1510: ' + rel + ' mudou fora deste conserto (' + (parts.length - 1) + 'x: ' + now.slice(0, 60) + ')')
    s = parts.join(h.before.join('\n'))
  }
  return s
}
/** A IDA: o texto de antes (LF) com este conserto aplicado. Lança se o bloco de antes não estiver lá exatamente uma vez. */
export function comLiga1510(rel, text) {
  let s = String(text).replace(/\r\n/g, '\n')
  const hunks = DESFAZ[rel]
  if (!hunks) return s
  for (const h of [...hunks].reverse()) {
    const before = h.before.join('\n')
    const parts = s.split(before)
    if (parts.length !== 2) throw new Error('comLiga1510: ' + rel + ' não tem o texto de antes (' + (parts.length - 1) + 'x)')
    s = parts.join(h.now.join('\n'))
  }
  return s
}
export const FIEL_LIGA_1510_ARQUIVOS = Object.keys(DESFAZ)
export const FIEL_LIGA_1510_NOVOS = []

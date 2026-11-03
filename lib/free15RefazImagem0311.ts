// [TRAVA 8.2 — fundador 03/11: "três sim" — refazer também a imagem da cena no 1º filme grátis]
// KINEO-GRATIS-REFAZ-IMAGEM-0311 — continuação de KINEO-GRATIS-REFAZ-CENA-0311 (lib/free15RefazCena0311.ts, a667faf06).
// O limite que o autor daquela entrega deixou escrito: época errada / pessoa inventada numa cena IMAGEM→VÍDEO SEM folha de personagem
// refazia só o CLIPE, a partir do MESMO still FLUX — se o jeans (ou a pessoa) já estava no still, o clipe novo repetia o defeito e o
// juiz reprovava de novo (~US$ 0,20 jogados fora). Com folha, o still já era refeito (KINEO-ELENCO-TRAVA-0311).
// Agora, nesses dois motivos e só em cena i2v clássica SEM folha (o Seedance 1.5 da reserva/teto do filme grátis de 15 s): o still da
// cena é refeito PRIMEIRO pelo MESMO gerador do 1º quadro da rota (lib/free15StillFlux0311.ts: o corpo de lib/hollywood/anchors
// generateCinematicSceneStill) — com a MESMA correção positiva já usada no clipe na frente do prompt (linha de época / lugar vazio) — e o
// clipe é animado do still novo. Plano parado: nada muda (só a frase de movimento; o mesmo still serve).
//   · UMA refação por filme (o attempted=true do portão, gravado antes de qualquer dinheiro, vale para o still e o clipe juntos).
//   · O still falhou (envio recusado/ambíguo, job FAILED, sem URL, filtro de segurança do FLUX, 5 min de prazo) → o clipe sai do still
//     de antes, exatamente como hoje. Nunca um 2º POST do still.
//   · Teto de custo: clipe + still ≤ US$ 0,50 (TETO_USD_REFAZ_IMAGEM_0311); acima disso, o clipe sai do still de antes.
// Este arquivo é PURO (sem rede, sem SDK — o portão lib/free15Gate.ts o importa e não pode carregar fornecedor). O corpo do POST e a
// leitura do resultado moram em lib/free15StillFlux0311.ts (servidor). Guardião: scripts/test-gratis-refaz-imagem-0311.mjs.
import type { MotivoRefaz0311, RefazCena0311 } from '@/lib/free15RefazCena0311'

export const MARCA_GRATIS_REFAZ_IMAGEM_0311 = 'KINEO-GRATIS-REFAZ-IMAGEM-0311'
/** Estimativa do still FLUX dev 9:16 (≈ US$ 0,015 real: 576×1024 × US$ 0,025/MP; conta o dobro por prudência). */
export const USD_STILL_FLUX_0311 = 0.03
/** Estimativa do still com folha (o edit com referência do still do portão, KINEO-ELENCO-TRAVA-0311). */
export const USD_STILL_FOLHA_0311 = 0.15
/** Teto da refação inteira (clipe + still FLUX) por filme; acima disso o clipe sai do still de antes. */
export const TETO_USD_REFAZ_IMAGEM_0311 = 0.5

/** Por que a imagem foi (ou não foi) refeita — gravado no relato refazCena0311 do estado assinado. */
export type MotivoImagem0311 =
  | 'still_novo' // o still novo foi ao 1º quadro do clipe refeito
  | 'still_pedido' // o POST do still saiu; aguardando a leitura (estado intermediário)
  | 'still_falhou' // job FAILED, sem URL ou barrado pelo filtro de segurança: o clipe sai do still de antes
  | 'still_prazo' // 5 min sem ficar pronto: o clipe sai do still de antes
  | 'envio_falhou' // o POST do still lançou (recusado ou ambíguo): nunca se posta de novo; o clipe sai do still de antes
  | 'sem_still_i2v' // cena sem still para refazer (t2v / Kling 4, com folha, sem chave): o clipe de sempre
  | 'teto_usd' // clipe + still passaria do teto: o clipe sai do still de antes

/** Campos novos do relato (somados ao RefazCena0311 de KINEO-GRATIS-REFAZ-CENA-0311). */
export type RefazImagem0311 = {
  /** true = o clipe refeito saiu de um still NOVO; false = do still de antes (ou t2v). Ausente = motivo sem imagem (parado). */
  imagem_refeita?: boolean
  imagem_motivo?: MotivoImagem0311
  /** qual gerador refez o still: o FLUX da rota (sem folha) ou o edit com a folha */
  imagem_via?: 'flux' | 'folha'
  /** custo estimado do still (somar ao usdEstimado do clipe para o custo da refação) */
  imagem_usd?: number
}

/** Época e pessoa inventada moram no still (roupa, gente); o plano parado não (a frase de movimento basta). */
export const motivoRefazImagem0311 = (motivo: MotivoRefaz0311 | undefined): boolean => motivo === 'epoca' || motivo === 'pessoa'

/** Cabe no teto? (clipe estimado + still FLUX ≤ US$ 0,50) */
export const cabeNoTeto0311 = (refaz: Pick<RefazCena0311, 'usdEstimado'>): boolean =>
  Number.isFinite(refaz.usdEstimado) && Math.round((refaz.usdEstimado + USD_STILL_FLUX_0311) * 1000) / 1000 <= TETO_USD_REFAZ_IMAGEM_0311

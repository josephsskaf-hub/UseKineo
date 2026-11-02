// KINEO-SERIE-AUTO-ETAPA1-0111 — os ids determinísticos do cron resume-parked-renders (KINEO-FILA-QUEDA-FAL-2810), num módulo de
// servidor que qualquer um pode importar. Antes moravam DENTRO da rota do cron, e ninguém pode importar uma rota: a série automática
// precisava do id 'parked-…' da tentativa N para enxergar uma retomada cujo aluguel ficou sem desfecho (o cron morreu no meio do POST).
// As fórmulas são as MESMAS, byte a byte: trocar qualquer coisa aqui muda o id de filmes já estacionados (aluguel e fechamento repetidos).
import { createHash } from 'node:crypto'
import { uuidDeHex } from '@/lib/filaQuedaFal'

const idDe = (...parts: string[]) => uuidDeHex(createHash('sha256').update(JSON.stringify(['kineo:fila-queda-fal:v1', ...parts])).digest('hex').slice(0, 32))
/** Id do marcador de fechamento: UM por filme estacionado (a 2ª rodada cai no 23505 e não manda e-mail repetido). */
export const idDoFechamento = (genId: string) => idDe('closed', genId)
/** Id do aluguel da tentativa N. */
export const idDoAluguel = (genId: string, attempt: number) => idDe('lease', genId, String(attempt))
/** generationId da retomada N: determinístico, logo o mesmo claim se a rodada repetir a mesma tentativa. */
export const idDaRetomada = (genId: string, attempt: number) => `parked-${idDe('resume', genId, String(attempt)).replace(/-/g, '').slice(0, 24)}`

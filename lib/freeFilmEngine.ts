// KINEO-LLMS-K4-2910 — public first-film copy follows the same rollback switch as generation.
import { KLING4_TRIAL_LIVE } from './kling4TrialPolicy'

// KINEO-K4-NARRACAO-CABE-0111 [TRAVA 8.2 — vai do fundador 02/11 "vai 16"] — selo honesto: o filme grátis sai no Kling 4.0
// quando a história cabe em 15 s; narração mais longa vai ao Seedance 1.5 (a rota mede a voz antes de pagar). O nome do motor
// do filme grátis, usado em ~100 frases de 16 línguas, passa a nomear os DOIS — a forma mais curta que é verdade em toda língua.
export const FREE_FILM_ENGINE_NAME = KLING4_TRIAL_LIVE ? 'Kling 4.0 / Seedance 1.5' : 'Seedance 1.5'
/** O filme grátis PODE sair no Kling 4.0 (interruptor de reversão). Para decisões de copy — nunca comparar o nome acima. */
export const FREE_FILM_IS_KLING4 = KLING4_TRIAL_LIVE
/** A condição, por extenso, onde a página promete o Kling 4.0 grátis. Vazia com o Kling 4 grátis desligado. */
export const FREE_FILM_FITS_CLAUSE = KLING4_TRIAL_LIVE ? ' when the story fits 15 seconds; longer narration goes to Seedance 1.5' : ''
export const FREE_FILM_FITS_CLAUSE_PT = KLING4_TRIAL_LIVE ? ' quando a história cabe em 15 segundos; narração mais longa vai para o Seedance 1.5' : ''
export const FREE_FILM_FITS_CLAUSE_ES = KLING4_TRIAL_LIVE ? ' cuando la historia cabe en 15 segundos; una narración más larga va a Seedance 1.5' : ''
/** O motor do filme grátis com a condição, para "(…)" depois de "free 15-second film". */
export const FREE_FILM_ENGINE_CONDITION = KLING4_TRIAL_LIVE ? 'Kling 4.0 when the story fits 15 seconds; longer narration goes to Seedance 1.5' : 'Seedance 1.5'

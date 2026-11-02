// KINEO-LLMS-K4-2910 — public first-film copy follows the same rollback switch as generation.
import { KLING4_TRIAL_LIVE } from './kling4TrialPolicy'

// KINEO-K4-NARRACAO-CABE-0111 [TRAVA 8.2 — vai do fundador 02/11 "vai 16"] — selo honesto: o filme grátis sai no Kling 4.0
// quando a história cabe em 15 s; narração mais longa vai ao Seedance 1.5 (a rota mede a voz antes de pagar). O nome do motor
// do filme grátis, usado em ~100 frases de 16 línguas, passa a nomear os DOIS — a forma mais curta que é verdade em toda língua.
export const FREE_FILM_ENGINE_NAME = KLING4_TRIAL_LIVE ? 'Kling 4.0 / Seedance 1.5' : 'Seedance 1.5'
/** O filme grátis PODE sair no Kling 4.0 (interruptor de reversão). Para decisões de copy — nunca comparar o nome acima. */
export const FREE_FILM_IS_KLING4 = KLING4_TRIAL_LIVE
/** A condição, onde a frase já promete o Kling 4.0 grátis ("free on Kling 4.0" + isto). Vazia com o Kling 4 grátis desligado. */
export const FREE_FILM_FITS_CLAUSE = KLING4_TRIAL_LIVE ? ' when the story fits 15 seconds' : ''
/** Depois de "free 15-second film (Kling 4.0 / Seedance 1.5)": qual dos dois e quando. */
export const FREE_FILM_ON_KLING4_CLAUSE = KLING4_TRIAL_LIVE ? ', on Kling 4.0 when the story fits 15 seconds' : ''

// KINEO-LLMS-K4-2910 — public first-film copy follows the same rollback switch as generation.
import { KLING4_TRIAL_LIVE } from './kling4TrialPolicy'

// KINEO-LLMS-K4-2910 — the primary engine name is copy, not a guarantee against budget fallback.
export const FREE_FILM_ENGINE_NAME = KLING4_TRIAL_LIVE ? 'Kling 4.0' : 'Seedance 1.5'

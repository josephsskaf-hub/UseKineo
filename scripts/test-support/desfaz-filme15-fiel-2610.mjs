// FILME15-FIEL-2610 historical entrypoint requested by FILME15-PERFEITO-2610.
// This bridge strips only the newer exact layer before the existing canonical/video chain.
// It does not assert that the separately named FILME15-FIEL prerequisite was delivered.
import { semFilme15Perfeito2610 } from './desfaz-filme15-perfeito-2610.mjs'
export const semFilme15Fiel2610 = (source, file) => semFilme15Perfeito2610(source, file)

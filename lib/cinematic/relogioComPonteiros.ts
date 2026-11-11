// KINEO-RELOGIO-PONTEIROS-1111 [CEO 11/11, reprise dos 6 filmes] — o vizinho (f2e8cffc, nota 6,0) tinha no prompt "a clock on the wall showing
// 02:46" — o gancho da história ("ogni notte, precisamente alle 02:46") — e o relógio saiu marcando ~8:40. Toda cena leva "no readable text,
// letters, NUMBERS…": o motor não pode desenhar 02:46 em dígitos e sorteia uma hora. Aqui o relógio que mostra uma hora vira relógio de
// PONTEIROS apontando para ela, com o mostrador sem dígitos: a hora do gancho aparece sem brigar com a proteção de texto. Puro; cena sem
// relógio com hora = o mesmo prompt. Guardião: scripts/test-relogio-ponteiros-1111.mjs.
export const MARCA_RELOGIO_PONTEIROS = 'KINEO-RELOGIO-PONTEIROS-1111'
const RELOGIO_RE = /((?<![\p{L}])(?:an?\s+|the\s+)?(?:(?:old|antique|vintage|large|small|big|round|wall|digital|analog|analogue|bedside|kitchen|station|alarm)\s+){0,3}clock(?:\s+on\s+the\s+wall)?)\s*,?\s*(?:showing|shows|that shows|which shows|reading|reads|displaying|displays|pointing to|set to|stopped at|at)\s+(?:exactly\s+|precisely\s+)?(\d{1,2})[:.h](\d{2})(?![\p{N}])/giu

/** O prompt com todo relógio que mostra uma hora trocado por relógio de ponteiros apontando para ela, mostrador sem dígitos. */
export function relogioComPonteiros(prompt: string): string {
  return String(prompt ?? '').replace(RELOGIO_RE, (_m, relogio: string, h: string, mm: string) => {
    const hora = Number(h) % 12 || 12
    return `${relogio.replace(/(?<![\p{L}])digital\s+/iu, '')} whose hands point to ${hora}:${mm} (an analog face with plain tick marks and no digits)`
  })
}

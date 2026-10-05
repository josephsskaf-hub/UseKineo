/** Localize only known canonical UI sentences, preserving every captured amount. */
export function canonicalCopySpanish(text: string): string | undefined {
  let match: RegExpMatchArray | null
  if ((match = text.match(/^Generate · (\d+) cr →$/))) return `Generar · ${match[1]} cr →`
  if ((match = text.match(/^Need (\d+) more credits$/))) return `Necesitas ${match[1]} créditos más`
  if ((match = text.match(/^Trim ([\d,]+) characters to continue$/))) return `Recorta ${match[1]} caracteres para continuar`
  if ((match = text.match(/^(\d+) credits \/ video$/))) return `${match[1]} créditos / vídeo`
  if ((match = text.match(/^≈ (\d+) finished films? — (\d+) AI scenes$/))) return `≈ ${match[1]} ${match[1] === '1' ? 'vídeo terminado' : 'vídeos terminados'} — ${match[2]} escenas IA`
  // KINEO-VERDADE-TRIAL-2026-10-05 — a promessa velha dos motores saiu do inglês (o grant paga o filme de 15 s, não Kling/Veo);
  // as frases canônicas abaixo são as novas, com TRIAL_FIRST_FILM_PHRASE (lib/freeTierOffer.ts) e os números capturados.
  if ((match = text.match(/^every new account( in supported countries)? gets (\d+) free credits — enough for your first (\d+)-second AI film$/))) {
    return `cada cuenta nueva${match[1] ? ' en los países disponibles' : ''} recibe ${match[2]} créditos gratuitos — suficientes para tu primer vídeo con IA de ${match[3]} segundos`
  }
  if ((match = text.match(/^New accounts get (\d+) credits — enough for your first (\d+)-second AI film; trial films are watermarked\.$/))) {
    return `Las cuentas nuevas reciben ${match[1]} créditos — suficientes para tu primer vídeo con IA de ${match[2]} segundos; los vídeos de prueba llevan marca de agua.`
  }
  if ((match = text.match(/^Kineo lists and charges plan prices in (USD) worldwide\. Your bank may convert the charge to your local currency and may add conversion or cross-border fees\.$/))) {
    return `Kineo muestra y cobra los planes en ${match[1]} en todo el mundo. Tu banco puede convertir el cargo a tu moneda local y aplicar comisiones de conversión o de transacción internacional.`
  }
  return undefined
}

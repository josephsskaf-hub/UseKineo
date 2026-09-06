/** Localize only known canonical UI sentences, preserving every captured amount. */
export function canonicalCopySpanish(text: string): string | undefined {
  let match: RegExpMatchArray | null
  if ((match = text.match(/^Generate · (\d+) cr →$/))) return `Generar · ${match[1]} cr →`
  if ((match = text.match(/^Need (\d+) more credits$/))) return `Necesitas ${match[1]} créditos más`
  if ((match = text.match(/^Trim ([\d,]+) characters to continue$/))) return `Recorta ${match[1]} caracteres para continuar`
  if ((match = text.match(/^(\d+) credits \/ video$/))) return `${match[1]} créditos / vídeo`
  if ((match = text.match(/^≈ (\d+) finished films? — (\d+) AI scenes$/))) return `≈ ${match[1]} ${match[1] === '1' ? 'vídeo terminado' : 'vídeos terminados'} — ${match[2]} escenas IA`
  if ((match = text.match(/^Start free — every engine unlocked, including Kling 3\. Make (\d+) AI films? free, watermarked\. Upgrade any time to download them clean\.$/))) {
    return `Empieza gratis con todos los motores desbloqueados, incluido Kling 3. Crea ${match[1]} ${match[1] === '1' ? 'vídeo gratuito' : 'vídeos gratuitos'} con IA y marca de agua. Pásate a un plan cuando quieras para descargarlos sin marca de agua.`
  }
  if ((match = text.match(/^every new account gets (\d+) free credits with every engine unlocked, Kling 3 included$/))) {
    return `cada cuenta nueva recibe ${match[1]} créditos gratuitos con todos los motores desbloqueados, incluido Kling 3`
  }
  if ((match = text.match(/^New accounts get (\d+) credits with every engine unlocked, watermarked; after it ends, free access gives 1 watermarked Fast video per month that you can download and share\.$/))) {
    return `Las cuentas nuevas reciben ${match[1]} créditos con todos los motores desbloqueados y marca de agua. Después, el acceso gratuito incluye 1 vídeo Fast al mes con marca de agua que puedes descargar y compartir.`
  }
  if ((match = text.match(/^Kineo lists and charges plan prices in (USD) worldwide\. Your bank may convert the charge to your local currency and may add conversion or cross-border fees\.$/))) {
    return `Kineo muestra y cobra los planes en ${match[1]} en todo el mundo. Tu banco puede convertir el cargo a tu moneda local y aplicar comisiones de conversión o de transacción internacional.`
  }
  return undefined
}

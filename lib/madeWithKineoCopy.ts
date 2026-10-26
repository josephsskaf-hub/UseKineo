import type { ShowcaseFilm, ShowcaseLocale } from '@/lib/madeWithKineo'

export const SHOWCASE_COPY = {
  en: {
    title: 'Made with Kineo', eyebrow: 'A few words. A finished film.',
    intro: 'Watch films their creators chose to share. Find an idea, then make your own.',
    cta: 'Make yours free', empty: 'The first films are on their way.',
    emptyDetail: 'Films appear here only after their owner chooses “Show in the showcase” after downloading. Nothing is shared automatically.',
    topic: 'Theme', language: 'Language', engine: 'Engine', unknown: 'Not recorded',
    internal: 'Kineo team example', consent: 'Shared with the owner’s explicit permission.',
    back: 'All films', next: 'Next films', previous: 'Previous films', examples: 'Kineo examples',
    words: (n: number) => `${n} words in the saved topic`,
    time: (n: number) => `Rendered in ~${n} ${n === 1 ? 'minute' : 'minutes'}`,
    timeUnknown: 'Made with Kineo · creation time not recorded',
    publish: 'Show in the showcase', remove: 'Remove from the showcase',
    explain: 'Optional. This makes this film, its title and theme public and discoverable in search. Your account name and email are never shown. Your other films stay private.',
    removeExplain: 'Removing it also removes its public watch page. Copies already downloaded or indexed elsewhere cannot be recalled.',
    off: 'Off', on: 'Public', saving: 'Saving…', loading: 'Checking privacy…',
    error: 'We could not confirm the change. Check the saved privacy setting before trying again.',
    retry: 'Check again', manage: 'Manage this film’s privacy', manageTitle: 'Your film’s public visibility',
    library: 'Back to my library', view: 'View public film',
  },
  pt: {
    title: 'Feito com Kineo', eyebrow: 'Poucas palavras. Um filme pronto.',
    intro: 'Assista aos filmes que seus criadores escolheram compartilhar. Encontre uma ideia e faça o seu.',
    cta: 'Faça o seu grátis', empty: 'Os primeiros filmes estão a caminho.',
    emptyDetail: 'Os filmes aparecem aqui só quando o dono escolhe “Mostrar na vitrine” depois de baixar. Nada é compartilhado automaticamente.',
    topic: 'Tema', language: 'Língua', engine: 'Motor', unknown: 'Não registrado',
    internal: 'Exemplo da equipe Kineo', consent: 'Compartilhado com consentimento explícito do dono.',
    back: 'Todos os filmes', next: 'Próximos filmes', previous: 'Filmes anteriores', examples: 'Exemplos da Kineo',
    words: (n: number) => `${n} palavras no tema salvo`,
    time: (n: number) => `Renderizado em ~${n} ${n === 1 ? 'minuto' : 'minutos'}`,
    timeUnknown: 'Feito com Kineo · tempo de criação não registrado',
    publish: 'Mostrar na vitrine', remove: 'Retirar da vitrine',
    explain: 'Opcional. Este filme, seu título e tema ficam públicos e podem aparecer em buscas. Seu nome de conta e e-mail nunca são mostrados. Os outros filmes continuam privados.',
    removeExplain: 'Retirar também remove a página pública do filme. Não é possível recolher cópias já baixadas ou indexadas em outros lugares.',
    off: 'Desligado', on: 'Público', saving: 'Salvando…', loading: 'Conferindo privacidade…',
    error: 'Não foi possível confirmar a mudança. Confira a privacidade salva antes de tentar de novo.',
    retry: 'Conferir de novo', manage: 'Gerenciar a privacidade deste filme', manageTitle: 'Visibilidade pública do seu filme',
    library: 'Voltar à minha biblioteca', view: 'Ver filme público',
  },
  es: {
    title: 'Hecho con Kineo', eyebrow: 'Pocas palabras. Una película lista.',
    intro: 'Mira las películas que sus creadores eligieron compartir. Encuentra una idea y crea la tuya.',
    cta: 'Crea la tuya gratis', empty: 'Las primeras películas están en camino.',
    emptyDetail: 'Las películas aparecen aquí solo cuando su dueño elige “Mostrar en la galería” después de descargarlas. Nada se comparte automáticamente.',
    topic: 'Tema', language: 'Idioma', engine: 'Motor', unknown: 'No registrado',
    internal: 'Ejemplo del equipo Kineo', consent: 'Compartido con el consentimiento explícito de su dueño.',
    back: 'Todas las películas', next: 'Más películas', previous: 'Películas anteriores', examples: 'Ejemplos de Kineo',
    words: (n: number) => `${n} palabras en el tema guardado`,
    time: (n: number) => `Renderizado en ~${n} ${n === 1 ? 'minuto' : 'minutos'}`,
    timeUnknown: 'Hecho con Kineo · tiempo de creación no registrado',
    publish: 'Mostrar en la galería', remove: 'Retirar de la galería',
    explain: 'Opcional. Esta película, su título y tema serán públicos y podrán aparecer en búsquedas. Tu nombre de cuenta y correo nunca se muestran. Tus otras películas siguen privadas.',
    removeExplain: 'Retirarla también elimina su página pública. No se pueden recuperar copias ya descargadas o indexadas en otros sitios.',
    off: 'Desactivado', on: 'Público', saving: 'Guardando…', loading: 'Comprobando privacidad…',
    error: 'No pudimos confirmar el cambio. Comprueba la privacidad guardada antes de intentarlo de nuevo.',
    retry: 'Comprobar de nuevo', manage: 'Gestionar la privacidad de esta película', manageTitle: 'Visibilidad pública de tu película',
    library: 'Volver a mi biblioteca', view: 'Ver película pública',
  },
}

export function showcaseProductionLine(film: ShowcaseFilm, locale: ShowcaseLocale): string {
  const copy = SHOWCASE_COPY[locale]
  const time = film.generationSeconds !== null
    ? copy.time(Math.max(1, Math.round(film.generationSeconds / 60))) : copy.timeUnknown
  return film.inputWordCount === null ? time : `${time} · ${copy.words(film.inputWordCount)}`
}

export function showcaseCreateHref(locale: ShowcaseLocale): string {
  return `/signup?create_intent=fast&lang=${locale}&utm_source=made_with_kineo&utm_medium=showcase&utm_campaign=vitrine_filmes_2610`
}

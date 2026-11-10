// KINEO-TELA-NOVA-1011 [fundador 10/11: "Eu quero no ar os fluxos novos que a gente desenhou para o Recreate, para todos os outros fluxos"]
// Interruptor ÚNICO da tela nova (/create/film, /create/cartoon, /create/ads e as abas na tela do Recreate).
// 'off' = ninguém vê (404) · 'internal' = só a allowlist exata da casa (lib/recreate/access.ts → releaseVisible) · 'public' = toda conta
// logada; visitante vai ao cadastro e volta para a aba. Módulo puro e seguro no cliente: a lista de e-mails NÃO mora aqui.
import type { InternalRelease } from '@/lib/recreate/release'

export const CREATE_SHELL_RELEASE: InternalRelease = 'internal'

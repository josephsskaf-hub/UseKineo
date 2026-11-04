// KINEO-LOGIN-QUADRO-0411 — fundador 04/11: "vai ter três logins" (Google, Apple e Microsoft).
// Módulo puro. O botão só aparece com o provedor ativo no Supabase; antes disso, o clique mostraria "provider is not enabled" a um cliente.
// Em 04/11 o Supabase respondia 400 para apple e azure; a Microsoft foi ativada no mesmo dia (aplicativo Use Kineo no Azure). Roteiro de ativação: docs/LOGIN-APPLE-MICROSOFT.md. Ligar = trocar para true e publicar.
export const APPLE_LOGIN_LIVE: boolean = false
export const MICROSOFT_LOGIN_LIVE: boolean = true

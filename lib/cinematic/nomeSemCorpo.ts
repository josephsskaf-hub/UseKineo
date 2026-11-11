// KINEO-NOME-SEM-CORPO-1111 [CEO 11/11, vigia do filme 2120f018] — o texto teológico "This manifestation is God, yet not all of God" virou a ficha
// "God, exactly as the author wrote: "manifestation is God"; a living creature filmed in photorealistic live action" + "The only person in this
// shot is the same main character (God…)" — e o filme terminou com uma PESSOA de costas. Mesma família do "Argentinosaurus, a person in their
// thirties" (KINEO-ESPECIE-NAO-E-GENTE-1111): um nome que não tem corpo de gente vira personagem com rosto e roupa. Divindade e conceito
// (God, Yahweh, Jehovah, Allah, the Lord, Holy Spirit, the Almighty, the Creator, Elohim, Adonai) nunca viram ficha de personagem: a cena
// mostra o que o planejador descreveu (luz, céu, símbolo), não um ator. Figura religiosa com corpo na tradição (Jesus, Moses, Krishna, Zeus)
// continua com a iconografia da casa. Puro.
export const MARCA_NOME_SEM_CORPO = 'KINEO-NOME-SEM-CORPO-1111'
const SEM_CORPO_RE = /^(?:the\s+)?(?:god|yahweh|jehovah|allah|lord|almighty|holy spirit|holy ghost|creator|elohim|adonai|hashem|divine|godhead)$/iu

/** O nome é de divindade/conceito sem corpo humano (nunca vira ficha de personagem)? */
export function nomeSemCorpo(nome: unknown): boolean {
  return SEM_CORPO_RE.test(String(nome ?? '').trim().replace(/[.,;:!?'’"]+$/u, ''))
}

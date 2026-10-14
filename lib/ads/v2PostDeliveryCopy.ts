// KINEO-ADS-POS-ENTREGA-1510 — as frases das ferramentas depois da entrega (editar · aprovação do cliente · 3 formatos) e da página
// pública de aprovação, nas 16 línguas da interface. LIB PURA (só import type). Placeholders: {n} {brand} {days}.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export interface AdsV2PosEntregaCopy {
  title: string; lead: string; free: string
  tabEdit: string; tabShare: string; tabFormats: string
  phrases: string; phraseN: string
  card: string; cardKeep: string; cardRedraw: string; cardTitle: string; cardCta: string; cardContact: string; cardPrice: string; cardLogo: string; cardLogoChange: string; cardLogoRemove: string; cardColor: string
  music: string; musicKeep: string; musicNone: string; moodEmotional: string; moodEpic: string; moodTech: string
  order: string; orderHint: string; up: string; down: string; remove: string; restore: string; shotN: string
  voiceLocked: string; presenterLocked: string
  apply: string; applying: string; nothing: string
  versions: string; original: string; versionN: string; rendering: string; failed: string; download: string; inLibrary: string
  share: string; shareLead: string; brand: string; pageLang: string; video: string; create: string; copy: string; copied: string; linkNote: string
  approvals: string; stPending: string; stApproved: string; stChanges: string; stRevoked: string; revoke: string; clientSaid: string; noApprovals: string
  formats: string; formatsLead: string; formatsBtn: string; formatsBusy: string
  errGeneric: string; errNotReady: string; errBusy: string; errMax: string; errVoice: string; errBrand: string
  // página pública
  pTitle: string; pFrom: string; pApprove: string; pChanges: string; pComment: string; pSend: string; pApproved: string; pSent: string; pAlready: string; pInvalid: string; pCommentRequired: string; pPowered: string
}

const EN: AdsV2PosEntregaCopy = {
  title: 'After delivery', lead: 'Edit, get approval and export, using the clips you already have. Nothing is generated again.', free: 'Free for now: no credits.',
  tabEdit: 'Edit', tabShare: 'Share for approval', tabFormats: 'Get 9:16 + 4:5 + 1:1',
  phrases: 'On-screen phrases', phraseN: 'Phrase {n}',
  card: 'End card', cardKeep: 'Keep the current end card', cardRedraw: 'Redraw the end card', cardTitle: 'Title', cardCta: 'Button text', cardContact: 'Contact', cardPrice: 'Price or offer', cardLogo: 'Logo', cardLogoChange: 'Change logo', cardLogoRemove: 'Remove logo', cardColor: 'Color',
  music: 'Music', musicKeep: 'Keep the current music', musicNone: 'No music', moodEmotional: 'Warm', moodEpic: 'Epic', moodTech: 'Modern',
  order: 'Shot order', orderHint: 'Drag a shot or use the arrows. Removing a shot is optional.', up: 'Move up', down: 'Move down', remove: 'Remove', restore: 'Put back', shotN: 'Shot {n}',
  voiceLocked: 'The voice-over stays as it is: changing what it says needs a new recording.', presenterLocked: 'The AI presenter keeps the same speech.',
  apply: 'Apply changes', applying: 'Putting it together…', nothing: 'Change something first.',
  versions: 'Versions', original: 'Original', versionN: 'Version {n}', rendering: 'Putting it together (about 1–2 min)…', failed: 'This one did not work. Nothing was charged.', download: 'Download', inLibrary: 'Every version also stays in My Videos.',
  share: 'Share for approval', shareLead: 'Send your client a private link. They watch the ad and tap Approve or Request changes. No login.', brand: 'Your brand name (the client sees it)', pageLang: 'Page language', video: 'Video', create: 'Create private link', copy: 'Copy link', copied: 'Copied', linkNote: 'Anyone with this link can see this ad. It expires in {days} days. Save it now: it is shown only once.',
  approvals: 'Client approvals', stPending: 'Waiting for the client', stApproved: 'Approved', stChanges: 'Changes requested', stRevoked: 'Link turned off', revoke: 'Turn off link', clientSaid: 'Client comment', noApprovals: 'No links shared yet.',
  formats: 'All formats', formatsLead: 'The same ad in vertical, portrait and square, from the same clips. Text and the end card are placed to fit; effect shots get a soft background instead of a hard crop.', formatsBtn: 'Get 9:16 + 4:5 + 1:1', formatsBusy: 'Putting the formats together…',
  errGeneric: 'Something went wrong. Please try again.', errNotReady: 'This is being switched on. Try again in a little while.', errBusy: 'Other versions are still being put together. Wait for one to finish.', errMax: 'This ad reached its version limit.', errVoice: 'Without that shot the voice-over no longer fits. Put a shot back.', errBrand: 'Write just a name (no email, phone or link).',
  pTitle: 'Ad for your approval', pFrom: 'From {brand}', pApprove: 'Approve', pChanges: 'Request changes', pComment: 'What should change?', pSend: 'Send', pApproved: 'Approved. Thank you!', pSent: 'Thank you. Your comments were sent.', pAlready: 'This ad already has an answer.', pInvalid: 'This link is not valid or has expired.', pCommentRequired: 'Write what should change.', pPowered: 'Private review link',
}

const PT: AdsV2PosEntregaCopy = {
  title: 'Depois da entrega', lead: 'Edite, peça aprovação e exporte usando os clipes que você já tem. Nada é gerado de novo.', free: 'Grátis por enquanto: sem créditos.',
  tabEdit: 'Editar', tabShare: 'Enviar para aprovação', tabFormats: 'Baixar 9:16 + 4:5 + 1:1',
  phrases: 'Frases na tela', phraseN: 'Frase {n}',
  card: 'Cartão final', cardKeep: 'Manter o cartão final atual', cardRedraw: 'Refazer o cartão final', cardTitle: 'Título', cardCta: 'Texto do botão', cardContact: 'Contato', cardPrice: 'Preço ou oferta', cardLogo: 'Logo', cardLogoChange: 'Trocar logo', cardLogoRemove: 'Tirar logo', cardColor: 'Cor',
  music: 'Música', musicKeep: 'Manter a música atual', musicNone: 'Sem música', moodEmotional: 'Calorosa', moodEpic: 'Épica', moodTech: 'Moderna',
  order: 'Ordem das cenas', orderHint: 'Arraste uma cena ou use as setas. Tirar uma cena é opcional.', up: 'Subir', down: 'Descer', remove: 'Tirar', restore: 'Voltar', shotN: 'Cena {n}',
  voiceLocked: 'A narração fica como está: mudar o que ela diz exige uma gravação nova.', presenterLocked: 'O apresentador de IA mantém a mesma fala.',
  apply: 'Aplicar mudanças', applying: 'Montando…', nothing: 'Mude alguma coisa primeiro.',
  versions: 'Versões', original: 'Original', versionN: 'Versão {n}', rendering: 'Montando (cerca de 1–2 min)…', failed: 'Esta não deu certo. Nada foi cobrado.', download: 'Baixar', inLibrary: 'Toda versão também fica em Meus Vídeos.',
  share: 'Enviar para aprovação', shareLead: 'Mande um link privado ao seu cliente. Ele assiste e toca em Aprovar ou Pedir mudanças. Sem login.', brand: 'Nome da sua marca (o cliente vê)', pageLang: 'Língua da página', video: 'Vídeo', create: 'Criar link privado', copy: 'Copiar link', copied: 'Copiado', linkNote: 'Quem tiver este link vê este anúncio. Vale por {days} dias. Guarde agora: ele aparece só uma vez.',
  approvals: 'Aprovações do cliente', stPending: 'Esperando o cliente', stApproved: 'Aprovado', stChanges: 'Pediu mudanças', stRevoked: 'Link desligado', revoke: 'Desligar link', clientSaid: 'Comentário do cliente', noApprovals: 'Nenhum link enviado ainda.',
  formats: 'Todos os formatos', formatsLead: 'O mesmo anúncio em vertical, retrato e quadrado, com os mesmos clipes. Texto e cartão final se ajustam; cenas de efeito ganham fundo suave em vez de corte duro.', formatsBtn: 'Baixar 9:16 + 4:5 + 1:1', formatsBusy: 'Montando os formatos…',
  errGeneric: 'Algo deu errado. Tente de novo.', errNotReady: 'Isto está sendo ligado. Tente de novo daqui a pouco.', errBusy: 'Outras versões ainda estão sendo montadas. Espere uma terminar.', errMax: 'Este anúncio chegou ao limite de versões.', errVoice: 'Sem essa cena a narração não cabe mais. Volte uma cena.', errBrand: 'Escreva só um nome (sem e-mail, telefone ou link).',
  pTitle: 'Anúncio para sua aprovação', pFrom: 'De {brand}', pApprove: 'Aprovar', pChanges: 'Pedir mudanças', pComment: 'O que deve mudar?', pSend: 'Enviar', pApproved: 'Aprovado. Obrigado!', pSent: 'Obrigado. Seus comentários foram enviados.', pAlready: 'Este anúncio já tem uma resposta.', pInvalid: 'Este link não é válido ou expirou.', pCommentRequired: 'Escreva o que deve mudar.', pPowered: 'Link privado de revisão',
}

const ES: AdsV2PosEntregaCopy = {
  title: 'Después de la entrega', lead: 'Edita, pide aprobación y exporta con los clips que ya tienes. No se genera nada de nuevo.', free: 'Gratis por ahora: sin créditos.',
  tabEdit: 'Editar', tabShare: 'Enviar para aprobación', tabFormats: 'Obtener 9:16 + 4:5 + 1:1',
  phrases: 'Frases en pantalla', phraseN: 'Frase {n}',
  card: 'Tarjeta final', cardKeep: 'Mantener la tarjeta final actual', cardRedraw: 'Rehacer la tarjeta final', cardTitle: 'Título', cardCta: 'Texto del botón', cardContact: 'Contacto', cardPrice: 'Precio u oferta', cardLogo: 'Logo', cardLogoChange: 'Cambiar logo', cardLogoRemove: 'Quitar logo', cardColor: 'Color',
  music: 'Música', musicKeep: 'Mantener la música actual', musicNone: 'Sin música', moodEmotional: 'Cálida', moodEpic: 'Épica', moodTech: 'Moderna',
  order: 'Orden de las tomas', orderHint: 'Arrastra una toma o usa las flechas. Quitar una toma es opcional.', up: 'Subir', down: 'Bajar', remove: 'Quitar', restore: 'Devolver', shotN: 'Toma {n}',
  voiceLocked: 'La voz en off se queda como está: cambiar lo que dice requiere una grabación nueva.', presenterLocked: 'El presentador de IA mantiene el mismo discurso.',
  apply: 'Aplicar cambios', applying: 'Montando…', nothing: 'Cambia algo primero.',
  versions: 'Versiones', original: 'Original', versionN: 'Versión {n}', rendering: 'Montando (unos 1–2 min)…', failed: 'Esta no funcionó. No se cobró nada.', download: 'Descargar', inLibrary: 'Cada versión también queda en Mis videos.',
  share: 'Enviar para aprobación', shareLead: 'Envía a tu cliente un enlace privado. Mira el anuncio y toca Aprobar o Pedir cambios. Sin iniciar sesión.', brand: 'Nombre de tu marca (lo ve el cliente)', pageLang: 'Idioma de la página', video: 'Video', create: 'Crear enlace privado', copy: 'Copiar enlace', copied: 'Copiado', linkNote: 'Quien tenga este enlace puede ver este anuncio. Vence en {days} días. Guárdalo ahora: se muestra una sola vez.',
  approvals: 'Aprobaciones del cliente', stPending: 'Esperando al cliente', stApproved: 'Aprobado', stChanges: 'Pidió cambios', stRevoked: 'Enlace desactivado', revoke: 'Desactivar enlace', clientSaid: 'Comentario del cliente', noApprovals: 'Aún no se compartió ningún enlace.',
  formats: 'Todos los formatos', formatsLead: 'El mismo anuncio en vertical, retrato y cuadrado, con los mismos clips. El texto y la tarjeta final se ajustan; las tomas con efecto llevan fondo suave en vez de un recorte duro.', formatsBtn: 'Obtener 9:16 + 4:5 + 1:1', formatsBusy: 'Montando los formatos…',
  errGeneric: 'Algo salió mal. Inténtalo de nuevo.', errNotReady: 'Esto se está activando. Inténtalo en un rato.', errBusy: 'Otras versiones aún se están montando. Espera a que termine una.', errMax: 'Este anuncio llegó al límite de versiones.', errVoice: 'Sin esa toma la voz en off ya no cabe. Devuelve una toma.', errBrand: 'Escribe solo un nombre (sin correo, teléfono ni enlace).',
  pTitle: 'Anuncio para tu aprobación', pFrom: 'De {brand}', pApprove: 'Aprobar', pChanges: 'Pedir cambios', pComment: '¿Qué debería cambiar?', pSend: 'Enviar', pApproved: 'Aprobado. ¡Gracias!', pSent: 'Gracias. Tus comentarios se enviaron.', pAlready: 'Este anuncio ya tiene una respuesta.', pInvalid: 'Este enlace no es válido o venció.', pCommentRequired: 'Escribe qué debería cambiar.', pPowered: 'Enlace privado de revisión',
}

const FR: AdsV2PosEntregaCopy = {
  title: 'Après la livraison', lead: 'Modifiez, faites valider et exportez avec les clips que vous avez déjà. Rien n’est généré à nouveau.', free: 'Gratuit pour l’instant : aucun crédit.',
  tabEdit: 'Modifier', tabShare: 'Envoyer pour validation', tabFormats: 'Obtenir 9:16 + 4:5 + 1:1',
  phrases: 'Phrases à l’écran', phraseN: 'Phrase {n}',
  card: 'Carte de fin', cardKeep: 'Garder la carte de fin actuelle', cardRedraw: 'Refaire la carte de fin', cardTitle: 'Titre', cardCta: 'Texte du bouton', cardContact: 'Contact', cardPrice: 'Prix ou offre', cardLogo: 'Logo', cardLogoChange: 'Changer le logo', cardLogoRemove: 'Retirer le logo', cardColor: 'Couleur',
  music: 'Musique', musicKeep: 'Garder la musique actuelle', musicNone: 'Sans musique', moodEmotional: 'Chaleureuse', moodEpic: 'Épique', moodTech: 'Moderne',
  order: 'Ordre des plans', orderHint: 'Glissez un plan ou utilisez les flèches. Retirer un plan est facultatif.', up: 'Monter', down: 'Descendre', remove: 'Retirer', restore: 'Remettre', shotN: 'Plan {n}',
  voiceLocked: 'La voix off reste telle quelle : changer ce qu’elle dit demande un nouvel enregistrement.', presenterLocked: 'Le présentateur IA garde le même discours.',
  apply: 'Appliquer', applying: 'Montage en cours…', nothing: 'Modifiez d’abord quelque chose.',
  versions: 'Versions', original: 'Original', versionN: 'Version {n}', rendering: 'Montage en cours (environ 1–2 min)…', failed: 'Celle-ci n’a pas marché. Rien n’a été facturé.', download: 'Télécharger', inLibrary: 'Chaque version reste aussi dans Mes vidéos.',
  share: 'Envoyer pour validation', shareLead: 'Envoyez un lien privé à votre client. Il regarde la pub et touche Valider ou Demander des modifications. Sans connexion.', brand: 'Nom de votre marque (visible par le client)', pageLang: 'Langue de la page', video: 'Vidéo', create: 'Créer un lien privé', copy: 'Copier le lien', copied: 'Copié', linkNote: 'Toute personne ayant ce lien peut voir cette pub. Il expire dans {days} jours. Gardez-le maintenant : il n’est affiché qu’une fois.',
  approvals: 'Validations du client', stPending: 'En attente du client', stApproved: 'Validé', stChanges: 'Modifications demandées', stRevoked: 'Lien désactivé', revoke: 'Désactiver le lien', clientSaid: 'Commentaire du client', noApprovals: 'Aucun lien partagé pour l’instant.',
  formats: 'Tous les formats', formatsLead: 'La même pub en vertical, portrait et carré, avec les mêmes clips. Le texte et la carte de fin s’ajustent ; les plans à effet ont un fond doux au lieu d’un recadrage brutal.', formatsBtn: 'Obtenir 9:16 + 4:5 + 1:1', formatsBusy: 'Montage des formats…',
  errGeneric: 'Un problème est survenu. Réessayez.', errNotReady: 'Cette fonction est en cours d’activation. Réessayez bientôt.', errBusy: 'D’autres versions sont encore en montage. Attendez qu’une se termine.', errMax: 'Cette pub a atteint sa limite de versions.', errVoice: 'Sans ce plan, la voix off ne tient plus. Remettez un plan.', errBrand: 'Écrivez seulement un nom (sans e-mail, téléphone ni lien).',
  pTitle: 'Publicité à valider', pFrom: 'De {brand}', pApprove: 'Valider', pChanges: 'Demander des modifications', pComment: 'Que faut-il changer ?', pSend: 'Envoyer', pApproved: 'Validé. Merci !', pSent: 'Merci. Vos commentaires ont été envoyés.', pAlready: 'Cette pub a déjà une réponse.', pInvalid: 'Ce lien n’est pas valide ou a expiré.', pCommentRequired: 'Écrivez ce qu’il faut changer.', pPowered: 'Lien privé de validation',
}

const DE: AdsV2PosEntregaCopy = {
  title: 'Nach der Lieferung', lead: 'Bearbeiten, freigeben lassen und exportieren – mit den Clips, die du schon hast. Nichts wird neu generiert.', free: 'Vorerst kostenlos: keine Credits.',
  tabEdit: 'Bearbeiten', tabShare: 'Zur Freigabe senden', tabFormats: '9:16 + 4:5 + 1:1 holen',
  phrases: 'Texte im Bild', phraseN: 'Text {n}',
  card: 'Endkarte', cardKeep: 'Aktuelle Endkarte behalten', cardRedraw: 'Endkarte neu gestalten', cardTitle: 'Titel', cardCta: 'Button-Text', cardContact: 'Kontakt', cardPrice: 'Preis oder Angebot', cardLogo: 'Logo', cardLogoChange: 'Logo ändern', cardLogoRemove: 'Logo entfernen', cardColor: 'Farbe',
  music: 'Musik', musicKeep: 'Aktuelle Musik behalten', musicNone: 'Keine Musik', moodEmotional: 'Warm', moodEpic: 'Episch', moodTech: 'Modern',
  order: 'Reihenfolge der Szenen', orderHint: 'Ziehe eine Szene oder nutze die Pfeile. Eine Szene zu entfernen ist optional.', up: 'Nach oben', down: 'Nach unten', remove: 'Entfernen', restore: 'Zurücklegen', shotN: 'Szene {n}',
  voiceLocked: 'Der Sprechertext bleibt wie er ist: Ihn zu ändern bräuchte eine neue Aufnahme.', presenterLocked: 'Der KI-Sprecher behält denselben Text.',
  apply: 'Änderungen anwenden', applying: 'Wird zusammengesetzt…', nothing: 'Ändere zuerst etwas.',
  versions: 'Versionen', original: 'Original', versionN: 'Version {n}', rendering: 'Wird zusammengesetzt (ca. 1–2 Min.)…', failed: 'Das hat nicht geklappt. Es wurde nichts berechnet.', download: 'Herunterladen', inLibrary: 'Jede Version bleibt auch in Meine Videos.',
  share: 'Zur Freigabe senden', shareLead: 'Schick deinem Kunden einen privaten Link. Er sieht die Anzeige und tippt auf Freigeben oder Änderungen anfordern. Ohne Login.', brand: 'Name deiner Marke (der Kunde sieht ihn)', pageLang: 'Sprache der Seite', video: 'Video', create: 'Privaten Link erstellen', copy: 'Link kopieren', copied: 'Kopiert', linkNote: 'Jeder mit diesem Link kann die Anzeige sehen. Er läuft in {days} Tagen ab. Speichere ihn jetzt: Er wird nur einmal angezeigt.',
  approvals: 'Freigaben der Kunden', stPending: 'Wartet auf den Kunden', stApproved: 'Freigegeben', stChanges: 'Änderungen angefordert', stRevoked: 'Link deaktiviert', revoke: 'Link deaktivieren', clientSaid: 'Kommentar des Kunden', noApprovals: 'Noch keine Links geteilt.',
  formats: 'Alle Formate', formatsLead: 'Dieselbe Anzeige als Hochformat, Porträt und Quadrat, aus denselben Clips. Text und Endkarte passen sich an; Effekt-Szenen bekommen einen weichen Hintergrund statt eines harten Zuschnitts.', formatsBtn: '9:16 + 4:5 + 1:1 holen', formatsBusy: 'Formate werden zusammengesetzt…',
  errGeneric: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.', errNotReady: 'Das wird gerade eingeschaltet. Versuche es gleich noch einmal.', errBusy: 'Andere Versionen werden noch zusammengesetzt. Warte, bis eine fertig ist.', errMax: 'Diese Anzeige hat ihr Versionslimit erreicht.', errVoice: 'Ohne diese Szene passt der Sprechertext nicht mehr. Lege eine Szene zurück.', errBrand: 'Schreib nur einen Namen (keine E-Mail, Telefonnummer oder Link).',
  pTitle: 'Anzeige zur Freigabe', pFrom: 'Von {brand}', pApprove: 'Freigeben', pChanges: 'Änderungen anfordern', pComment: 'Was soll sich ändern?', pSend: 'Senden', pApproved: 'Freigegeben. Danke!', pSent: 'Danke. Deine Kommentare wurden gesendet.', pAlready: 'Diese Anzeige hat schon eine Antwort.', pInvalid: 'Dieser Link ist ungültig oder abgelaufen.', pCommentRequired: 'Schreib, was sich ändern soll.', pPowered: 'Privater Freigabe-Link',
}

const IT: AdsV2PosEntregaCopy = {
  title: 'Dopo la consegna', lead: 'Modifica, fai approvare ed esporta con le clip che hai già. Non viene generato nulla di nuovo.', free: 'Gratis per ora: nessun credito.',
  tabEdit: 'Modifica', tabShare: 'Invia per approvazione', tabFormats: 'Ottieni 9:16 + 4:5 + 1:1',
  phrases: 'Frasi a schermo', phraseN: 'Frase {n}',
  card: 'Scheda finale', cardKeep: 'Tieni la scheda finale attuale', cardRedraw: 'Rifai la scheda finale', cardTitle: 'Titolo', cardCta: 'Testo del pulsante', cardContact: 'Contatto', cardPrice: 'Prezzo o offerta', cardLogo: 'Logo', cardLogoChange: 'Cambia logo', cardLogoRemove: 'Togli logo', cardColor: 'Colore',
  music: 'Musica', musicKeep: 'Tieni la musica attuale', musicNone: 'Nessuna musica', moodEmotional: 'Calda', moodEpic: 'Epica', moodTech: 'Moderna',
  order: 'Ordine delle scene', orderHint: 'Trascina una scena o usa le frecce. Togliere una scena è facoltativo.', up: 'Su', down: 'Giù', remove: 'Togli', restore: 'Rimetti', shotN: 'Scena {n}',
  voiceLocked: 'La voce fuori campo resta com’è: cambiare ciò che dice richiede una nuova registrazione.', presenterLocked: 'Il presentatore IA mantiene lo stesso discorso.',
  apply: 'Applica modifiche', applying: 'Montaggio in corso…', nothing: 'Prima cambia qualcosa.',
  versions: 'Versioni', original: 'Originale', versionN: 'Versione {n}', rendering: 'Montaggio in corso (circa 1–2 min)…', failed: 'Questa non è riuscita. Non è stato addebitato nulla.', download: 'Scarica', inLibrary: 'Ogni versione resta anche in I miei video.',
  share: 'Invia per approvazione', shareLead: 'Manda al cliente un link privato. Guarda l’annuncio e tocca Approva o Chiedi modifiche. Senza accesso.', brand: 'Nome del tuo brand (lo vede il cliente)', pageLang: 'Lingua della pagina', video: 'Video', create: 'Crea link privato', copy: 'Copia link', copied: 'Copiato', linkNote: 'Chiunque abbia questo link può vedere l’annuncio. Scade tra {days} giorni. Salvalo ora: viene mostrato una sola volta.',
  approvals: 'Approvazioni del cliente', stPending: 'In attesa del cliente', stApproved: 'Approvato', stChanges: 'Modifiche richieste', stRevoked: 'Link disattivato', revoke: 'Disattiva link', clientSaid: 'Commento del cliente', noApprovals: 'Nessun link condiviso finora.',
  formats: 'Tutti i formati', formatsLead: 'Lo stesso annuncio in verticale, ritratto e quadrato, con le stesse clip. Testo e scheda finale si adattano; le scene con effetto hanno uno sfondo morbido invece di un taglio netto.', formatsBtn: 'Ottieni 9:16 + 4:5 + 1:1', formatsBusy: 'Montaggio dei formati…',
  errGeneric: 'Qualcosa è andato storto. Riprova.', errNotReady: 'La funzione si sta attivando. Riprova tra poco.', errBusy: 'Altre versioni sono ancora in montaggio. Aspetta che una finisca.', errMax: 'Questo annuncio ha raggiunto il limite di versioni.', errVoice: 'Senza quella scena la voce fuori campo non ci sta più. Rimetti una scena.', errBrand: 'Scrivi solo un nome (niente email, telefono o link).',
  pTitle: 'Annuncio da approvare', pFrom: 'Da {brand}', pApprove: 'Approva', pChanges: 'Chiedi modifiche', pComment: 'Cosa dovrebbe cambiare?', pSend: 'Invia', pApproved: 'Approvato. Grazie!', pSent: 'Grazie. I tuoi commenti sono stati inviati.', pAlready: 'Questo annuncio ha già una risposta.', pInvalid: 'Questo link non è valido o è scaduto.', pCommentRequired: 'Scrivi cosa dovrebbe cambiare.', pPowered: 'Link privato di revisione',
}

const NL: AdsV2PosEntregaCopy = {
  title: 'Na de levering', lead: 'Bewerk, laat goedkeuren en exporteer met de clips die je al hebt. Er wordt niets opnieuw gegenereerd.', free: 'Voorlopig gratis: geen credits.',
  tabEdit: 'Bewerken', tabShare: 'Ter goedkeuring sturen', tabFormats: '9:16 + 4:5 + 1:1 ophalen',
  phrases: 'Teksten in beeld', phraseN: 'Tekst {n}',
  card: 'Eindkaart', cardKeep: 'Huidige eindkaart houden', cardRedraw: 'Eindkaart opnieuw maken', cardTitle: 'Titel', cardCta: 'Knoptekst', cardContact: 'Contact', cardPrice: 'Prijs of aanbod', cardLogo: 'Logo', cardLogoChange: 'Logo wijzigen', cardLogoRemove: 'Logo verwijderen', cardColor: 'Kleur',
  music: 'Muziek', musicKeep: 'Huidige muziek houden', musicNone: 'Geen muziek', moodEmotional: 'Warm', moodEpic: 'Episch', moodTech: 'Modern',
  order: 'Volgorde van de shots', orderHint: 'Sleep een shot of gebruik de pijlen. Een shot verwijderen is optioneel.', up: 'Omhoog', down: 'Omlaag', remove: 'Verwijderen', restore: 'Terugzetten', shotN: 'Shot {n}',
  voiceLocked: 'De voice-over blijft zoals hij is: wat hij zegt wijzigen vraagt een nieuwe opname.', presenterLocked: 'De AI-presentator houdt dezelfde tekst.',
  apply: 'Wijzigingen toepassen', applying: 'Wordt samengesteld…', nothing: 'Wijzig eerst iets.',
  versions: 'Versies', original: 'Origineel', versionN: 'Versie {n}', rendering: 'Wordt samengesteld (ongeveer 1–2 min)…', failed: 'Deze is niet gelukt. Er is niets afgeschreven.', download: 'Downloaden', inLibrary: 'Elke versie blijft ook in Mijn video’s.',
  share: 'Ter goedkeuring sturen', shareLead: 'Stuur je klant een privélink. Die bekijkt de advertentie en tikt op Goedkeuren of Wijzigingen vragen. Zonder inloggen.', brand: 'Naam van je merk (de klant ziet die)', pageLang: 'Taal van de pagina', video: 'Video', create: 'Privélink maken', copy: 'Link kopiëren', copied: 'Gekopieerd', linkNote: 'Iedereen met deze link kan de advertentie zien. Hij verloopt over {days} dagen. Bewaar hem nu: hij wordt maar één keer getoond.',
  approvals: 'Goedkeuringen van klanten', stPending: 'Wacht op de klant', stApproved: 'Goedgekeurd', stChanges: 'Wijzigingen gevraagd', stRevoked: 'Link uitgezet', revoke: 'Link uitzetten', clientSaid: 'Opmerking van de klant', noApprovals: 'Nog geen links gedeeld.',
  formats: 'Alle formaten', formatsLead: 'Dezelfde advertentie verticaal, staand en vierkant, met dezelfde clips. Tekst en eindkaart passen zich aan; effect-shots krijgen een zachte achtergrond in plaats van een harde uitsnede.', formatsBtn: '9:16 + 4:5 + 1:1 ophalen', formatsBusy: 'Formaten worden samengesteld…',
  errGeneric: 'Er ging iets mis. Probeer het opnieuw.', errNotReady: 'Dit wordt net aangezet. Probeer het straks opnieuw.', errBusy: 'Andere versies worden nog samengesteld. Wacht tot er één klaar is.', errMax: 'Deze advertentie heeft haar versielimiet bereikt.', errVoice: 'Zonder dat shot past de voice-over niet meer. Zet een shot terug.', errBrand: 'Schrijf alleen een naam (geen e-mail, telefoon of link).',
  pTitle: 'Advertentie ter goedkeuring', pFrom: 'Van {brand}', pApprove: 'Goedkeuren', pChanges: 'Wijzigingen vragen', pComment: 'Wat moet er veranderen?', pSend: 'Versturen', pApproved: 'Goedgekeurd. Bedankt!', pSent: 'Bedankt. Je opmerkingen zijn verstuurd.', pAlready: 'Deze advertentie heeft al een antwoord.', pInvalid: 'Deze link is ongeldig of verlopen.', pCommentRequired: 'Schrijf wat er moet veranderen.', pPowered: 'Privé reviewlink',
}

const PL: AdsV2PosEntregaCopy = {
  title: 'Po dostarczeniu', lead: 'Edytuj, uzyskaj akceptację i eksportuj, używając klipów, które już masz. Nic nie jest generowane od nowa.', free: 'Na razie za darmo: bez kredytów.',
  tabEdit: 'Edytuj', tabShare: 'Wyślij do akceptacji', tabFormats: 'Pobierz 9:16 + 4:5 + 1:1',
  phrases: 'Napisy na ekranie', phraseN: 'Napis {n}',
  card: 'Plansza końcowa', cardKeep: 'Zostaw obecną planszę końcową', cardRedraw: 'Zrób planszę końcową od nowa', cardTitle: 'Tytuł', cardCta: 'Tekst przycisku', cardContact: 'Kontakt', cardPrice: 'Cena lub oferta', cardLogo: 'Logo', cardLogoChange: 'Zmień logo', cardLogoRemove: 'Usuń logo', cardColor: 'Kolor',
  music: 'Muzyka', musicKeep: 'Zostaw obecną muzykę', musicNone: 'Bez muzyki', moodEmotional: 'Ciepła', moodEpic: 'Epicka', moodTech: 'Nowoczesna',
  order: 'Kolejność ujęć', orderHint: 'Przeciągnij ujęcie lub użyj strzałek. Usunięcie ujęcia jest opcjonalne.', up: 'W górę', down: 'W dół', remove: 'Usuń', restore: 'Przywróć', shotN: 'Ujęcie {n}',
  voiceLocked: 'Lektor zostaje bez zmian: zmiana tego, co mówi, wymaga nowego nagrania.', presenterLocked: 'Prezenter AI zachowuje tę samą wypowiedź.',
  apply: 'Zastosuj zmiany', applying: 'Składanie…', nothing: 'Najpierw coś zmień.',
  versions: 'Wersje', original: 'Oryginał', versionN: 'Wersja {n}', rendering: 'Składanie (ok. 1–2 min)…', failed: 'Ta się nie udała. Nic nie zostało pobrane.', download: 'Pobierz', inLibrary: 'Każda wersja zostaje też w Moich filmach.',
  share: 'Wyślij do akceptacji', shareLead: 'Wyślij klientowi prywatny link. Obejrzy reklamę i kliknie Akceptuję lub Poproś o zmiany. Bez logowania.', brand: 'Nazwa twojej marki (widzi ją klient)', pageLang: 'Język strony', video: 'Film', create: 'Utwórz prywatny link', copy: 'Kopiuj link', copied: 'Skopiowano', linkNote: 'Każdy z tym linkiem zobaczy tę reklamę. Wygasa za {days} dni. Zapisz go teraz: pokazuje się tylko raz.',
  approvals: 'Akceptacje klientów', stPending: 'Czeka na klienta', stApproved: 'Zaakceptowano', stChanges: 'Poproszono o zmiany', stRevoked: 'Link wyłączony', revoke: 'Wyłącz link', clientSaid: 'Komentarz klienta', noApprovals: 'Nie udostępniono jeszcze żadnego linku.',
  formats: 'Wszystkie formaty', formatsLead: 'Ta sama reklama w pionie, portrecie i kwadracie, z tych samych klipów. Tekst i plansza końcowa się dopasowują; ujęcia z efektem dostają miękkie tło zamiast twardego kadrowania.', formatsBtn: 'Pobierz 9:16 + 4:5 + 1:1', formatsBusy: 'Składanie formatów…',
  errGeneric: 'Coś poszło nie tak. Spróbuj ponownie.', errNotReady: 'Ta funkcja jest właśnie włączana. Spróbuj za chwilę.', errBusy: 'Inne wersje wciąż się składają. Poczekaj, aż jedna się skończy.', errMax: 'Ta reklama osiągnęła limit wersji.', errVoice: 'Bez tego ujęcia lektor się nie mieści. Przywróć ujęcie.', errBrand: 'Wpisz samą nazwę (bez e-maila, telefonu i linku).',
  pTitle: 'Reklama do akceptacji', pFrom: 'Od {brand}', pApprove: 'Akceptuję', pChanges: 'Poproś o zmiany', pComment: 'Co należy zmienić?', pSend: 'Wyślij', pApproved: 'Zaakceptowano. Dziękujemy!', pSent: 'Dziękujemy. Twoje uwagi zostały wysłane.', pAlready: 'Ta reklama ma już odpowiedź.', pInvalid: 'Ten link jest nieważny lub wygasł.', pCommentRequired: 'Napisz, co należy zmienić.', pPowered: 'Prywatny link do akceptacji',
}

const TR: AdsV2PosEntregaCopy = {
  title: 'Teslimattan sonra', lead: 'Elindeki kliplerle düzenle, onay al ve dışa aktar. Hiçbir şey yeniden üretilmez.', free: 'Şimdilik ücretsiz: kredi yok.',
  tabEdit: 'Düzenle', tabShare: 'Onaya gönder', tabFormats: '9:16 + 4:5 + 1:1 al',
  phrases: 'Ekrandaki yazılar', phraseN: 'Yazı {n}',
  card: 'Kapanış kartı', cardKeep: 'Mevcut kapanış kartını koru', cardRedraw: 'Kapanış kartını yeniden yap', cardTitle: 'Başlık', cardCta: 'Buton metni', cardContact: 'İletişim', cardPrice: 'Fiyat veya teklif', cardLogo: 'Logo', cardLogoChange: 'Logoyu değiştir', cardLogoRemove: 'Logoyu kaldır', cardColor: 'Renk',
  music: 'Müzik', musicKeep: 'Mevcut müziği koru', musicNone: 'Müzik yok', moodEmotional: 'Sıcak', moodEpic: 'Epik', moodTech: 'Modern',
  order: 'Sahne sırası', orderHint: 'Bir sahneyi sürükle veya okları kullan. Sahne çıkarmak isteğe bağlı.', up: 'Yukarı', down: 'Aşağı', remove: 'Çıkar', restore: 'Geri koy', shotN: 'Sahne {n}',
  voiceLocked: 'Seslendirme olduğu gibi kalır: söylediğini değiştirmek yeni kayıt gerektirir.', presenterLocked: 'Yapay zekâ sunucusu aynı konuşmayı korur.',
  apply: 'Değişiklikleri uygula', applying: 'Birleştiriliyor…', nothing: 'Önce bir şey değiştir.',
  versions: 'Sürümler', original: 'Orijinal', versionN: 'Sürüm {n}', rendering: 'Birleştiriliyor (yaklaşık 1–2 dk)…', failed: 'Bu olmadı. Hiçbir ücret alınmadı.', download: 'İndir', inLibrary: 'Her sürüm Videolarım’da da kalır.',
  share: 'Onaya gönder', shareLead: 'Müşterine özel bir bağlantı gönder. Reklamı izler, Onayla veya Değişiklik iste’ye dokunur. Giriş gerekmez.', brand: 'Marka adın (müşteri görür)', pageLang: 'Sayfa dili', video: 'Video', create: 'Özel bağlantı oluştur', copy: 'Bağlantıyı kopyala', copied: 'Kopyalandı', linkNote: 'Bu bağlantıya sahip herkes reklamı görebilir. {days} gün sonra sona erer. Şimdi kaydet: yalnızca bir kez gösterilir.',
  approvals: 'Müşteri onayları', stPending: 'Müşteri bekleniyor', stApproved: 'Onaylandı', stChanges: 'Değişiklik istendi', stRevoked: 'Bağlantı kapatıldı', revoke: 'Bağlantıyı kapat', clientSaid: 'Müşteri yorumu', noApprovals: 'Henüz paylaşılan bağlantı yok.',
  formats: 'Tüm formatlar', formatsLead: 'Aynı reklam dikey, portre ve kare olarak, aynı kliplerden. Yazı ve kapanış kartı sığacak şekilde yerleşir; efekt sahneleri sert kırpma yerine yumuşak arka plan alır.', formatsBtn: '9:16 + 4:5 + 1:1 al', formatsBusy: 'Formatlar birleştiriliyor…',
  errGeneric: 'Bir şeyler ters gitti. Lütfen tekrar dene.', errNotReady: 'Bu özellik açılıyor. Birazdan tekrar dene.', errBusy: 'Başka sürümler hâlâ birleştiriliyor. Biri bitene kadar bekle.', errMax: 'Bu reklam sürüm sınırına ulaştı.', errVoice: 'O sahne olmadan seslendirme sığmıyor. Bir sahneyi geri koy.', errBrand: 'Sadece bir ad yaz (e-posta, telefon veya bağlantı yok).',
  pTitle: 'Onayınız için reklam', pFrom: '{brand} tarafından', pApprove: 'Onayla', pChanges: 'Değişiklik iste', pComment: 'Ne değişmeli?', pSend: 'Gönder', pApproved: 'Onaylandı. Teşekkürler!', pSent: 'Teşekkürler. Yorumların gönderildi.', pAlready: 'Bu reklamın zaten bir yanıtı var.', pInvalid: 'Bu bağlantı geçersiz veya süresi dolmuş.', pCommentRequired: 'Neyin değişmesi gerektiğini yaz.', pPowered: 'Özel inceleme bağlantısı',
}

const RU: AdsV2PosEntregaCopy = {
  title: 'После доставки', lead: 'Редактируйте, согласуйте и экспортируйте из уже готовых клипов. Ничего не генерируется заново.', free: 'Пока бесплатно: без кредитов.',
  tabEdit: 'Редактировать', tabShare: 'Отправить на согласование', tabFormats: 'Получить 9:16 + 4:5 + 1:1',
  phrases: 'Надписи на экране', phraseN: 'Надпись {n}',
  card: 'Финальная карточка', cardKeep: 'Оставить текущую карточку', cardRedraw: 'Переделать карточку', cardTitle: 'Заголовок', cardCta: 'Текст кнопки', cardContact: 'Контакт', cardPrice: 'Цена или предложение', cardLogo: 'Логотип', cardLogoChange: 'Сменить логотип', cardLogoRemove: 'Убрать логотип', cardColor: 'Цвет',
  music: 'Музыка', musicKeep: 'Оставить текущую музыку', musicNone: 'Без музыки', moodEmotional: 'Тёплая', moodEpic: 'Эпичная', moodTech: 'Современная',
  order: 'Порядок кадров', orderHint: 'Перетащите кадр или используйте стрелки. Убирать кадр не обязательно.', up: 'Выше', down: 'Ниже', remove: 'Убрать', restore: 'Вернуть', shotN: 'Кадр {n}',
  voiceLocked: 'Озвучка остаётся как есть: чтобы изменить текст, нужна новая запись.', presenterLocked: 'ИИ-ведущий говорит тот же текст.',
  apply: 'Применить изменения', applying: 'Собираем…', nothing: 'Сначала что-нибудь измените.',
  versions: 'Версии', original: 'Оригинал', versionN: 'Версия {n}', rendering: 'Собираем (примерно 1–2 мин)…', failed: 'Эта версия не получилась. Ничего не списано.', download: 'Скачать', inLibrary: 'Каждая версия остаётся и в «Моих видео».',
  share: 'Отправить на согласование', shareLead: 'Отправьте клиенту приватную ссылку. Он посмотрит рекламу и нажмёт «Одобрить» или «Нужны правки». Без входа.', brand: 'Название вашего бренда (видит клиент)', pageLang: 'Язык страницы', video: 'Видео', create: 'Создать приватную ссылку', copy: 'Копировать ссылку', copied: 'Скопировано', linkNote: 'Любой, у кого есть ссылка, увидит эту рекламу. Срок — {days} дней. Сохраните её сейчас: она показывается один раз.',
  approvals: 'Согласования клиентов', stPending: 'Ждём клиента', stApproved: 'Одобрено', stChanges: 'Нужны правки', stRevoked: 'Ссылка отключена', revoke: 'Отключить ссылку', clientSaid: 'Комментарий клиента', noApprovals: 'Ссылок пока нет.',
  formats: 'Все форматы', formatsLead: 'Та же реклама в вертикальном, портретном и квадратном формате из тех же клипов. Текст и карточка подстраиваются; кадры с эффектом получают мягкий фон вместо жёсткой обрезки.', formatsBtn: 'Получить 9:16 + 4:5 + 1:1', formatsBusy: 'Собираем форматы…',
  errGeneric: 'Что-то пошло не так. Попробуйте ещё раз.', errNotReady: 'Функция включается. Попробуйте чуть позже.', errBusy: 'Другие версии ещё собираются. Дождитесь окончания одной.', errMax: 'У этой рекламы достигнут лимит версий.', errVoice: 'Без этого кадра озвучка не помещается. Верните кадр.', errBrand: 'Напишите только название (без почты, телефона и ссылок).',
  pTitle: 'Реклама на согласование', pFrom: 'От {brand}', pApprove: 'Одобрить', pChanges: 'Нужны правки', pComment: 'Что нужно изменить?', pSend: 'Отправить', pApproved: 'Одобрено. Спасибо!', pSent: 'Спасибо. Ваши комментарии отправлены.', pAlready: 'По этой рекламе уже есть ответ.', pInvalid: 'Ссылка недействительна или устарела.', pCommentRequired: 'Напишите, что нужно изменить.', pPowered: 'Приватная ссылка для согласования',
}

const UK: AdsV2PosEntregaCopy = {
  title: 'Після доставки', lead: 'Редагуйте, погоджуйте й експортуйте з уже готових кліпів. Нічого не генерується заново.', free: 'Поки безкоштовно: без кредитів.',
  tabEdit: 'Редагувати', tabShare: 'Надіслати на погодження', tabFormats: 'Отримати 9:16 + 4:5 + 1:1',
  phrases: 'Написи на екрані', phraseN: 'Напис {n}',
  card: 'Фінальна картка', cardKeep: 'Залишити поточну картку', cardRedraw: 'Переробити картку', cardTitle: 'Заголовок', cardCta: 'Текст кнопки', cardContact: 'Контакт', cardPrice: 'Ціна або пропозиція', cardLogo: 'Логотип', cardLogoChange: 'Змінити логотип', cardLogoRemove: 'Прибрати логотип', cardColor: 'Колір',
  music: 'Музика', musicKeep: 'Залишити поточну музику', musicNone: 'Без музики', moodEmotional: 'Тепла', moodEpic: 'Епічна', moodTech: 'Сучасна',
  order: 'Порядок кадрів', orderHint: 'Перетягніть кадр або скористайтеся стрілками. Прибирати кадр не обовʼязково.', up: 'Вище', down: 'Нижче', remove: 'Прибрати', restore: 'Повернути', shotN: 'Кадр {n}',
  voiceLocked: 'Озвучення лишається як є: щоб змінити текст, потрібен новий запис.', presenterLocked: 'ШІ-ведучий говорить той самий текст.',
  apply: 'Застосувати зміни', applying: 'Збираємо…', nothing: 'Спершу щось змініть.',
  versions: 'Версії', original: 'Оригінал', versionN: 'Версія {n}', rendering: 'Збираємо (приблизно 1–2 хв)…', failed: 'Ця версія не вдалася. Нічого не списано.', download: 'Завантажити', inLibrary: 'Кожна версія лишається й у «Моїх відео».',
  share: 'Надіслати на погодження', shareLead: 'Надішліть клієнту приватне посилання. Він перегляне рекламу й натисне «Погодити» або «Потрібні правки». Без входу.', brand: 'Назва вашого бренду (бачить клієнт)', pageLang: 'Мова сторінки', video: 'Відео', create: 'Створити приватне посилання', copy: 'Копіювати посилання', copied: 'Скопійовано', linkNote: 'Будь-хто з цим посиланням побачить рекламу. Діє {days} днів. Збережіть його зараз: воно показується лише раз.',
  approvals: 'Погодження клієнтів', stPending: 'Чекаємо клієнта', stApproved: 'Погоджено', stChanges: 'Потрібні правки', stRevoked: 'Посилання вимкнено', revoke: 'Вимкнути посилання', clientSaid: 'Коментар клієнта', noApprovals: 'Посилань ще немає.',
  formats: 'Усі формати', formatsLead: 'Та сама реклама у вертикальному, портретному й квадратному форматі з тих самих кліпів. Текст і картка підлаштовуються; кадри з ефектом мають мʼякий фон замість жорсткого обрізання.', formatsBtn: 'Отримати 9:16 + 4:5 + 1:1', formatsBusy: 'Збираємо формати…',
  errGeneric: 'Щось пішло не так. Спробуйте ще раз.', errNotReady: 'Функція вмикається. Спробуйте трохи згодом.', errBusy: 'Інші версії ще збираються. Зачекайте, поки одна завершиться.', errMax: 'Ця реклама досягла ліміту версій.', errVoice: 'Без цього кадру озвучення не вміщається. Поверніть кадр.', errBrand: 'Напишіть лише назву (без пошти, телефону й посилань).',
  pTitle: 'Реклама на погодження', pFrom: 'Від {brand}', pApprove: 'Погодити', pChanges: 'Потрібні правки', pComment: 'Що треба змінити?', pSend: 'Надіслати', pApproved: 'Погоджено. Дякуємо!', pSent: 'Дякуємо. Ваші коментарі надіслано.', pAlready: 'На цю рекламу вже є відповідь.', pInvalid: 'Посилання недійсне або застаріло.', pCommentRequired: 'Напишіть, що треба змінити.', pPowered: 'Приватне посилання для погодження',
}

const AR: AdsV2PosEntregaCopy = {
  title: 'بعد التسليم', lead: 'عدّل واطلب الموافقة وصدّر باستخدام المقاطع التي لديك. لا يُنشأ أي شيء من جديد.', free: 'مجاني حاليًا: بدون رصيد.',
  tabEdit: 'تعديل', tabShare: 'إرسال للموافقة', tabFormats: 'احصل على 9:16 + 4:5 + 1:1',
  phrases: 'العبارات على الشاشة', phraseN: 'العبارة {n}',
  card: 'البطاقة الختامية', cardKeep: 'الإبقاء على البطاقة الختامية الحالية', cardRedraw: 'إعادة تصميم البطاقة الختامية', cardTitle: 'العنوان', cardCta: 'نص الزر', cardContact: 'التواصل', cardPrice: 'السعر أو العرض', cardLogo: 'الشعار', cardLogoChange: 'تغيير الشعار', cardLogoRemove: 'إزالة الشعار', cardColor: 'اللون',
  music: 'الموسيقى', musicKeep: 'الإبقاء على الموسيقى الحالية', musicNone: 'بدون موسيقى', moodEmotional: 'دافئة', moodEpic: 'ملحمية', moodTech: 'عصرية',
  order: 'ترتيب اللقطات', orderHint: 'اسحب لقطة أو استخدم الأسهم. حذف لقطة اختياري.', up: 'لأعلى', down: 'لأسفل', remove: 'حذف', restore: 'إرجاع', shotN: 'اللقطة {n}',
  voiceLocked: 'التعليق الصوتي يبقى كما هو: تغيير ما يقوله يحتاج تسجيلًا جديدًا.', presenterLocked: 'المقدّم بالذكاء الاصطناعي يحتفظ بالكلام نفسه.',
  apply: 'تطبيق التغييرات', applying: 'جارٍ التجميع…', nothing: 'غيّر شيئًا أولًا.',
  versions: 'النسخ', original: 'الأصلية', versionN: 'النسخة {n}', rendering: 'جارٍ التجميع (نحو 1–2 دقيقة)…', failed: 'لم تنجح هذه النسخة. لم يُخصم شيء.', download: 'تنزيل', inLibrary: 'كل نسخة تبقى أيضًا في فيديوهاتي.',
  share: 'إرسال للموافقة', shareLead: 'أرسل لعميلك رابطًا خاصًا. يشاهد الإعلان ويضغط موافقة أو طلب تعديلات. بدون تسجيل دخول.', brand: 'اسم علامتك التجارية (يراه العميل)', pageLang: 'لغة الصفحة', video: 'الفيديو', create: 'إنشاء رابط خاص', copy: 'نسخ الرابط', copied: 'تم النسخ', linkNote: 'أي شخص لديه هذا الرابط يمكنه مشاهدة الإعلان. ينتهي بعد {days} يومًا. احفظه الآن: يظهر مرة واحدة فقط.',
  approvals: 'موافقات العملاء', stPending: 'بانتظار العميل', stApproved: 'تمت الموافقة', stChanges: 'طُلبت تعديلات', stRevoked: 'تم إيقاف الرابط', revoke: 'إيقاف الرابط', clientSaid: 'تعليق العميل', noApprovals: 'لم تتم مشاركة أي رابط بعد.',
  formats: 'كل المقاسات', formatsLead: 'الإعلان نفسه بمقاس عمودي وطولي ومربع من المقاطع نفسها. يتوافق النص والبطاقة الختامية مع المقاس؛ ولقطات المؤثرات تحصل على خلفية ناعمة بدل القص الحاد.', formatsBtn: 'احصل على 9:16 + 4:5 + 1:1', formatsBusy: 'جارٍ تجميع المقاسات…',
  errGeneric: 'حدث خطأ ما. حاول مرة أخرى.', errNotReady: 'يجري تفعيل هذه الميزة. حاول بعد قليل.', errBusy: 'نسخ أخرى ما زالت قيد التجميع. انتظر حتى تنتهي إحداها.', errMax: 'وصل هذا الإعلان إلى حد النسخ.', errVoice: 'بدون هذه اللقطة لم يعد التعليق الصوتي يتسع. أرجِع لقطة.', errBrand: 'اكتب اسمًا فقط (بدون بريد أو هاتف أو رابط).',
  pTitle: 'إعلان بانتظار موافقتك', pFrom: 'من {brand}', pApprove: 'موافقة', pChanges: 'طلب تعديلات', pComment: 'ما الذي يجب تغييره؟', pSend: 'إرسال', pApproved: 'تمت الموافقة. شكرًا!', pSent: 'شكرًا. تم إرسال ملاحظاتك.', pAlready: 'لهذا الإعلان رد بالفعل.', pInvalid: 'هذا الرابط غير صالح أو منتهي الصلاحية.', pCommentRequired: 'اكتب ما يجب تغييره.', pPowered: 'رابط مراجعة خاص',
}

const UR: AdsV2PosEntregaCopy = {
  title: 'ڈیلیوری کے بعد', lead: 'جو کلپس آپ کے پاس ہیں انہی سے ایڈٹ کریں، منظوری لیں اور ایکسپورٹ کریں۔ کچھ بھی دوبارہ نہیں بنتا۔', free: 'فی الحال مفت: کوئی کریڈٹ نہیں۔',
  tabEdit: 'ایڈٹ', tabShare: 'منظوری کے لیے بھیجیں', tabFormats: '9:16 + 4:5 + 1:1 حاصل کریں',
  phrases: 'اسکرین پر جملے', phraseN: 'جملہ {n}',
  card: 'آخری کارڈ', cardKeep: 'موجودہ آخری کارڈ رکھیں', cardRedraw: 'آخری کارڈ دوبارہ بنائیں', cardTitle: 'عنوان', cardCta: 'بٹن کا متن', cardContact: 'رابطہ', cardPrice: 'قیمت یا آفر', cardLogo: 'لوگو', cardLogoChange: 'لوگو بدلیں', cardLogoRemove: 'لوگو ہٹائیں', cardColor: 'رنگ',
  music: 'موسیقی', musicKeep: 'موجودہ موسیقی رکھیں', musicNone: 'موسیقی نہیں', moodEmotional: 'گرم جوش', moodEpic: 'شاندار', moodTech: 'جدید',
  order: 'شاٹس کی ترتیب', orderHint: 'شاٹ کو کھینچیں یا تیر استعمال کریں۔ شاٹ ہٹانا اختیاری ہے۔', up: 'اوپر', down: 'نیچے', remove: 'ہٹائیں', restore: 'واپس رکھیں', shotN: 'شاٹ {n}',
  voiceLocked: 'وائس اوور ویسا ہی رہتا ہے: اس کی بات بدلنے کے لیے نئی ریکارڈنگ چاہیے۔', presenterLocked: 'AI پریزینٹر وہی بات کہتا ہے۔',
  apply: 'تبدیلیاں لاگو کریں', applying: 'جوڑا جا رہا ہے…', nothing: 'پہلے کچھ بدلیں۔',
  versions: 'ورژن', original: 'اصل', versionN: 'ورژن {n}', rendering: 'جوڑا جا رہا ہے (تقریباً 1–2 منٹ)…', failed: 'یہ ورژن نہیں بن سکا۔ کچھ چارج نہیں ہوا۔', download: 'ڈاؤن لوڈ', inLibrary: 'ہر ورژن میری ویڈیوز میں بھی رہتا ہے۔',
  share: 'منظوری کے لیے بھیجیں', shareLead: 'اپنے کلائنٹ کو نجی لنک بھیجیں۔ وہ اشتہار دیکھ کر منظور کریں یا تبدیلی مانگیں دبائے گا۔ لاگ اِن کی ضرورت نہیں۔', brand: 'آپ کے برانڈ کا نام (کلائنٹ دیکھے گا)', pageLang: 'صفحے کی زبان', video: 'ویڈیو', create: 'نجی لنک بنائیں', copy: 'لنک کاپی کریں', copied: 'کاپی ہو گیا', linkNote: 'جس کے پاس یہ لنک ہو وہ یہ اشتہار دیکھ سکتا ہے۔ {days} دن میں ختم ہو جائے گا۔ ابھی محفوظ کریں: یہ صرف ایک بار دکھتا ہے۔',
  approvals: 'کلائنٹ کی منظوریاں', stPending: 'کلائنٹ کا انتظار', stApproved: 'منظور', stChanges: 'تبدیلی مانگی گئی', stRevoked: 'لنک بند', revoke: 'لنک بند کریں', clientSaid: 'کلائنٹ کا تبصرہ', noApprovals: 'ابھی کوئی لنک شیئر نہیں ہوا۔',
  formats: 'تمام فارمیٹ', formatsLead: 'وہی اشتہار عمودی، پورٹریٹ اور مربع میں، انہی کلپس سے۔ متن اور آخری کارڈ فٹ ہو جاتے ہیں؛ ایفیکٹ والے شاٹس کو سخت کٹ کے بجائے نرم پس منظر ملتا ہے۔', formatsBtn: '9:16 + 4:5 + 1:1 حاصل کریں', formatsBusy: 'فارمیٹ جوڑے جا رہے ہیں…',
  errGeneric: 'کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔', errNotReady: 'یہ فیچر آن ہو رہا ہے۔ تھوڑی دیر بعد کوشش کریں۔', errBusy: 'دوسرے ورژن ابھی جوڑے جا رہے ہیں۔ ایک کے ختم ہونے کا انتظار کریں۔', errMax: 'یہ اشتہار ورژن کی حد تک پہنچ گیا۔', errVoice: 'اس شاٹ کے بغیر وائس اوور فٹ نہیں ہوتا۔ ایک شاٹ واپس رکھیں۔', errBrand: 'صرف نام لکھیں (ای میل، فون یا لنک نہیں)۔',
  pTitle: 'آپ کی منظوری کے لیے اشتہار', pFrom: '{brand} کی طرف سے', pApprove: 'منظور کریں', pChanges: 'تبدیلی مانگیں', pComment: 'کیا بدلنا چاہیے؟', pSend: 'بھیجیں', pApproved: 'منظور ہو گیا۔ شکریہ!', pSent: 'شکریہ۔ آپ کے تبصرے بھیج دیے گئے۔', pAlready: 'اس اشتہار کا جواب پہلے ہی آ چکا ہے۔', pInvalid: 'یہ لنک درست نہیں یا ختم ہو چکا ہے۔', pCommentRequired: 'لکھیں کہ کیا بدلنا چاہیے۔', pPowered: 'نجی جائزہ لنک',
}

const HI: AdsV2PosEntregaCopy = {
  title: 'डिलीवरी के बाद', lead: 'जो क्लिप आपके पास हैं उन्हीं से एडिट करें, मंज़ूरी लें और एक्सपोर्ट करें। कुछ भी दोबारा जनरेट नहीं होता।', free: 'अभी मुफ़्त: कोई क्रेडिट नहीं।',
  tabEdit: 'एडिट', tabShare: 'मंज़ूरी के लिए भेजें', tabFormats: '9:16 + 4:5 + 1:1 पाएँ',
  phrases: 'स्क्रीन पर वाक्य', phraseN: 'वाक्य {n}',
  card: 'आख़िरी कार्ड', cardKeep: 'मौजूदा आख़िरी कार्ड रखें', cardRedraw: 'आख़िरी कार्ड फिर से बनाएँ', cardTitle: 'शीर्षक', cardCta: 'बटन का टेक्स्ट', cardContact: 'संपर्क', cardPrice: 'कीमत या ऑफ़र', cardLogo: 'लोगो', cardLogoChange: 'लोगो बदलें', cardLogoRemove: 'लोगो हटाएँ', cardColor: 'रंग',
  music: 'संगीत', musicKeep: 'मौजूदा संगीत रखें', musicNone: 'कोई संगीत नहीं', moodEmotional: 'गर्मजोशी', moodEpic: 'भव्य', moodTech: 'आधुनिक',
  order: 'शॉट का क्रम', orderHint: 'शॉट खींचें या तीर इस्तेमाल करें। शॉट हटाना वैकल्पिक है।', up: 'ऊपर', down: 'नीचे', remove: 'हटाएँ', restore: 'वापस रखें', shotN: 'शॉट {n}',
  voiceLocked: 'वॉइस-ओवर वैसा ही रहता है: उसकी बात बदलने के लिए नई रिकॉर्डिंग चाहिए।', presenterLocked: 'AI प्रेज़ेंटर वही बात कहता है।',
  apply: 'बदलाव लागू करें', applying: 'जोड़ा जा रहा है…', nothing: 'पहले कुछ बदलें।',
  versions: 'वर्ज़न', original: 'ओरिजिनल', versionN: 'वर्ज़न {n}', rendering: 'जोड़ा जा रहा है (लगभग 1–2 मिनट)…', failed: 'यह वर्ज़न नहीं बना। कुछ चार्ज नहीं हुआ।', download: 'डाउनलोड', inLibrary: 'हर वर्ज़न My Videos में भी रहता है।',
  share: 'मंज़ूरी के लिए भेजें', shareLead: 'अपने क्लाइंट को निजी लिंक भेजें। वे विज्ञापन देखकर मंज़ूर करें या बदलाव माँगें दबाएँगे। लॉग-इन की ज़रूरत नहीं।', brand: 'आपके ब्रांड का नाम (क्लाइंट देखेगा)', pageLang: 'पेज की भाषा', video: 'वीडियो', create: 'निजी लिंक बनाएँ', copy: 'लिंक कॉपी करें', copied: 'कॉपी हो गया', linkNote: 'जिसके पास यह लिंक है वह यह विज्ञापन देख सकता है। {days} दिन में ख़त्म होगा। अभी सेव करें: यह सिर्फ़ एक बार दिखता है।',
  approvals: 'क्लाइंट की मंज़ूरियाँ', stPending: 'क्लाइंट का इंतज़ार', stApproved: 'मंज़ूर', stChanges: 'बदलाव माँगे गए', stRevoked: 'लिंक बंद', revoke: 'लिंक बंद करें', clientSaid: 'क्लाइंट की टिप्पणी', noApprovals: 'अभी कोई लिंक शेयर नहीं हुआ।',
  formats: 'सभी फ़ॉर्मैट', formatsLead: 'वही विज्ञापन वर्टिकल, पोर्ट्रेट और स्क्वेयर में, उन्हीं क्लिप से। टेक्स्ट और आख़िरी कार्ड फ़िट हो जाते हैं; इफ़ेक्ट वाले शॉट को सख़्त कट की जगह नरम बैकग्राउंड मिलता है।', formatsBtn: '9:16 + 4:5 + 1:1 पाएँ', formatsBusy: 'फ़ॉर्मैट जोड़े जा रहे हैं…',
  errGeneric: 'कुछ गड़बड़ हुई। फिर से कोशिश करें।', errNotReady: 'यह फ़ीचर चालू हो रहा है। थोड़ी देर बाद कोशिश करें।', errBusy: 'दूसरे वर्ज़न अभी जोड़े जा रहे हैं। एक के पूरा होने तक रुकें।', errMax: 'यह विज्ञापन वर्ज़न की सीमा तक पहुँच गया।', errVoice: 'उस शॉट के बिना वॉइस-ओवर फ़िट नहीं होता। एक शॉट वापस रखें।', errBrand: 'सिर्फ़ नाम लिखें (ईमेल, फ़ोन या लिंक नहीं)।',
  pTitle: 'आपकी मंज़ूरी के लिए विज्ञापन', pFrom: '{brand} की ओर से', pApprove: 'मंज़ूर करें', pChanges: 'बदलाव माँगें', pComment: 'क्या बदलना चाहिए?', pSend: 'भेजें', pApproved: 'मंज़ूर हो गया। धन्यवाद!', pSent: 'धन्यवाद। आपकी टिप्पणियाँ भेज दी गईं।', pAlready: 'इस विज्ञापन का जवाब पहले ही आ चुका है।', pInvalid: 'यह लिंक मान्य नहीं है या ख़त्म हो चुका है।', pCommentRequired: 'लिखें कि क्या बदलना चाहिए।', pPowered: 'निजी रिव्यू लिंक',
}

const ID: AdsV2PosEntregaCopy = {
  title: 'Setelah pengiriman', lead: 'Edit, minta persetujuan, dan ekspor dengan klip yang sudah ada. Tidak ada yang dibuat ulang.', free: 'Gratis untuk saat ini: tanpa kredit.',
  tabEdit: 'Edit', tabShare: 'Kirim untuk persetujuan', tabFormats: 'Dapatkan 9:16 + 4:5 + 1:1',
  phrases: 'Teks di layar', phraseN: 'Teks {n}',
  card: 'Kartu penutup', cardKeep: 'Pertahankan kartu penutup saat ini', cardRedraw: 'Buat ulang kartu penutup', cardTitle: 'Judul', cardCta: 'Teks tombol', cardContact: 'Kontak', cardPrice: 'Harga atau penawaran', cardLogo: 'Logo', cardLogoChange: 'Ganti logo', cardLogoRemove: 'Hapus logo', cardColor: 'Warna',
  music: 'Musik', musicKeep: 'Pertahankan musik saat ini', musicNone: 'Tanpa musik', moodEmotional: 'Hangat', moodEpic: 'Epik', moodTech: 'Modern',
  order: 'Urutan adegan', orderHint: 'Seret adegan atau pakai panah. Menghapus adegan bersifat opsional.', up: 'Naik', down: 'Turun', remove: 'Hapus', restore: 'Kembalikan', shotN: 'Adegan {n}',
  voiceLocked: 'Sulih suara tetap seperti apa adanya: mengubah isinya butuh rekaman baru.', presenterLocked: 'Presenter AI tetap mengucapkan hal yang sama.',
  apply: 'Terapkan perubahan', applying: 'Sedang dirakit…', nothing: 'Ubah sesuatu dulu.',
  versions: 'Versi', original: 'Asli', versionN: 'Versi {n}', rendering: 'Sedang dirakit (sekitar 1–2 menit)…', failed: 'Versi ini gagal. Tidak ada biaya.', download: 'Unduh', inLibrary: 'Setiap versi juga tersimpan di Video Saya.',
  share: 'Kirim untuk persetujuan', shareLead: 'Kirim tautan pribadi ke klien. Mereka menonton iklan lalu mengetuk Setujui atau Minta perubahan. Tanpa login.', brand: 'Nama merek Anda (dilihat klien)', pageLang: 'Bahasa halaman', video: 'Video', create: 'Buat tautan pribadi', copy: 'Salin tautan', copied: 'Disalin', linkNote: 'Siapa pun yang punya tautan ini bisa melihat iklan ini. Berlaku {days} hari. Simpan sekarang: hanya ditampilkan sekali.',
  approvals: 'Persetujuan klien', stPending: 'Menunggu klien', stApproved: 'Disetujui', stChanges: 'Minta perubahan', stRevoked: 'Tautan dimatikan', revoke: 'Matikan tautan', clientSaid: 'Komentar klien', noApprovals: 'Belum ada tautan yang dibagikan.',
  formats: 'Semua format', formatsLead: 'Iklan yang sama dalam vertikal, potret, dan persegi, dari klip yang sama. Teks dan kartu penutup menyesuaikan; adegan efek mendapat latar lembut, bukan potongan kasar.', formatsBtn: 'Dapatkan 9:16 + 4:5 + 1:1', formatsBusy: 'Merakit format…',
  errGeneric: 'Ada yang salah. Coba lagi.', errNotReady: 'Fitur ini sedang diaktifkan. Coba lagi sebentar lagi.', errBusy: 'Versi lain masih dirakit. Tunggu salah satunya selesai.', errMax: 'Iklan ini mencapai batas versi.', errVoice: 'Tanpa adegan itu sulih suara tidak muat. Kembalikan satu adegan.', errBrand: 'Tulis nama saja (tanpa email, telepon, atau tautan).',
  pTitle: 'Iklan untuk persetujuan Anda', pFrom: 'Dari {brand}', pApprove: 'Setujui', pChanges: 'Minta perubahan', pComment: 'Apa yang perlu diubah?', pSend: 'Kirim', pApproved: 'Disetujui. Terima kasih!', pSent: 'Terima kasih. Komentar Anda sudah terkirim.', pAlready: 'Iklan ini sudah punya jawaban.', pInvalid: 'Tautan ini tidak valid atau sudah kedaluwarsa.', pCommentRequired: 'Tulis apa yang perlu diubah.', pPowered: 'Tautan tinjauan pribadi',
}

const VI: AdsV2PosEntregaCopy = {
  title: 'Sau khi giao', lead: 'Chỉnh sửa, xin duyệt và xuất bằng các clip bạn đã có. Không tạo lại gì cả.', free: 'Hiện miễn phí: không tốn tín dụng.',
  tabEdit: 'Chỉnh sửa', tabShare: 'Gửi để duyệt', tabFormats: 'Lấy 9:16 + 4:5 + 1:1',
  phrases: 'Chữ trên màn hình', phraseN: 'Câu {n}',
  card: 'Thẻ kết', cardKeep: 'Giữ thẻ kết hiện tại', cardRedraw: 'Làm lại thẻ kết', cardTitle: 'Tiêu đề', cardCta: 'Chữ trên nút', cardContact: 'Liên hệ', cardPrice: 'Giá hoặc ưu đãi', cardLogo: 'Logo', cardLogoChange: 'Đổi logo', cardLogoRemove: 'Bỏ logo', cardColor: 'Màu',
  music: 'Nhạc', musicKeep: 'Giữ nhạc hiện tại', musicNone: 'Không nhạc', moodEmotional: 'Ấm áp', moodEpic: 'Hùng tráng', moodTech: 'Hiện đại',
  order: 'Thứ tự cảnh', orderHint: 'Kéo một cảnh hoặc dùng mũi tên. Bỏ bớt cảnh là tùy chọn.', up: 'Lên', down: 'Xuống', remove: 'Bỏ', restore: 'Đưa lại', shotN: 'Cảnh {n}',
  voiceLocked: 'Lời thuyết minh giữ nguyên: đổi nội dung cần thu âm mới.', presenterLocked: 'Người dẫn AI giữ nguyên lời nói.',
  apply: 'Áp dụng thay đổi', applying: 'Đang ghép…', nothing: 'Hãy thay đổi gì đó trước.',
  versions: 'Phiên bản', original: 'Bản gốc', versionN: 'Phiên bản {n}', rendering: 'Đang ghép (khoảng 1–2 phút)…', failed: 'Bản này không thành công. Không bị trừ gì.', download: 'Tải xuống', inLibrary: 'Mọi phiên bản cũng nằm trong Video của tôi.',
  share: 'Gửi để duyệt', shareLead: 'Gửi khách hàng một liên kết riêng. Họ xem quảng cáo rồi bấm Duyệt hoặc Yêu cầu sửa. Không cần đăng nhập.', brand: 'Tên thương hiệu của bạn (khách hàng thấy)', pageLang: 'Ngôn ngữ trang', video: 'Video', create: 'Tạo liên kết riêng', copy: 'Sao chép liên kết', copied: 'Đã sao chép', linkNote: 'Ai có liên kết này đều xem được quảng cáo. Hết hạn sau {days} ngày. Lưu ngay: liên kết chỉ hiện một lần.',
  approvals: 'Duyệt của khách hàng', stPending: 'Đang chờ khách hàng', stApproved: 'Đã duyệt', stChanges: 'Yêu cầu sửa', stRevoked: 'Đã tắt liên kết', revoke: 'Tắt liên kết', clientSaid: 'Nhận xét của khách hàng', noApprovals: 'Chưa chia sẻ liên kết nào.',
  formats: 'Mọi định dạng', formatsLead: 'Cùng quảng cáo ở dạng dọc, chân dung và vuông, từ cùng các clip. Chữ và thẻ kết tự vừa khung; cảnh hiệu ứng có nền dịu thay vì cắt cứng.', formatsBtn: 'Lấy 9:16 + 4:5 + 1:1', formatsBusy: 'Đang ghép các định dạng…',
  errGeneric: 'Đã có lỗi. Vui lòng thử lại.', errNotReady: 'Tính năng đang được bật. Thử lại sau ít phút.', errBusy: 'Các phiên bản khác vẫn đang ghép. Chờ một bản xong.', errMax: 'Quảng cáo này đã đạt giới hạn phiên bản.', errVoice: 'Bỏ cảnh đó thì lời thuyết minh không còn vừa. Hãy đưa lại một cảnh.', errBrand: 'Chỉ ghi tên (không email, số điện thoại hay liên kết).',
  pTitle: 'Quảng cáo chờ bạn duyệt', pFrom: 'Từ {brand}', pApprove: 'Duyệt', pChanges: 'Yêu cầu sửa', pComment: 'Cần thay đổi gì?', pSend: 'Gửi', pApproved: 'Đã duyệt. Cảm ơn bạn!', pSent: 'Cảm ơn. Nhận xét của bạn đã được gửi.', pAlready: 'Quảng cáo này đã có phản hồi.', pInvalid: 'Liên kết này không hợp lệ hoặc đã hết hạn.', pCommentRequired: 'Hãy ghi cần thay đổi gì.', pPowered: 'Liên kết duyệt riêng',
}

export const ADS_V2_POS_ENTREGA_COPY: Record<InterfaceLanguage, AdsV2PosEntregaCopy> = {
  en: EN, pt: PT, es: ES, fr: FR, de: DE, it: IT, nl: NL, pl: PL, tr: TR, ru: RU, uk: UK, ar: AR, ur: UR, hi: HI, id: ID, vi: VI,
}

export function adsV2PosEntregaCopy(lang: InterfaceLanguage | string | null | undefined): AdsV2PosEntregaCopy {
  const k = typeof lang === 'string' ? (lang as InterfaceLanguage) : 'en'
  return ADS_V2_POS_ENTREGA_COPY[k] ?? EN
}

/** Troca {n} {brand} {days} no texto. */
export function fillPosEntrega(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m))
}

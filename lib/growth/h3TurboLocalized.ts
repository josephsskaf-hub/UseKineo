type LocalizedH3 = {
  code: 'fr' | 'de'
  description: (credits: number) => string
  lead: (credits: number, starter: string) => string
  about: string
  cost: (credits: number, starter: string) => string
  faq: (credits: number, starter: string) => Array<{ q: string; a: string }>
  proofHeading: string
  proofLine: string
  howStart: string
}

export const H3_TURBO_LOCALIZED_UPDATED = '2026-11-08'

/** Only the two indexed languages with an existing engine translation. */
export const H3_TURBO_LOCALIZED: Partial<Record<string, LocalizedH3>> = {
  fr: {
    code: 'fr',
    description: credits => `MiniMax H3 Turbo dans Kineo : un film vertical narré avec scènes, sous-titres et musique. ${credits} crédits pour 60 secondes. Coûts et limites.`,
    lead: (credits, starter) => `Kineo anime les scènes de votre film narré avec MiniMax H3 Turbo et assemble la voix, les sous-titres et la musique dans un MP4 vertical. Un film de 60 secondes utilise ${credits} crédits, avec des abonnements à partir de ${starter} USD par mois.`,
    about: 'Le moteur principal des scènes ancrées sur une image est MiniMax H3 Max Turbo, proposé sous le nom H3 Turbo dans Kineo. Le parcours conserve Seedance 1.5 Pro comme solution de repli texte-vers-vidéo. Certaines scènes peuvent donc utiliser ce modèle de repli. H3 Max reste un autre choix dans le Studio, avec son propre coût.',
    cost: (credits, starter) => `${credits} crédits pour un film narré de 60 secondes. Starter commence à ${starter} USD par mois. Les autres créations partagent le même solde. Le test gratuit dépend du pays et porte un filigrane ; vérifiez les options et le coût dans le Studio avant de générer.`,
    faq: (credits, starter) => [
      { q: 'Quel modèle crée les scènes ?', a: 'MiniMax H3 Max Turbo anime les scènes ancrées sur une image. Seedance 1.5 Pro reste la solution de repli texte-vers-vidéo ; un film peut contenir des scènes issues de ce repli.' },
      { q: 'Combien coûte un film de 60 secondes ?', a: `${credits} crédits pour le parcours narré standard. Les abonnements commencent à ${starter} USD par mois. Le tableau détaille le coût des autres durées.` },
      { q: 'Les exemples ont-ils tous été créés avec H3 Turbo ?', a: 'Les exemples existants conservent le badge du moteur qui les a réellement créés. Un ancien film Seedance reste étiqueté Seedance.' },
      { q: 'Quelles sont les limites ?', a: 'Les visages, mains, textes et personnages peuvent varier entre les scènes et nécessiter une nouvelle tentative. Ce parcours ne garantit ni dialogue synchronisé sur les lèvres, ni reproduction exacte d’un produit, ni délai fixe, ni résultat d’audience. Vérifiez le film avant de le publier.' },
    ],
    proofHeading: 'Exemples de films Kineo existants',
    proofLine: 'Le badge de chaque film indique le moteur utilisé pour cet exemple. Ces films peuvent précéder le parcours H3 Turbo actuel.',
    howStart: 'Saisissez une idée ou collez votre texte de narration en français.',
  },
  de: {
    code: 'de',
    description: credits => `MiniMax H3 Turbo in Kineo: vertikaler Film mit Sprecherstimme, Szenen, Untertiteln und Musik. ${credits} Credits für 60 Sekunden. Kosten und Grenzen.`,
    lead: (credits, starter) => `Kineo animiert die geplanten Szenen mit MiniMax H3 Turbo und erstellt daraus eine vertikale MP4 mit Sprecherstimme, Untertiteln und Musik. Ein 60-Sekunden-Film kostet ${credits} Credits, Abonnements beginnen bei ${starter} USD pro Monat.`,
    about: 'Bildgestützte Szenen verwenden MiniMax H3 Max Turbo, in Kineo als H3 Turbo angeboten. Seedance 1.5 Pro bleibt als Text-zu-Video-Ersatz im Ablauf erhalten. Einzelne Szenen können daher mit diesem Ersatzmodell entstehen. H3 Max ist eine andere Studio-Auswahl mit eigenen Credit-Kosten.',
    cost: (credits, starter) => `${credits} Credits für einen fertig erzählten 60-Sekunden-Film. Starter beginnt bei ${starter} USD pro Monat. Andere Erstellungen nutzen dasselbe Guthaben. Der kostenlose Test hängt vom Land ab und hat ein Wasserzeichen. Prüfe Auswahl und Kosten vor der Generierung im Studio.`,
    faq: (credits, starter) => [
      { q: 'Welches Modell erzeugt die Szenen?', a: 'Bildgestützte Szenen verwenden MiniMax H3 Max Turbo. Seedance 1.5 Pro bleibt als Text-zu-Video-Ersatz erhalten. Ein Film kann Szenen aus diesem Ersatzmodell enthalten.' },
      { q: 'Was kostet ein 60-Sekunden-Film?', a: `${credits} Credits im Standardablauf mit Sprecherstimme. Abonnements beginnen bei ${starter} USD pro Monat. Die Tabelle zeigt die Kosten für weitere Längen.` },
      { q: 'Wurden alle Beispiele mit H3 Turbo erstellt?', a: 'Vorhandene Beispiele behalten das Abzeichen ihres tatsächlichen Modells. Ein älterer Seedance-Film bleibt als Seedance gekennzeichnet.' },
      { q: 'Welche Grenzen gibt es?', a: 'Gesichter, Hände, Texte und Figuren können sich zwischen Szenen verändern und einen weiteren Versuch erfordern. Dieser Ablauf garantiert keine lippensynchronen Dialoge, exakte Produktwiedergabe, feste Fertigstellungszeit oder Zuschauerergebnisse. Prüfe den fertigen Film vor der Veröffentlichung.' },
    ],
    proofHeading: 'Vorhandene Kineo-Filmbeispiele',
    proofLine: 'Das Abzeichen jedes Films nennt das Modell dieses Beispiels. Die Filme können vor dem heutigen H3-Turbo-Ablauf entstanden sein.',
    howStart: 'Gib eine Idee ein oder füge deinen deutschen Sprechertext ein.',
  },
}

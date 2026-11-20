// KINEO-PEDIDO-DE-IDIOMAS-2011 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião do conserto.
// Revisor 20/11 08:04 (NARRACAO_LE_INSTRUCAO, nota 3, DE, 1º filme, Kling 4 grátis 15 s, geração 6ac583bd): o cliente escolheu
// "I have the finished script" (chatgpt_quickstart_selected input_type=finished_script → script_mode=verbatim) e colou um PEDIDO
// em alemão. reviewRequestFidelity → looksLikeBrief devolveu false (o verbo de pedido só conhecia pt/en/es/tr), o claim saiu com
// verbatim:true e a narração leu o pedido inteiro. Aqui: o pedido em de/fr/it (e os de sempre em pt/en/es) é reconhecido, e
// roteiro de verdade nessas línguas continua roteiro.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, require: () => ({}), ...globals }); return exp }

const P = roda(rd('lib/scriptParser.ts'))
const F = roda(rd('lib/requestFidelity.ts')
  .replace("import { looksLikeBrief } from './scriptParser'", 'const looksLikeBrief = __P__.looksLikeBrief')
  .replace("import { readPastedDirectives } from './pastedDirectives'", 'const readPastedDirectives = () => ({ directives: [] })')
  .replace("import { looksLikeModelRefusal } from './modelRefusal'", 'const looksLikeModelRefusal = () => false'), { __P__: P })

// O texto REAL do cliente (videos.topic da geração 6ac583bd, 19/11 22:45 UTC).
const REAL_DE = 'Erstelle mir ein youtube short in dem die neuen Features im Vergleich zu gta 5 gezeigt werden. Erstelle dieses Video in einem aufregenden, aber informativen schema.'

console.log('== o caso real ==')
checa('real (de): looksLikeBrief = true', P.looksLikeBrief(REAL_DE) === true)
checa('real (de): em "as is" a entrada para na revisão (brief_requires_review, nada cobrado)', F.reviewRequestFidelity({ prompt: REAL_DE, scriptMode: 'verbatim', duration: 15, language: 'de' })?.reason === 'brief_requires_review')
checa('real (de): no modo IA não para (o escritor recebe o pedido)', F.reviewRequestFidelity({ prompt: REAL_DE, scriptMode: 'ai', duration: 15, language: 'de' }) === null)

console.log('== pedidos que devem ser reconhecidos ==')
const PEDIDOS = {
  de1: 'Mach mir ein Video über die Geschichte von Rom.',
  de2: 'Ich möchte ein kurzes Video über Katzen, die Klavier spielen.',
  de3: 'Erstelle ein YouTube Short über die Titanic.',
  de4: 'Generiere ein Video über den Mond.',
  fr1: 'Crée une vidéo sur les nouveautés de GTA 6 par rapport à GTA 5.',
  fr2: 'Fais-moi un short YouTube sur la Tour Eiffel.',
  fr3: 'Je veux une vidéo sur les pyramides d’Égypte.',
  fr4: 'Génère une vidéo sur les dinosaures.',
  it1: 'Fammi un video sulla storia di Roma.',
  it2: 'Crea un video sulle novità di GTA 6 rispetto a GTA 5.',
  it3: 'Voglio un video su un gatto astronauta.',
  pt: 'Crie um vídeo sobre a história do GTA 6 comparado com o GTA 5.',
  en: 'Make me a video about the new GTA 6 features compared to GTA 5.',
  es: 'Haz un video sobre las nuevas funciones de GTA 6 comparadas con GTA 5.',
  // volta 2: os confirmados pelo revisor + cortesia no início
  de5: 'Erstellen Sie ein Video über die Geschichte von Berlin.',
  de6: 'Ich hätte gerne ein Video über Delfine.',
  de7: 'Mache ein Video über den Eiffelturm.',
  de8: 'Ich will ein Video über Haie.',
  de9: 'Mach ein Short über Fußball.',
  de10: 'Bitte erstelle ein Video über die Mondlandung.',
  fr5: 'Fais une vidéo sur Napoléon.',
  fr6: 'Créer une vidéo sur les volcans.',
  fr7: 'J’aimerais une vidéo sur les chats.',
  it4: 'Fai un video sul Colosseo.',
  it5: 'Vorrei un video sulle balene.',
  it6: 'Realizza un video su Leonardo da Vinci.',
  // volta 4: anúncio de app em de/fr dá 422 como na base em en/it, e pedido de empresa que cita o próprio app é pedido
  pub_de: 'Erstelle ein Video in Sekunden – mit unserer App geht das ganz einfach. Jetzt kostenlos testen.',
  pub_fr: 'Crée une vidéo en trente secondes avec notre application. Essaie gratuitement.',
  emp_de1: 'Erstelle ein Video, das zeigt, wie man mit unserer App Geld spart.',
  emp_de2: 'Mach mir ein Video über die neuen Funktionen in unserer App.',
  emp_fr: 'Crée une vidéo qui montre comment réserver un taxi avec notre application.',
  emp_it: 'Fammi un video che mostra come usare la nostra app per prenotare un tavolo.',
}
for (const [k, t] of Object.entries(PEDIDOS)) { checa(`pedido ${k}: reconhecido`, P.looksLikeBrief(t) === true); checa(`pedido ${k}: "as is" dá 422 brief_requires_review`, F.reviewRequestFidelity({ prompt: t, scriptMode: 'verbatim', duration: 15, language: 'de' })?.reason === 'brief_requires_review') }

console.log('== roteiros de verdade que NÃO podem virar pedido ==')
const ROTEIROS = {
  de_historia: 'Im Jahr 1912 verließ die Titanic den Hafen von Southampton. Niemand an Bord ahnte, dass das Schiff nur vier Tage später im eiskalten Atlantik versinken würde. Über 1500 Menschen verloren ihr Leben.',
  de_ich_erstelle: 'Ich erstelle jeden Morgen ein neues Video für meinen Kanal. Aber an diesem Tag passierte etwas, das alles veränderte.',
  de_dialog: 'Max: "Hast du das Video gesehen?"\nLena: "Ja, ich kann es nicht glauben!"\nMax: "Wir müssen es allen zeigen."',
  de_mach: 'Mach dir keine Sorgen. In diesem Video zeige ich dir, warum der Mond jedes Jahr ein Stück weiter wegdriftet.',
  de_taeglich: 'Mach jeden Tag ein Video, und in einem Jahr bist du ein anderer Mensch.',
  fr_histoire: 'En 1347, une étrange maladie arriva dans le port de Marseille. En quelques mois, la moitié de la ville avait disparu.',
  fr_dialogue: 'Voix : « Tu as vu cette vidéo ? »\nLa fraise : « Oui, c’est incroyable ! »',
  it_storia: 'Nel 79 dopo Cristo, il Vesuvio esplose. Pompei fu sepolta in poche ore, e nessuno riuscì a fuggire.',
  pt_historia: 'Era uma vez Lumi e Pipo, dois amigos muito curiosos que decidiram aprender a contar até dez em inglês.',
  en_story: 'In 1950, a plane vanished over the Atlantic. Forty-four passengers were never found.',
  // volta 2: os 17 alarmes falsos que a revisão adversarial achou no bdadebb7e (têm de seguir roteiro, como na base)
  rev1: 'Macht euch bereit für das krasseste Video des Jahres! Heute testen wir den neuen Tesla.',
  rev2: 'Macht euch bereit, denn dieses Video wird euer Leben verändern. Es geht um drei einfache Gewohnheiten.',
  rev3: 'Ich möchte dir in diesem Video zeigen, wie du mit nur zehn Euro im Monat ein Vermögen aufbaust. Klingt verrückt? Ist es nicht.',
  rev4: 'Ich will ehrlich sein: dieses Video ist anders als alle anderen. Ich habe alles verloren.',
  rev5: 'Mach dein Geld zu deinem Mitarbeiter – in diesem Video zeige ich dir, wie das funktioniert.',
  rev6: 'Macht, Gier und Verrat: dieses Video erzählt die wahre Geschichte von Al Capone.',
  rev7: 'Schreib mir in die Kommentare, welches Video du als Nächstes sehen willst! Heute geht es um die Pyramiden.',
  rev8: 'Ich möchte euch von Tom erzählen, einem Mann, der seinen Film nie beenden konnte.',
  rev9: 'Je veux te montrer dans cette vidéo comment j\'ai économisé dix mille euros en un an.',
  rev10: 'Fais-moi confiance : cette vidéo va changer ta façon de voir l\'argent.',
  rev11: 'Je veux te parler de ses rêves et du film qui a tout changé pour lui.',
  rev12: 'Réalise tes rêves : ce short va te montrer comment Elon Musk a commencé avec rien.',
  rev13: 'Faites attention à ce clip : il contient un détail que personne n\'a remarqué.',
  rev14: 'Voglio raccontarti in questo video la storia vera del Titanic. Era il 14 aprile 1912.',
  rev15: 'Fai attenzione, perché questo video potrebbe cambiarti la vita. Parliamo di risparmio.',
  rev16: 'Realizza i tuoi sogni con questo video: tre passi semplici per iniziare.',
  // volta 3: os 14 "filme na narração" e os 3 conselhos diários da revisão da volta 2, e os anúncios de app
  film1: 'Ich will einen Film drehen, der die Welt verändert. Das sagte Steven Spielberg mit zwölf Jahren.',
  film2: 'Ich möchte einen Film sehen, sagte die kleine Mia, und alle lachten.',
  film3: 'Ich brauche einen Horrorfilm für heute Abend, dachte Jonas. Was er dann fand, war schlimmer als jeder Film.',
  film4: 'Schreib einen Kurzfilm, sagte die Lehrerin. Und so begann Annas Karriere.',
  film5: 'Mach mir einen Film nicht kaputt, sagte Opa immer, wenn wir beim Fernsehen redeten.',
  film6: 'Fais-moi un film dans ta tête : tu es sur une plage, le soleil se couche.',
  film7: 'Fais un film de ta vie, et sois-en le héros. Personne ne le fera à ta place.',
  film8: 'Je veux un film où les méchants gagnent, avait dit Marc. Et ce soir-là, il l\'a eu.',
  film9: 'Je voudrais un film qui ne finit jamais, murmura la petite fille avant de s\'endormir.',
  film10: 'Fammi un film nella tua testa: sei a Roma, è il 1960, e la Vespa ti aspetta.',
  film11: 'Voglio un film che faccia piangere, disse la nonna. E così scegliemmo Nuovo Cinema Paradiso.',
  film12: 'Vorrei un film come quelli di una volta, sospirò Giuseppe davanti al cinema chiuso.',
  film13: 'Crea un film nella tua mente prima di dormire: è il segreto dei campioni.',
  film14: 'Crea un film en tu mente antes de dormir: es el secreto de los campeones.',
  dia_de_protag: 'Mach ein Video pro Tag, und in einem Jahr bist du ein anderer Mensch.',
  dia_de_taeglich: 'Mach täglich ein Video, und in einem Jahr bist du ein anderer Mensch.',
  dia_de_jeden: 'Mach jeden Tag ein Video, und in einem Jahr bist du ein anderer Mensch.',
  dia_fr_parjour: 'Fais une vidéo par jour, et dans un an ta vie aura changé.',
  dia_fr_chaque: 'Fais une vidéo chaque jour, et dans un an ta vie aura changé.',
  dia_it_algiorno: 'Fai un video al giorno, e tra un anno sarai un\'altra persona.',
  dia_it_ogni: 'Fai un video ogni giorno, e tra un anno sarai un\'altra persona.',
  fr_pub:'Créez des vidéos incroyables en un seul clic avec notre application. Essayez gratuitement dès aujourd\'hui.',
  rev17:'Vorrei che tu guardassi questo video fino alla fine, perché il finale ti sorprenderà.',
}
for (const [k, t] of Object.entries(ROTEIROS)) {
  checa(`roteiro ${k}: não é pedido`, P.looksLikeBrief(t) === false)
  checa(`roteiro ${k}: "as is" passa sem revisão`, F.reviewRequestFidelity({ prompt: t, scriptMode: 'verbatim', duration: 15, language: 'de' }) === null)
}

console.log('== o parser da fala não mudou ==')
checa('isInstructionLine continua sem os verbos de/fr/it (a linha não é tirada da fala)', P.isInstructionLine('Mach mir ein Video über Rom.') === false && P.isInstructionLine('Crie um vídeo sobre Roma.') === true)
checa('narração alemã com "Video" no meio fica inteira', /Mond jedes Jahr/.test(P.parseUserScript(ROTEIROS.de_mach).narration))

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
for (const f of falhas) console.log('  FALHA:', f)
process.exit(falhas.length ? 1 : 0)

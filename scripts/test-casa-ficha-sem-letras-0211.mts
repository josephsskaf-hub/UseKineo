// KINEO-CASA-FICHA-SEM-LETRAS-0211(b) [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião sem rede e sem custo.
// Revisão dos 20 vídeos do dia da casa (Seedance 1.5, 60 s, "Use my script as is", nota 5,4): palavra solta virando imagem, época e lugar
// errados, placar/número inventado e o Trump na cena final. 0211b: a regra vive SÓ nos escritores de cena (descritor clássico e planejador
// hollywood — que também escreve o Kling 4 pago; o Kling 4 grátis usa o descritor clássico), de UMA constante compartilhada; nenhuma
// cauda no prompt de difusão e nenhum "cenário único" forçado (roteiro de várias épocas segue a narração cena a cena).
// Em origin/main este arquivo nem carrega (lib/cinematic/cenarioDoFilme.ts não existe).
// Rodar: node --import ./scripts/alias-loader.mjs scripts/test-casa-ficha-sem-letras-0211.mts
import { readFileSync } from 'node:fs'
import { REGRAS_DO_ESCRITOR_DE_CENAS as R } from '../lib/cinematic/cenarioDoFilme'

let ok = 0, falhas = 0
const check = (nome: string, cond: boolean) => { if (cond) { ok++; console.log(`ok   ${ok + falhas} ${nome}`) } else { falhas++; console.log(`FAIL ${ok + falhas} ${nome}`) } }
const lf = (t: string) => t.replace(/\r\n/g, '\n')
const rota = lf(readFileSync(new URL('../app/api/generate-video-cinematic/route.ts', import.meta.url), 'utf8'))
const router = lf(readFileSync(new URL('../lib/hollywood/router.ts', import.meta.url), 'utf8'))
const cenaK4 = lf(readFileSync(new URL('../lib/cinematic/cenaKling4.ts', import.meta.url), 'utf8'))

// ── 1. O texto da regra (o que o escritor lê) ──
check('sentido da frase, não a palavra solta (pessoa nomeada mantém gênero/época; termo técnico não vira brinquedo)', /MEANS in the context of the whole script/.test(R) && /never a loose word taken literally/.test(R) && /keeps that person's gender, age and era/.test(R) && /never as a toy/.test(R))
check('época e lugar POR CENA, seguindo a narração (multi-época não é forçada a um cenário só)', /each scene happens in the era and place the narration is talking about AT THAT MOMENT/.test(R) && /when the narration moves to another time or place, the scene moves with it/.test(R) && !/ONE setting|whole film happens in/i.test(R))
check('objetos/arquitetura/tecnologia da época e do lugar da cena', /must exist in that scene's era and place/.test(R) && /nothing built or invented later/.test(R))
check('sem texto/letras/números/placas/placar e sem figura pública fora da narração', /never write on-screen text, letters, numbers, signs, posters, inscriptions or scoreboards/.test(R) && /never describe a recognisable real public figure \(politician, celebrity\) that the narration does not name/.test(R))

// ── 2. Os escritores leem a MESMA constante ──
check('descritor clássico (Seedance 1.5, Veo, Kling 2.5, Sora, Kling 4 grátis) importa e lê a regra', rota.includes("import { REGRAS_DO_ESCRITOR_DE_CENAS } from '@/lib/cinematic/cenarioDoFilme'") && rota.includes('- ${NO_TEXT_OBJECT_DIRECTION}\n${REGRAS_DO_ESCRITOR_DE_CENAS}\n- Output ONLY valid JSON'))
check('descritor clássico: sujeito pelo sentido; a válvula "unless the narration moves" de sempre continua', rota.includes('as MEANT in the context of the whole script') && !rota.includes('Anchor the shot on the LITERAL subject') && rota.includes('Keep one consistent setting across scenes unless the narration moves.'))
check('planejador hollywood (Kling 3, H3, H3 Max, Omni, S25, Kling 4 pago) importa e lê a regra', router.includes("import { REGRAS_DO_ESCRITOR_DE_CENAS } from '@/lib/cinematic/cenarioDoFilme'") && router.includes('People are always fictional and generic.\n${REGRAS_DO_ESCRITOR_DE_CENAS}\n'))

// ── 3. Nada no prompt de difusão ──
check('rota: sem leitura de cenário e sem cauda nos prompts finais (clássico, hollywood, Kling 4 pago)', !/lerCenarioDoFilme|comCenarioDoFilme|leituraDoCenario|Setting of the whole film/.test(rota))
check('Kling 4: adaptador de 512 intocado (sem cauda)', !/cenarioDoFilme|CASA-FICHA/.test(cenaK4))
check('planejador: o environmentSheet não é forçado a "era, lugar e povo" únicos', !/environmentSheet states that era/.test(router))
check('regra aparece uma vez em cada escritor', rota.split('${REGRAS_DO_ESCRITOR_DE_CENAS}').length === 2 && router.split('${REGRAS_DO_ESCRITOR_DE_CENAS}').length === 2)

console.log(`${falhas ? '🔴' : '🟢'} casa-ficha-sem-letras-0211: ${ok}/${ok + falhas}`)
if (falhas) process.exit(1)

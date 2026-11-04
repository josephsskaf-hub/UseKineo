// KINEO-LOGIN-QUADRO-0411 [fundador 04/11: "eu quero que o meu login volte a ser assim"; "um vídeo e três fotos"; "o motor embaixo e a barra de tempo em cima"] — guardião.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const V = createOfflineLoader()('lib/authVitrine.ts')
const S = V.VITRINE_ENTRADA
checa('1 vídeo e 3 fotos, nessa ordem', S.length === 4 && S[0].tipo === 'video' && S.slice(1).every((x) => x.tipo === 'foto'))
checa('todo arquivo existe em public/', S.every((x) => fs.existsSync('public' + x.src)))
checa('motores reais dos filmes aprovados em 16/09', S.map((x) => x.motor).join() === 'Seedance 1.5,Veo 3.1,Kling 3,Kling 2.5')
checa('o carrossel volta ao primeiro', V.proximoSlide(3, 4) === 0 && V.proximoSlide(0, 4) === 1)
checa('barra: cheia antes, enchendo no atual, vazia depois', V.estadoDaBarra(0, 1) === 'cheia' && V.estadoDaBarra(1, 1) === 'enchendo' && V.estadoDaBarra(2, 1) === 'vazia')
const P = createOfflineLoader()('lib/authProviders.ts')
checa('Apple escondido enquanto o Supabase recusa o provedor; Microsoft ligado em 04/11', P.APPLE_LOGIN_LIVE === false && P.MICROSOFT_LOGIN_LIVE === true)
for (const arq of ['app/(auth)/login/page.tsx', 'app/(auth)/signup/page.tsx']) {
  const t = fs.readFileSync(arq, 'utf8')
  checa(arq + ': quadro, Google, Apple e Microsoft', t.includes('<AuthQuadro inModal={inModal}>') && t.includes('<GoogleSignInButton') && t.includes('APPLE_LOGIN_LIVE && (') && t.includes('MICROSOFT_LOGIN_LIVE && (') && !t.includes('NEXT_PUBLIC_ENABLE_APPLE'))
}
const ms = fs.readFileSync('components/MicrosoftSignInButton.tsx', 'utf8')
checa('Microsoft usa o provedor azure com escopo de e-mail', ms.includes("provider: 'azure'") && ms.includes("scopes: 'email'"))
// KINEO-LOGIN-X-0411 — fundador 04/11: sair do login sem a seta do navegador.
const temX = (t) => t.includes('{!inModal && (') && t.includes('href="/"') && t.includes('data-auth-fechar="true"')
const fonteQuadro = fs.readFileSync('components/auth/AuthQuadro.tsx', 'utf8')
checa('a página tem um X que volta ao site', temX(fonteQuadro))
checa('mutante sem o X fica vermelho', !temX(fonteQuadro.replace('data-auth-fechar="true"', '')))
// KINEO-LOGIN-FUNDO-0411 — fundador 04/11: "ela loga nessa tela em branco, tem que ter os nossos vídeos por trás".
const quadroSrc = fs.readFileSync('components/auth/AuthQuadro.tsx', 'utf8')
const fundoNaPagina = (t) => t.includes('<AuthFundo />') && t.indexOf('if (inModal) return quadro') < t.indexOf('<AuthFundo />')
checa('o fundo aparece na página, não no modal', fundoNaPagina(quadroSrc))
checa('mutante sem o fundo fica vermelho', !fundoNaPagina(quadroSrc.replace('<AuthFundo />', '')))
checa('todo arquivo do fundo existe', V.FUNDO_ENTRADA.every((f) => fs.existsSync('public' + f.poster) && (!f.video || fs.existsSync('public' + f.video))))
checa('4 filmes em movimento e o resto em foto', V.FUNDO_ENTRADA.filter((f) => f.video).length === 4)
const fundoSrc = fs.readFileSync('components/auth/AuthFundo.tsx', 'utf8')
checa('o vídeo do fundo só entra em tela larga', fundoSrc.includes("(min-width: 768px)") && fundoSrc.includes('videos && f.video'))
// KINEO-HOME-SEM-PROMO-0411 — fundador 04/11: sem aviso de venda na primeira impressão de quem não está logado.
const home = fs.readFileSync('app/KineoLanding.tsx', 'utf8')
const faixa = fs.readFileSync('components/home/EngineNewsBar.tsx', 'utf8')
const semPromo = (h, x) => h.includes('{isSignedIn && <WelcomeOfferModal surface="home" />}') && !h.includes('<ExitIntentOffer') && x.includes('WELCOME20_SITE_OFFER_LIVE && signedIn ?')
checa('home sem aviso de oferta para quem não está logado; faixa sem desconto', semPromo(home, faixa))
checa('mutante com o aviso de volta fica vermelho', !semPromo(home.replace('{isSignedIn && <WelcomeOfferModal surface="home" />}', '<WelcomeOfferModal surface="home" />'), faixa))
const mutante = createOfflineLoader({ source: (rel, t) => (rel === 'lib/authVitrine.ts' ? t.replace("indice < atual ? 'cheia'", "indice < atual ? 'vazia'") : t) })('lib/authVitrine.ts')
checa('mutante da barra fica vermelho', mutante.estadoDaBarra(0, 1) !== 'cheia')
console.log(falhas ? falhas + ' falha(s)' : 'tudo verde')
process.exit(falhas ? 1 : 0)

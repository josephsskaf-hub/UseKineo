// Kineo landing — new Apple-dark redesign (replaces the old HomePageClient on the homepage).
// Self-contained, styles scoped under .klp so they don't leak into the rest of the app.
// Marker: KINEO-LANDING-V3-2026-06-30
import Link from 'next/link'
import NavCreditsBadge from '@/components/NavCreditsBadge'
import HeroGallery from './HeroGallery'
import StickyFreeShortCTA from '@/components/StickyFreeShortCTA'
import ExitIntentOffer from '@/components/ExitIntentOffer'
import LiveStatsBadge from '@/components/LiveStatsBadge'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import Footer from '@/components/Footer'
import HomeTopicForm from './HomeTopicForm'
import CostCalculatorLink from '@/components/CostCalculatorLink'
import LandingViewTracker from '@/components/LandingViewTracker'

type Props = {
  initialUser?: { id: string } | null
  initialEmail?: string
  initialIsPro?: boolean
}

const KLP_CSS = `
/* KINEO-HOME-POLISH-2026-07-27 — refino visual do hero. Nenhum preço, CTA,
   promessa ou copy mudou; só tipografia, espaçamento, profundidade e cor.
   Tokens novos (--r-*, --sh-*, --blue-soft) centralizam raio/sombra/glow para
   que card, plano, FAQ e botao parem de cada um inventar o proprio acabamento. */
.klp{--bg:#000;--card:#161618;--card2:#1d1d1f;--line:#26262a;--line2:#3a3a3d;--txt:#f5f5f7;--muted:#a1a1a8;--muted2:#8f8f96;--blue:#2997ff;--blue-soft:rgba(41,151,255,.16);--r-lg:22px;--r-md:18px;--sh-card:inset 0 1px 0 rgba(255,255,255,.045),0 18px 44px -30px rgba(0,0,0,.95);--sh-card-h:inset 0 1px 0 rgba(255,255,255,.07),0 26px 60px -30px rgba(0,0,0,1);--sh-cta:0 1px 0 rgba(255,255,255,.5) inset,0 10px 28px -12px rgba(255,255,255,.32);background:#000;color:#f5f5f7;font-family:var(--font-inter),'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.5;min-height:100vh}
.klp *{box-sizing:border-box;margin:0;padding:0}
.klp a{text-decoration:none;color:inherit}
.klp .wrap{max-width:1080px;margin:0 auto;padding:0 28px}
.klp .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:650;font-size:16px;letter-spacing:-.01em;padding:14px 30px;border-radius:980px;cursor:pointer;transition:transform .18s cubic-bezier(.2,.7,.3,1),background .18s ease,box-shadow .18s ease;border:1px solid transparent}
.klp .btn-w{background:var(--txt);color:#000;box-shadow:var(--sh-cta)}
.klp .btn-w:hover{background:#fff;transform:translateY(-1px);box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 14px 34px -12px rgba(255,255,255,.42)}
.klp .btn-w:active{transform:translateY(0) scale(.985);box-shadow:0 1px 0 rgba(255,255,255,.4) inset,0 6px 16px -10px rgba(255,255,255,.3)}
.klp .btn:focus-visible{outline:2px solid var(--blue);outline-offset:3px}
.klp .btn[disabled]{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
.klp .link{color:var(--blue);font-weight:600;font-size:16px;display:inline-flex;align-items:center;gap:4px}
.klp .link:hover{text-decoration:underline}
/* O gradiente antigo comecava a apagar em 35% e terminava em #a1a1a6, o que
   deixava a segunda linha do h1 visivelmente lavada. Agora fica solido ate
   58% e para em #c7c7cd — mesma sensacao, muito mais presenca. */
.klp .gtxt{background:linear-gradient(180deg,#fff 0%,#fff 58%,#c7c7cd 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.klp nav{position:sticky;top:0;z-index:50;background:rgba(0,0,0,.7);backdrop-filter:blur(20px);border-bottom:1px solid var(--line)}
.klp .nav-in{display:flex;align-items:center;justify-content:space-between;height:62px}
.klp .logo{display:flex;align-items:center;gap:9px;font-weight:700;font-size:18px;letter-spacing:-.01em}
.klp .logo .mk{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#17171a,#161618);border:1px solid rgba(41,151,255,.45);box-shadow:0 0 14px rgba(41,151,255,.4),0 0 6px rgba(41,151,255,.25);display:grid;place-items:center;font-size:14px}
.klp .nav-links{display:flex;gap:32px;font-size:14px;color:var(--muted);font-weight:500}
.klp .nav-links a:hover{color:var(--txt)}
.klp .nav-right{display:flex;align-items:center;gap:14px}
.klp .nav-toggle-wrap{display:none}
.klp .nav-toggle-input{position:absolute;inset:0;width:44px;height:44px;opacity:0;margin:0;cursor:pointer;z-index:2}
.klp .nav-toggle-btn{display:flex;flex-direction:column;gap:5px;pointer-events:none}
.klp .nav-toggle-btn .bar{display:block;width:20px;height:2px;background:var(--txt);border-radius:2px;transition:.2s}
.klp .nav-toggle-input:checked~.nav-toggle-btn .bar:nth-child(1){transform:translateY(7px) rotate(45deg)}
.klp .nav-toggle-input:checked~.nav-toggle-btn .bar:nth-child(2){opacity:0}
.klp .nav-toggle-input:checked~.nav-toggle-btn .bar:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
.klp .nav-mobile-menu{display:none}
.klp .nav-toggle-input:checked~.nav-mobile-menu{display:flex}
.klp .hero{position:relative;padding:96px 0 92px;overflow:hidden}
/* rgba(120,140,175) era um azul-acinzentado que nao existe em lugar nenhum da
   paleta — o unico tom solto do hero. Trocado pelo azul da marca, em duas
   camadas (uma quente e larga, uma fria e concentrada) para dar profundidade
   em vez de uma mancha chapada. */
.klp .hero .glow{position:absolute;width:980px;height:600px;left:50%;top:-180px;transform:translateX(-50%);background:radial-gradient(ellipse at 50% 45%,rgba(41,151,255,.16),transparent 62%),radial-gradient(ellipse at 50% 30%,rgba(255,255,255,.06),transparent 58%);pointer-events:none}
.klp .hero-center .sub{font-size:clamp(1.08rem,2.1vw,1.3rem);color:var(--muted);max-width:544px;margin:22px 0 0;line-height:1.52;letter-spacing:-.005em;text-wrap:balance}
.klp .composer{display:flex;flex-direction:column;gap:14px;margin-top:30px;background:linear-gradient(180deg,#191919 0%,#141416 100%);border:1px solid var(--line2);border-radius:var(--r-lg);padding:24px;width:100%;max-width:730px;min-height:300px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 26px 64px -30px rgba(0,0,0,1),0 0 0 1px rgba(41,151,255,.08);transition:box-shadow .22s ease,border-color .22s ease}
.klp .composer:focus-within{border-color:rgba(41,151,255,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 26px 64px -30px rgba(0,0,0,1),0 0 0 3px var(--blue-soft)}
.klp #try-kineo{scroll-margin-top:82px}
.klp .composer .ci{flex:1;width:100%;min-height:170px;resize:none;background:transparent;border:none;outline:none;color:var(--txt);font-size:17px;line-height:1.5;font-family:inherit;padding:6px 2px}
.klp .composer .ci::placeholder{color:var(--muted2)}
.klp .composer .cbtn{align-self:flex-end;white-space:nowrap;padding:14px 28px;font-size:15.5px;border-radius:13px}
.klp .composer-head{display:flex;align-items:center;justify-content:space-between;gap:14px}
.klp .composer-head label{font-size:14px;font-weight:700;color:var(--txt)}
.klp .composer-head span{font-size:12px;font-weight:700;color:var(--blue);white-space:nowrap}
.klp .topic-starters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--muted2);font-size:12px}
.klp .topic-starters>div{display:flex;gap:8px;flex-wrap:wrap}
.klp .topic-starters button{border:1px solid var(--line2);background:#111113;color:#d2d2d7;border-radius:999px;padding:7px 11px;min-height:44px;font:inherit;font-weight:650;cursor:pointer;transition:.18s}
.klp .topic-starters button:hover,.klp .topic-starters button:focus-visible{border-color:var(--blue);color:#fff;outline:none;background:rgba(41,151,255,.1)}
.klp .composer-proof{font-size:12px;line-height:1.45;color:var(--muted2);text-align:right}
.klp section{padding:112px 0}
/* Sticky nav is 62px — keep in-page anchor targets from landing underneath it. */
.klp section[id],.klp [id^="try-"]{scroll-margin-top:78px}
.klp .sec-h{text-align:center;max-width:660px;margin:0 auto 60px}
.klp .sec-h h2{font-size:clamp(2.05rem,4.4vw,3.05rem);font-weight:620;letter-spacing:-.03em;line-height:1.06;text-wrap:balance}
.klp .sec-h p{margin-top:18px;color:var(--muted);font-size:1.12rem;line-height:1.55;text-wrap:balance}
.klp .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.klp .step{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:32px;box-shadow:var(--sh-card);transition:transform .2s cubic-bezier(.2,.7,.3,1),border-color .2s ease,box-shadow .2s ease}
.klp .step:hover{border-color:var(--line2);transform:translateY(-3px);box-shadow:var(--sh-card-h)}
/* "Step 1/2/3" era texto cinza solto de 14px, do mesmo peso do corpo — nao
   marcava sequencia nenhuma. Virou um selo numerado, que e o que a palavra
   "step" promete. Mesmo texto. */
.klp .step .n{display:inline-flex;align-items:center;height:26px;padding:0 11px;border-radius:999px;font-size:11px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;color:var(--blue);background:rgba(41,151,255,.11);border:1px solid rgba(41,151,255,.26)}
.klp .step h3{margin-top:18px;font-size:1.32rem;font-weight:650;letter-spacing:-.022em;line-height:1.2}
.klp .step p{margin-top:11px;color:var(--muted);font-size:.99rem;line-height:1.62}
.klp .vcard{aspect-ratio:9/16;border-radius:var(--r-md);background:radial-gradient(120% 80% at 50% 0%,#26262a,#0c0c0e 72%);border:1px solid var(--line);position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:15px;box-shadow:var(--sh-card);transition:transform .22s cubic-bezier(.2,.7,.3,1),border-color .22s ease,box-shadow .22s ease}
.klp .vcard:hover,.klp .vcard:focus-visible,.klp .vcard:focus-within{border-color:rgba(41,151,255,.4);transform:translateY(-5px);box-shadow:var(--sh-card-h),0 0 0 1px rgba(41,151,255,.18)}
/* O texto do card fica sobre video em movimento — sem esta camada o titulo
   some assim que passa um frame claro. */
.klp .vcard::after{content:'';position:absolute;left:0;right:0;bottom:0;height:58%;background:linear-gradient(180deg,transparent,rgba(0,0,0,.72));pointer-events:none;z-index:1}
.klp .vcard .vt{position:relative;z-index:2}
.klp .vcard .vt{font-size:14px;font-weight:700;line-height:1.25;color:#fff}
.klp .cmp{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);overflow-x:auto;position:relative;box-shadow:var(--sh-card)}
.klp .cmp table{width:100%;min-width:560px;border-collapse:collapse;font-size:14.5px}
.klp .cmp th,.klp .cmp td{padding:15px 18px;text-align:center;border-bottom:1px solid rgba(255,255,255,.055)}
.klp .cmp th:first-child,.klp .cmp td:first-child{text-align:left;color:var(--muted);font-weight:400;position:sticky;left:0;background:var(--card2);z-index:1}
.klp .cmp thead th{font-weight:650;color:var(--muted);font-size:13px;letter-spacing:.02em;padding-top:18px;padding-bottom:18px}
/* A coluna "Kineo" agora e uma coluna de verdade — faixa azul continua, com
   as pontas arredondadas no topo e na base, em vez de um cinza quase invisivel
   em rgba(255,255,255,.04) que nao dizia qual coluna importa. */
.klp .cmp thead th.us,.klp .cmp td.us{background:linear-gradient(180deg,rgba(41,151,255,.13),rgba(41,151,255,.07));box-shadow:inset 1px 0 0 rgba(41,151,255,.22),inset -1px 0 0 rgba(41,151,255,.22)}
.klp .cmp thead th.us{color:var(--txt);border-top-left-radius:12px;border-top-right-radius:12px;box-shadow:inset 1px 1px 0 rgba(41,151,255,.3),inset -1px 0 0 rgba(41,151,255,.3)}
.klp .cmp tbody tr:last-child td.us{border-bottom-left-radius:12px;border-bottom-right-radius:12px;box-shadow:inset 1px 0 0 rgba(41,151,255,.22),inset -1px -1px 0 rgba(41,151,255,.22)}
.klp .cmp td.us{color:var(--txt);font-weight:700}
.klp .cmp tbody tr:hover td{background:rgba(255,255,255,.018)}
.klp .cmp tbody tr:hover td:first-child{background:#212124}
.klp .cmp .no{color:var(--muted2)}
.klp .cmp tr:last-child td{border-bottom:none}
.klp .cmp-hint{display:none}
.klp .price{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:stretch}
.klp .plan{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:32px 28px;display:flex;flex-direction:column;box-shadow:var(--sh-card);transition:transform .2s cubic-bezier(.2,.7,.3,1),border-color .2s ease,box-shadow .2s ease}
.klp .plan:hover,.klp .plan:focus-visible,.klp .plan:focus-within{transform:translateY(-4px);border-color:var(--blue);box-shadow:0 0 0 1.5px var(--blue),0 18px 44px -18px rgba(41,151,255,.32)}
.klp .plan.pop{background:linear-gradient(180deg,#212124 0%,#1a1a1d 100%);border-color:#4d4d50;box-shadow:var(--sh-card-h)}
.klp .plan.pop:hover,.klp .plan.pop:focus-visible,.klp .plan.pop:focus-within{border-color:var(--blue);box-shadow:0 0 0 1.5px var(--blue),0 12px 34px rgba(41,151,255,.16)}
.klp .plan{position:relative}
.klp .plan .pt{font-size:11px;font-weight:750;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2)}
/* O card "Most popular" so tinha um cinza levemente mais claro para se
   distinguir — na pratica, nada. O proprio rotulo que ja estava la vira uma
   fita flutuante na borda de cima, que e como um plano recomendado se anuncia.
   Mesmo texto, so reposicionado. */
.klp .plan.pop{padding-top:40px}
.klp .plan.pop .pt{position:absolute;top:-12px;left:50%;transform:translateX(-50%);white-space:nowrap;color:#fff;background:var(--blue);border-radius:999px;padding:6px 15px;font-size:10.5px;letter-spacing:.1em;box-shadow:0 6px 20px -6px rgba(41,151,255,.85)}
.klp .plan .nm{margin-top:12px;font-size:1.34rem;font-weight:650;letter-spacing:-.018em}
.klp .plan.pop .nm{margin-top:0}
.klp .plan .pr{margin-top:8px;font-size:2.75rem;font-weight:720;letter-spacing:-.035em;line-height:1}
.klp .plan .pr span{font-size:1rem;font-weight:500;color:var(--muted);letter-spacing:0}
.klp .plan .pr-then{margin-top:7px;font-size:.85rem;font-weight:550;color:var(--muted2)}
/* Linha fina separando "quanto custa" de "o que vem" — antes as duas
   informacoes eram um bloco unico e a lista comecava sem respiro. */
.klp .plan ul{list-style:none;margin:24px 0 26px;padding-top:22px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:13px}
.klp .plan li{display:flex;gap:11px;font-size:14.5px;line-height:1.5;color:var(--muted)}
.klp .plan li b{color:var(--txt);font-weight:650}
.klp .plan li .ck{color:var(--blue);flex:none;display:grid;place-items:center;width:19px;height:19px;margin-top:1px;border-radius:50%;background:rgba(41,151,255,.13);font-size:11px;font-weight:800}
.klp .plan .btn{justify-content:center;margin-top:auto;width:100%}
.klp .snote{margin:30px auto 0;max-width:560px;text-align:center;background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);padding:20px 24px;font-size:14.5px;line-height:1.6;color:var(--muted);box-shadow:var(--sh-card)}
.klp .snote b{color:var(--txt);font-weight:650}
.klp .final{position:relative;text-align:center;overflow:hidden;border-radius:30px;padding:88px 24px;background:linear-gradient(180deg,#19191c 0%,#131315 100%);border:1px solid var(--line);box-shadow:var(--sh-card-h)}
.klp .final .glow{position:absolute;width:720px;height:400px;left:50%;top:-140px;transform:translateX(-50%);background:radial-gradient(ellipse at center,rgba(41,151,255,.18),transparent 66%)}
.klp .final h2{font-size:clamp(2rem,4.4vw,3rem);font-weight:600;letter-spacing:-.025em}
.klp .final p{margin-top:14px;color:var(--muted);font-size:1.15rem}
.klp .final .fcta{display:flex;justify-content:center;margin-top:30px}
.klp .taaft-badge{margin:0 auto 18px;opacity:.8;line-height:0}
.klp .taaft-badge img{max-width:190px;height:auto;display:inline-block}
.klp .taaft-badge:hover{opacity:1}
/* KINEO-HOME-POLISH-R2-2026-07-27 — ICONOGRAFIA PROPRIA.
   Os 8 cards do toolkit usavam emoji de sistema (🎬 🎭 🫥 📦 🌀 🖼️ 🔥 ⚡).
   Emoji renderiza com desenho, peso e altura-x diferentes em cada SO — no
   Windows os oito ficavam coloridos e desalinhados entre si, o que le como
   "clipart", nao como produto. Agora sao 8 SVGs inline no MESMO grid de
   24x24, mesma espessura de traco (1.6), todos herdando currentColor, dentro
   de uma placa de 46px identica. Sem biblioteca, sem fonte, sem dependencia. */
.klp .tico{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:var(--blue);background:linear-gradient(180deg,rgba(41,151,255,.14),rgba(41,151,255,.05));border:1px solid rgba(41,151,255,.26);box-shadow:inset 0 1px 0 rgba(255,255,255,.08);flex:none;transition:transform .2s cubic-bezier(.2,.7,.3,1),border-color .2s ease,box-shadow .2s ease}
.klp .tcard:hover .tico,.klp .tcard:focus-within .tico{transform:translateY(-1px) scale(1.04);border-color:rgba(41,151,255,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 6px 18px -8px rgba(41,151,255,.6)}
.klp .tico svg{display:block}
.klp .tools{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.klp .tcard{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);padding:26px 22px;box-shadow:var(--sh-card);transition:transform .2s cubic-bezier(.2,.7,.3,1),border-color .2s ease,box-shadow .2s ease;display:flex;flex-direction:column;gap:6px}
.klp .tcard:hover,.klp .tcard:focus-visible,.klp .tcard:focus-within{border-color:rgba(41,151,255,.38);transform:translateY(-3px);box-shadow:var(--sh-card-h)}
.klp .tcard h3{font-size:1.06rem;font-weight:650;letter-spacing:-.015em;margin-top:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.klp .tcard p{font-size:.93rem;color:var(--muted);line-height:1.58;margin-top:6px}
.klp .tcard .tlink{margin-top:auto;padding-top:16px;color:var(--blue);font-size:.87rem;font-weight:650;display:inline-flex;align-items:center;gap:5px;transition:gap .2s ease}
.klp .tcard:hover .tlink{gap:9px}
.klp .badge{display:inline-flex;align-items:center;height:19px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--blue);background:rgba(41,151,255,.13);border:1px solid rgba(41,151,255,.32);padding:0 7px;border-radius:999px}
.klp .pricing-more{margin-top:24px;text-align:center;font-size:13.5px}
.klp .final h2{letter-spacing:-.03em;text-wrap:balance}
.klp .final p{max-width:520px;margin-left:auto;margin-right:auto;text-wrap:balance}
.klp .gallery-cap{max-width:760px;margin-left:auto;margin-right:auto;line-height:1.65}
.klp .nav-cta{display:flex;align-items:center;gap:10px}
.klp .hvid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.klp .vcard .hvid{border-radius:18px}
@media(max-width:820px){.klp .tools{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.klp .tools{grid-template-columns:1fr}}
/* Empilhado, a fita "Most popular" (top:-12px) invadiria o card de cima com
   o gap original de 18px. 30px deixa a fita respirar. */
@media(max-width:880px){.klp .composer{margin-left:auto;margin-right:auto}.klp .price{grid-template-columns:1fr;max-width:400px;margin:0 auto;gap:30px}}
@media(max-width:780px){
.klp .steps{grid-template-columns:1fr}
.klp .nav-links{display:none}
.klp section{padding:72px 0}
.klp .sec-h{margin-bottom:40px}
.klp .final{padding:60px 20px;border-radius:24px}
.klp .nav-toggle-wrap{display:inline-flex;position:relative;width:44px;height:44px;align-items:center;justify-content:center}
.klp .nav-mobile-menu{position:fixed;top:62px;left:0;right:0;flex-direction:column;background:#0a0a0c;border-bottom:1px solid var(--line);padding:8px 28px 20px;gap:2px;max-height:calc(100vh - 62px);overflow-y:auto;z-index:49}
.klp .nav-mobile-menu a{min-height:44px;display:flex;align-items:center;padding:10px 4px;font-size:15px;font-weight:500;color:var(--txt);border-bottom:1px solid var(--line)}
.klp .nav-mobile-menu a:last-child{border-bottom:none}
.klp .nav-mobile-menu a:hover,.klp .nav-mobile-menu a:focus-visible{color:var(--blue)}
.klp .nav-mobile-menu a.btn{margin-top:12px;min-height:48px;justify-content:center;border-bottom:none;color:#000;font-weight:600}
.klp .nav-mobile-menu a.btn:hover,.klp .nav-mobile-menu a.btn:focus-visible{color:#000}
/* KINEO-HOME-POLISH-R2-2026-07-27 — TABELA DE COMPARACAO NO MOBILE.
   Antes: scroll horizontal cru de uma tabela de 560px dentro de uma tela de
   390px. O visitante via UMA coluna e meia, tinha que arrastar para descobrir
   que a coluna dele era a primeira, e a dica "Swipe to compare" ficava
   alinhada a direita, longe de onde o dedo estava.
   Agora: cada LINHA vira um card. O nome da caracteristica e o titulo do card;
   os 4 concorrentes viram linhas rotuladas (o rotulo sai do atributo
   data-label no <td>, que espelha exatamente o <th> do cabecalho — nenhum
   texto novo foi escrito). A linha do Kineo fica destacada em azul dentro de
   cada card, entao a resposta "e o Kineo, faz?" aparece sem nenhum arraste.
   Nenhuma palavra da tabela mudou; so a forma. */
.klp .cmp-hint{display:none}
.klp .cmp{background:transparent;border:none;border-radius:0;overflow:visible;box-shadow:none}
.klp .cmp table,.klp .cmp tbody,.klp .cmp tr,.klp .cmp td{display:block;width:100%;min-width:0}
.klp .cmp thead{display:none}
.klp .cmp tr{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--sh-card);margin-bottom:12px;overflow:hidden}
.klp .cmp tr:last-child{margin-bottom:0}
.klp .cmp td{display:flex;align-items:center;justify-content:space-between;gap:18px;text-align:right;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.05);font-size:14px}
.klp .cmp td::before{content:attr(data-label);color:var(--muted);font-weight:500;font-size:13px;text-align:left;flex:none}
/* Primeira celula = titulo do card (a caracteristica). */
.klp .cmp td:first-child{display:block;position:static;text-align:left;background:rgba(255,255,255,.028);color:var(--txt);font-weight:650;font-size:14.5px;line-height:1.35;padding:14px 16px}
.klp .cmp td:first-child::before{content:none}
.klp .cmp thead th.us,.klp .cmp td.us{border-radius:0;box-shadow:none}
.klp .cmp td.us{background:rgba(41,151,255,.1);box-shadow:inset 2px 0 0 var(--blue)}
.klp .cmp td.us::before{color:#8cc6ff;font-weight:700}
.klp .cmp tbody tr:last-child td.us{border-radius:0}
.klp .cmp tr td:last-child{border-bottom:none}
.klp .cmp tbody tr:hover td,.klp .cmp tbody tr:hover td:first-child{background:inherit}
.klp .cmp tbody tr:hover td.us{background:rgba(41,151,255,.1)}
}
@media(max-width:520px){.klp .composer{flex-direction:column;align-items:stretch;padding:14px;gap:12px}.klp .composer .cbtn{align-self:stretch;justify-content:center}.klp .composer-proof{text-align:center}.klp .topic-starters{align-items:flex-start;flex-direction:column}}
@media(max-width:560px){.klp .composer .ci{min-height:64px}.klp .hero{padding-top:40px}.klp .composer{margin-top:28px}.klp .composer .cbtn{order:1}.klp .composer-proof{order:1}.klp .topic-starters{order:2}}
.klp .hero-center{position:relative;z-index:1;text-align:center;max-width:780px;margin:0 auto}
.klp .hero-center h1{margin:0 auto;font-size:clamp(3.1rem,7.6vw,6rem);font-weight:640;line-height:.99;letter-spacing:-.045em;text-wrap:balance}
.klp .hero-center .sub{margin-left:auto;margin-right:auto}
@media(max-width:780px){.klp .hero-center h1{font-size:clamp(2.35rem,8.4vw,3.7rem);line-height:1.02;letter-spacing:-.038em}.klp .hero-center .sub{font-size:1.06rem;max-width:38ch}}
.klp .hero-center .composer{margin:44px auto 0;max-width:660px;min-height:auto;text-align:left}
.klp .hero-center .composer .ci{min-height:104px}
.klp .hero-center .trust{text-align:center}
@media(max-width:560px){.klp .hero-center .composer{margin-top:28px}.klp .hero-center .composer .ci{min-height:64px}}
.klp .hero-gallery{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:820px;margin:52px auto 0}
.klp .hero-gallery .vcard{aspect-ratio:9/16;padding:13px}
.klp .hero-gallery .vcard .vt{font-size:12.5px}
.klp .gallery-cap{position:relative;z-index:1;margin-top:20px;text-align:center;font-size:13.5px;color:var(--muted2)}
@media(max-width:900px){.klp .hero-gallery{grid-template-columns:repeat(2,1fr);max-width:420px}}
@media(max-width:560px){.klp .hero-gallery{grid-template-columns:repeat(2,1fr);max-width:380px}}
.klp .platforms{position:relative;z-index:1;margin:22px auto 0;text-align:center;font-size:12px;font-weight:600;letter-spacing:.09em;color:var(--muted2);text-transform:uppercase}
.klp .platforms b{color:var(--muted);font-weight:700}
.klp .faq{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
.klp .qa{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);padding:24px 26px;box-shadow:var(--sh-card);transition:border-color .2s ease,box-shadow .2s ease}
.klp .qa:hover,.klp .qa:focus-visible,.klp .qa:focus-within{border-color:var(--line2);box-shadow:var(--sh-card-h)}
.klp .qa h3{font-size:1.1rem;font-weight:650;letter-spacing:-.018em;line-height:1.35}
.klp .qa p{margin-top:9px;color:var(--muted);font-size:.99rem;line-height:1.62}
/* MOBILE DO HERO — o publico chega no celular e o produto e vertical.
   O h1 ganha a maior parte do ganho: menos padding morto em cima, tracking
   mais fechado no tamanho grande, e a .sub travada em medida de leitura. */
@media(max-width:560px){
.klp .hero{padding:44px 0 60px}
.klp .hero .glow{width:640px;height:420px;top:-150px}
.klp .wrap{padding:0 20px}
.klp .hero-center h1{font-size:clamp(2.5rem,11.2vw,3.4rem);line-height:1.0;letter-spacing:-.042em}
.klp .hero-center .sub{font-size:1.02rem;margin-top:16px;max-width:34ch}
.klp .hero-gallery{gap:10px;margin-top:38px}
.klp .composer{padding:18px;border-radius:20px}
.klp .composer .cbtn{padding:15px 24px;font-size:16px;min-height:52px}
.klp .step,.klp .plan{padding:26px 22px}
.klp .plan.pop{padding-top:38px}
.klp .tcard{padding:22px 20px}
.klp .tico{width:42px;height:42px;border-radius:13px}
.klp .plan .pr{font-size:2.5rem}
.klp .snote{padding:18px 20px;font-size:14px}
}
/* Respeita quem desligou animacao no sistema — os lifts de hover viram
   mudanca de cor apenas. */
@media(prefers-reduced-motion:reduce){
.klp *,.klp *::before,.klp *::after{transition-duration:.01ms!important;animation-duration:.01ms!important}
.klp .btn-w:hover,.klp .step:hover,.klp .tcard:hover,.klp .plan:hover,.klp .vcard:hover{transform:none}
}
`

// KINEO-HOME-POLISH-R2-2026-07-27 — set de icones proprio do toolkit.
// Regras que TODOS os oito obedecem, e que sao a razao de eles lerem como um
// conjunto e nao como oito desenhos avulsos:
//   · mesmo viewBox 24x24, mesma area optica (nada encostando na borda)
//   · fill="none", stroke="currentColor", strokeWidth 1.6, cantos e pontas
//     arredondados — a placa .tico define a cor, o SVG nunca a repete
//   · aria-hidden: o significado ja esta no <h3> do card, entao para um leitor
//     de tela estes sao puramente decorativos
// O icone de Viral Now e deliberadamente o MESMO desenho ja usado em
// components/Sidebar.tsx e components/MobileNav.tsx, para que o item nao mude
// de cara entre o site publico e o app.
const ICON_BASE = {
  width: 23,
  height: 23,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const TOOL_ICONS = {
  // Apresentador: figura enquadrada — o rosto que fala na tela.
  presenter: (
    <svg {...ICON_BASE} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="10" r="2.6" />
      <path d="M7.6 17.8a4.6 4.6 0 0 1 8.8 0" />
    </svg>
  ),
  // Character Lock: a mesma figura, agora com cadeado — "trancada".
  lock: (
    <svg {...ICON_BASE} aria-hidden="true">
      <circle cx="9.6" cy="8.2" r="3.3" />
      <path d="M3.4 19.4a6.3 6.3 0 0 1 9-5.7" />
      <rect x="14.3" y="14.4" width="6.9" height="5.8" rx="1.6" />
      <path d="M16.2 14.4v-1.3a1.6 1.6 0 0 1 3.1 0v1.3" />
    </svg>
  ),
  // Transparente: o mesmo enquadramento do apresentador, mas com a moldura
  // tracejada — a convencao universal de "sem fundo".
  transparent: (
    <svg {...ICON_BASE} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.2" strokeDasharray="3.4 3" />
      <circle cx="12" cy="10" r="2.4" />
      <path d="M8 17.6a4.1 4.1 0 0 1 8 0" />
    </svg>
  ),
  // Anuncio de produto: caixa isometrica.
  product: (
    <svg {...ICON_BASE} aria-hidden="true">
      <path d="m12 2.7 8.1 4.4v9.8L12 21.3 3.9 16.9V7.1z" />
      <path d="M3.9 7.1 12 11.5l8.1-4.4M12 11.5v9.8" />
    </svg>
  ),
  // Animar foto: foto parada + ondas de movimento saindo dela.
  // O <g> so recentra (medido: o desenho caia em 12.7/11.0 em vez de 12/12,
  // porque as ondas puxam massa para a direita e nao somam altura). Translate
  // puro, sem escala — o traco continua identico ao dos outros sete.
  animate: (
    <svg {...ICON_BASE} aria-hidden="true">
      <g transform="translate(-0.7 1)">
        <rect x="2.8" y="4.4" width="13.2" height="13.2" rx="3.4" />
        <circle cx="7.3" cy="9" r="1.4" />
        <path d="m3.2 14.9 4-3.5 3.5 3" />
        <path d="M18.9 9.5a6.4 6.4 0 0 1 0 5.2M21.5 7.6a9.8 9.8 0 0 1 0 9" />
      </g>
    </svg>
  ),
  // Thumbnail: imagem cheia + brilho, o "clique" da miniatura.
  // Mesmo caso do anterior: o brilho no canto superior puxava o centro optico
  // para cima (cy 10.8). Translate puro.
  thumbnail: (
    <svg {...ICON_BASE} aria-hidden="true">
      <g transform="translate(0 1.2)">
        <rect x="2.8" y="5" width="18.4" height="14.4" rx="3.4" />
        <circle cx="8.4" cy="10.4" r="1.5" />
        <path d="m3.4 17 4.9-4.3 4.1 3.5 2.9-2.5 4.5 3.9" />
        <path d="m18.6 2.2.62 1.58 1.58.62-1.58.62-.62 1.58-.62-1.58-1.58-.62 1.58-.62z" />
      </g>
    </svg>
  ),
  // Viral: chama. O desenho e o MESMO path do Sidebar/MobileNav — nao vale
  // redesenhar um simbolo que o usuario ja aprendeu a reconhecer dentro do app.
  // Mas aquele path foi desenhado para uma caixa de 19px na nav e transborda a
  // viewBox aqui: medido, ele ocupa y 3 -> 24.6 (a base da chama era CORTADA)
  // e o centro optico caia em 13.4/13.8 em vez de 12/12, o que o deixava baixo
  // e a direita ao lado dos outros sete. O <g> reenquadra sem tocar no desenho;
  // strokeWidth 1.93 e 1.6 / 0.83, entao depois da escala o traco volta a ser
  // exatamente 1.6 como o dos demais.
  viral: (
    <svg {...ICON_BASE} aria-hidden="true">
      <g transform="translate(0.9 0.55) scale(0.83)" strokeWidth={1.93}>
        <path d="M12 3c1 3-3 5-3 8.5a3.5 3.5 0 0 0 7 0c0-1-.4-2-1-2.8.2 2-1 2.6-1 1.3 0-2.5-1-5.5-2-7Z" />
        <path d="M8 14.5A6.5 6.5 0 1 0 18.5 14" />
      </g>
    </svg>
  ),
  // Gratis / Fast: raio — o mesmo simbolo do logo no topo da pagina.
  bolt: (
    <svg {...ICON_BASE} aria-hidden="true">
      <path d="M13.2 2.4 4.3 13.7h6.4l-1 7.9 8.9-11.2h-6.3z" />
    </svg>
  ),
} as const

function pricingCheckoutHref(checkoutPath: string, isSignedIn: boolean): string {
  if (isSignedIn) return checkoutPath

  // Signed-out buyers see the auth screen before the payment API. This keeps
  // public link checkers from inflating checkout telemetry while preserving
  // the exact plan and intro offer through signup/OAuth.
  const separator = checkoutPath.includes('?') ? '&' : '?'
  const resumePath = `${checkoutPath}${separator}resumed=1`
  return `/signup?reason=checkout&redirect=${encodeURIComponent(resumePath)}`
}

export default function KineoLanding({ initialUser }: Props) {
  const isSignedIn = Boolean(initialUser)
  const starterCheckoutHref = pricingCheckoutHref('/api/stripe/checkout?tier=starter&intro=1', isSignedIn)
  const creatorCheckoutHref = pricingCheckoutHref('/api/stripe/checkout?tier=basic&intro=1', isSignedIn)
  const studioCheckoutHref = pricingCheckoutHref('/api/stripe/checkout?tier=pro', isSignedIn)

  return (
    <>
    <main className="klp">
      <style dangerouslySetInnerHTML={{ __html: KLP_CSS }} />
      <LandingViewTracker signedIn={Boolean(initialUser)} />

      <nav aria-label="Main"><div className="wrap nav-in">
        <Link href="/" className="logo">
          <div className="mk">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="#2997ff" stroke="#2997ff" strokeWidth="0.5" strokeLinejoin="round" />
            </svg>
          </div>
          Kineo
        </Link>
        <div className="nav-links"><Link href="/generate">Video Generation</Link><Link href="/avatar">AI Avatar</Link><Link href="/examples">Examples</Link><a href="#pricing">Pricing</a></div>
        <div className="nav-right">
          {initialUser
            ? <div className="nav-cta"><NavCreditsBadge /><Link className="btn btn-w" style={{ padding: '12px 20px', fontSize: '14px' }} href="/generate">Dashboard</Link></div>
            : <Link className="btn btn-w" style={{ padding: '12px 20px', fontSize: '14px' }} href="#try-kineo">Start free</Link>}
          <div className="nav-toggle-wrap">
            <input type="checkbox" id="nav-toggle" className="nav-toggle-input" aria-label="Menu" aria-controls="mobile-nav-menu" />
            <span className="nav-toggle-btn" aria-hidden="true"><span className="bar" /><span className="bar" /><span className="bar" /></span>
            <label htmlFor="nav-toggle" id="mobile-nav-menu" className="nav-mobile-menu">
              <Link href="/generate">Video Generation</Link>
              <Link href="/avatar">AI Avatar</Link>
              <Link href="/examples">Examples</Link>
              <a href="#pricing">Pricing</a>
              {initialUser
                ? <Link className="btn btn-w" href="/generate">Dashboard</Link>
                : <Link className="btn btn-w" href="#try-kineo">Start free</Link>}
            </label>
          </div>
        </div>
      </div></nav>

      <header className="hero">
        <div className="glow" />
        <div className="wrap">
          <div className="hero-center">
            {/* KINEO-SPRINT-OFFER-2026-07-14 — hero now sells the recurring
                FORMAT (a show with one consistent AI host), not a one-off
                "type an idea" novelty. Same h1/.sub classes, text only —
                the .sub rule was widened to .hero-center in the CSS above.
                Line lengths kept ≤ ~15 chars so the h1 never wraps to a 3rd
                line at the clamp's 5.8rem max inside the 760px container. */}
            <h1 className="gtxt">Launch your<br />AI Shorts show.</h1>
            <p className="sub">Same face, same voice, same style — every episode. Script, voice, captions and scenes in a few minutes.</p>
            <HomeTopicForm isSignedIn={isSignedIn} />
            {/* KINEO-CRO-2026-07-25 — risk-reversal line directly under the primary CTA. */}
            {/* KINEO-HOME-POLISH-2026-07-27 — mesma copy, so respiro e leitura:
                a linha colava no botao e herdava o corpo de 16px, competindo
                com a .sub logo acima. */}
            <p
              className="trust"
              style={{
                textAlign: 'center',
                marginTop: 20,
                fontSize: 13.5,
                lineHeight: 1.7,
                color: 'var(--muted2)',
                maxWidth: 620,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              ✓ No credit card&nbsp;&nbsp;·&nbsp;&nbsp;✓ 3 free videos every 24h&nbsp;&nbsp;·&nbsp;&nbsp;✓ Cancel anytime&nbsp;&nbsp;·&nbsp;&nbsp;
              <Link href="/examples" className="link" style={{ fontSize: 'inherit' }}>Prefer to look first? See real examples →</Link>
            </p>
            {/* PROVA-SOCIAL-REAL-2026-07-02 — real DB counts; renders nothing if numbers are low/unavailable */}
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', minHeight: 22 }}>
              <LiveStatsBadge />
            </div>
          </div>
          <HeroGallery />
          <p className="gallery-cap">Real Kineo exports, not mockups. Each started with one topic — script, voice, footage and captions, automatically. <Link href="/free-ai-shorts-generator" className="link">Try the free AI Shorts generator →</Link> · <Link href="/text-to-video-shorts" className="link">Text-to-video workflow →</Link> · <Link href="/niche-picker" className="link">Find your faceless niche →</Link></p>
          <div className="platforms">Built for <b>YouTube Shorts</b> · <b>TikTok</b> · <b>Reels</b></div>
        </div>
      </header>

      {/* KINEO-CRO-2026-07-25 — explicit 3-step process (the page jumped from hero to comparison). Reuses .steps/.step CSS. */}
      <section id="how">
        <div className="wrap">
          <div className="sec-h"><h2>From idea to posted Short in 3 steps.</h2><p>No filming, no editing, no timeline. Type once — Kineo does the rest.</p></div>
          <div className="steps">
            <div className="step"><div className="n">Step 1</div><h3>Type a topic</h3><p>One line — &ldquo;5 mysteries of the deep sea&rdquo; — or paste your own script. Pick a niche and go.</p></div>
            <div className="step"><div className="n">Step 2</div><h3>Kineo builds it</h3><p>AI writes a retention-structured script, records the voiceover, matches the footage and burns in captions — a finished 9:16 video.</p></div>
            <div className="step"><div className="n">Step 3</div><h3>Download &amp; post</h3><p>Grab the clean MP4 and post to YouTube Shorts, TikTok or Reels. It&rsquo;s yours to keep and monetize.</p></div>
          </div>
        </div>
      </section>

      <section id="compare">
        <div className="wrap">
          <div className="sec-h">
            <h2>One idea in. A finished Short out.</h2>
            <p>
              Most tools re-clip a long video you already filmed. Kineo builds it from scratch.{' '}
              <OrganicCtaLink
                href="/ai-shorts-without-filming"
                source="push50_home_no_camera"
                placement="compare"
                className="link"
              >
                See how to make Shorts without filming →
              </OrganicCtaLink>
            </p>
          </div>
          <p className="cmp-hint">Swipe to compare →</p>
          <div className="cmp"><table>
            <thead><tr><th></th><th className="us">Kineo</th><th>OpusClip</th><th>HeyGen</th><th>Submagic</th></tr></thead>
            {/* KINEO-HOME-POLISH-R2-2026-07-27 — data-label espelha o <th> da
                mesma coluna. No desktop e ignorado; no mobile o CSS o usa para
                virar o rotulo de cada linha do card, o que substitui o scroll
                horizontal. Nenhum valor da tabela mudou. */}
            <tbody>
              <tr><td>Generates the Short from just an idea</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">—</td><td className="no" data-label="HeyGen">~</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>Writes the script for you</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">—</td><td className="no" data-label="HeyGen">—</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>AI voiceover included</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">—</td><td data-label="HeyGen">✓</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>Finds and matches footage</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">your upload</td><td className="no" data-label="HeyGen">avatar only</td><td className="no" data-label="Submagic">your upload</td></tr>
              <tr><td>No per-minute caps</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">credits</td><td className="no" data-label="HeyGen">credits</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>Reusable AI host — same voice &amp; style every episode</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">—</td><td data-label="HeyGen">✓</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>Free videos, no credit card</td><td className="us" data-label="Kineo">3 / day</td><td className="no" data-label="OpusClip">limited</td><td className="no" data-label="HeyGen">trial</td><td className="no" data-label="Submagic">trial</td></tr>
              <tr><td>Starting price</td><td className="us" data-label="Kineo">$4.90 first month</td><td data-label="OpusClip">$15/mo</td><td data-label="HeyGen">$29/mo</td><td data-label="Submagic">$19/mo</td></tr>
            </tbody>
          </table></div>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <OrganicCtaLink
              href="/alternatives"
              source="push50_home_alternatives"
              placement="compare_table"
              className="link"
            >
              Compare Kineo with 27 AI video tools →
            </OrganicCtaLink>
          </div>
        </div>
      </section>

      <section id="toolkit">
        <div className="wrap">
          {/* KINEO-SHOWCASE-2026-07-10 — toolkit expanded to 8 cards (2 rows):
              the 4 new avatar-suite features on top, evergreen tools below. */}
          <div className="sec-h"><h2>One idea — or a whole toolkit.</h2><p>Talking presenters, reusable characters, transparent clips, product ads — plus everything to find and ride a trend.</p></div>
          <div className="tools">
            <Link href="/avatar" className="tcard">
              <span className="tico">{TOOL_ICONS.presenter}</span>
              <h3>AI Presenter <span className="badge">New</span></h3>
              <p>One photo + your script — a talking video with studio-grade lip-sync, HeyGen-style.</p>
              <span className="tlink">Try AI Presenter →</span>
            </Link>
            <Link href="/avatar" className="tcard">
              <span className="tico">{TOOL_ICONS.lock}</span>
              <h3>Character Lock <span className="badge">New</span></h3>
              <p>Save a character once — the exact same face in every video and thumbnail you make.</p>
              <span className="tlink">Lock a character →</span>
            </Link>
            <Link href="/avatar" className="tcard">
              <span className="tico">{TOOL_ICONS.transparent}</span>
              <h3>Transparent Clips <span className="badge">New</span></h3>
              <p>Presenter gestures — wave, point, present — as WebM with a real transparent background.</p>
              <span className="tlink">Make a clip →</span>
            </Link>
            <Link href="/avatar" className="tcard">
              <span className="tico">{TOOL_ICONS.product}</span>
              <h3>UGC Product Ads <span className="badge">New</span></h3>
              <p>Paste any product — get a 15-30s creator-style ad, scripted and spoken for you.</p>
              <span className="tlink">Make an ad →</span>
            </Link>
            <Link href="/animate" className="tcard">
              <span className="tico">{TOOL_ICONS.animate}</span>
              <h3>Animate a Photo</h3>
              <p>Bring any still photo to life as a moving, postable video.</p>
              <span className="tlink">Animate a photo →</span>
            </Link>
            <Link href="/thumbnail-generator" className="tcard">
              <span className="tico">{TOOL_ICONS.thumbnail}</span>
              <h3>AI Thumbnails</h3>
              <p>Click-worthy thumbnails in the style of the biggest channels — from a prompt.</p>
              <span className="tlink">Make a thumbnail →</span>
            </Link>
            <Link href="/viral-now" className="tcard">
              <span className="tico">{TOOL_ICONS.viral}</span>
              <h3>Viral Now</h3>
              <p>Today&apos;s trending topics, ready to turn into a Short with one click.</p>
              <span className="tlink">See what&apos;s trending →</span>
            </Link>
            <Link href="/free-ai-shorts-generator" className="tcard">
              <span className="tico">{TOOL_ICONS.bolt}</span>
              <h3>Free AI Shorts</h3>
              <p>Type one idea and test the full Fast workflow with no card.</p>
              <span className="tlink">Generate free →</span>
            </Link>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="wrap">
          <div className="sec-h"><h2>Simple pricing. Try Fast free first.</h2><p>Create, download and share up to 3 watermarked Fast videos every 24h, no card. Paid plans unlock clean MP4s.</p></div>
          <div className="price">
            {/* Signed-in buyers go straight to Stripe. Signed-out buyers go to
                signup with the complete checkout destination encoded, which
                preserves tier + intro and prevents crawlers from calling the
                payment API just by following the public pricing links.

                KINEO-CHECKOUT-TRIAGE-2026-07-25 — rel="nofollow" is a PARTIAL
                mitigation only. These three CTAs are still plain <a> elements,
                so a signed-in session has no click latch (double tap = two
                Stripe Sessions), no pending state and no inline error. The real
                fix is useCheckoutLaunch, which needs a client component; this
                file is a SERVER component and a client boundary cannot be
                declared inside it, so that requires a new file. */}
            <div className="plan">
              <div className="pt">Best for testing</div><div className="nm">Starter</div>
              <div className="pr">$4.90<span>/mo</span></div>
              <div className="pr-then">then $9.90/mo</div>
              {/* KINEO-SHOWCASE-2026-07-10 — V3C: 25 credits, Fast = 1 credit. */}
              <ul><li><span className="ck">✓</span> Cancel anytime — 7-day money-back</li><li><span className="ck">✓</span> 25 credits/month (Fast = 1 cr)</li><li><span className="ck">✓</span> AI script + neural voiceover + captions</li><li><span className="ck">✓</span> Watermark-free MP4</li></ul>
              <a className="btn btn-w" rel="nofollow" href={starterCheckoutHref}>Start — $4.90 first month</a>
            </div>
            <div className="plan pop">
              <div className="pt">Most popular</div><div className="nm">Creator</div>
              <div className="pr">$9.90<span>/mo</span></div>
              <div className="pr-then">then $24.90/mo</div>
              {/* KINEO-PRICING-V3B-2026-07-10 — $24.90/150cr, 1 Hollywood film/mo included */}
              <ul><li><span className="ck">✓</span> Cancel anytime — 7-day money-back</li><li><span className="ck">✓</span> 1 Hollywood film/mo included · 150 credits</li><li><span className="ck">✓</span> Every scene generated by AI</li><li><span className="ck">✓</span> Script + voiceover + captions</li></ul>
              <a className="btn btn-w" rel="nofollow" href={creatorCheckoutHref}>Go Creator — $9.90 first month</a>
            </div>
            <div className="plan">
              <div className="pt">Best value per video</div><div className="nm">Studio</div>
              <div className="pr">$37.90<span>/mo</span></div>
              {/* KINEO-REBASE-2026-07-10 — 400 → 200 credits (2:1 rebase, USD unchanged) */}
              <ul><li><span className="ck">✓</span> <b>~4 Cinematic AI</b> videos/mo (Kling)</li><li><span className="ck">✓</span> 200 credits/mo (33% more)</li><li><span className="ck">✓</span> Highest quality + priority queue</li><li><span className="ck">✓</span> Everything in Creator</li></ul>
              <a className="btn btn-w" rel="nofollow" href={studioCheckoutHref}>Go Studio — $37.90/mo</a>
            </div>
          </div>
          {/* KINEO-SPRINT-OFFER-2026-07-14 — the "10 videos for $4.90 one-time"
              note is gone (single-offer cleanup; ?pack=starter stays alive for
              the watermark unlock only). The intro month is the entry path. */}
          <div className="snote">Try it first: <b>create, watch, download and share up to 3 Fast videos every 24h</b> — no card, watermark included.</div>
          {/* KINEO-CRO-2026-07-25 — payment-trust line to lower checkout anxiety. */}
          <p style={{ marginTop: 14, textAlign: 'center', fontSize: 12.5, letterSpacing: '.02em', color: 'var(--muted2)' }}>
            🔒 Secure checkout powered by Stripe&nbsp;&nbsp;·&nbsp;&nbsp;Cancel in one click&nbsp;&nbsp;·&nbsp;&nbsp;Credits refunded automatically if a render fails
          </p>
          <div className="pricing-more" style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Link className="link" href="/pricing">Full pricing, FAQ &amp; plan comparison →</Link>
            <CostCalculatorLink className="link" placement="home_pricing" >Calculate your cost per Short →</CostCalculatorLink>
            <Link className="link" href="/how-much-do-youtube-shorts-pay">How much do Shorts pay? →</Link>
            <Link className="link" href="/youtube-shorts-rpm-by-niche">Highest-RPM niches →</Link>
          </div>
        </div>
      </section>

      <section id="faq">
        <div className="wrap">
          <div className="sec-h"><h2>Questions, answered.</h2></div>
          <div className="faq">
            <div className="qa"><h3>Is the video really mine to post?</h3><p>Yes. Never-paid free users can download, share and post the watermarked MP4. Paid plans unlock the clean, watermark-free MP4 for YouTube, TikTok or Reels.</p></div>
            <div className="qa"><h3>Do I need any editing skills?</h3><p>None. You type one idea and the AI writes the script, records the voice, finds the footage and adds captions. Free downloads carry a watermark; paid plans unlock the clean MP4.</p></div>
            <div className="qa"><h3>Is there a watermark?</h3><p>Free access gives new users up to 3 watermarked Fast videos every 24 hours, with no card. You can download and share them. Paid plans export clean, watermark-free MP4s.</p></div>
            <div className="qa"><h3>Can I use my own script?</h3><p>Yes — paste your script and pick &ldquo;Use my script as is&rdquo; and the AI narrates it word for word.</p></div>
            <div className="qa"><h3>What if a generation fails?</h3><p>Your credits come back automatically the moment a render fails — no support ticket, no waiting. You only pay for videos you actually get.</p></div>
            {/* KINEO-SPRINT-OFFER-2026-07-14 — "credits never expire" was the
                old one-time-pack promise; plan credits refresh monthly (no
                rollover), same as the /pricing FAQ says. Copy aligned. */}
            <div className="qa"><h3>Can I cancel anytime?</h3><p>Anytime, in one click. Plans are month to month and your credits refresh every month.</p></div>
            {/* KINEO-CRO-2026-07-25 — objection-busting Q&As (also mirrored in components/StructuredData.tsx FAQPage schema). */}
            <div className="qa"><h3>Can I run a whole channel with the same host?</h3><p>Yes — that&rsquo;s the point. Keep the same voice, style and captions across every episode so your channel looks consistent, without filming a single frame.</p></div>
            <div className="qa"><h3>Can I monetize the videos?</h3><p>Yes. Every video is yours to keep, post and monetize — including the YouTube Partner Program, TikTok and Reels. No extra license needed.</p></div>
            <div className="qa"><h3>How long does one video take?</h3><p>Fast Mode usually finishes in 2–4 minutes. AI-generated and cinematic videos take a little longer because every scene is generated before the final MP4 is composed.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="final">
            <div className="glow" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 className="gtxt">Type a topic. Get a finished Short.</h2>
              <p>Create, watch, download and share up to 3 watermarked Fast videos every 24h — no card.</p>
              <div className="fcta"><Link className="btn btn-w" href="#try-kineo">Choose my topic — free</Link></div>
            </div>
          </div>
        </div>
      </section>

      {/* Marker: KINEO-TAAFT-BADGE-2026-07-01 (verification embed — homepage only) */}
      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 28, textAlign: 'center', borderTop: '1px solid #2a2a2d' }}>
        <div className="taaft-badge">
          <a href={"https://theresanaiforthat.com/ai/kineo/?ref=featured&v=11418043"} target="_blank" rel="nofollow noreferrer">
            <img width={200} height={42} loading="lazy" decoding="async" src={"https://media.theresanaiforthat.com/featured-on-taaft.png?width=600"} alt="Featured on There's An AI For That" />
          </a>
        </div>
      </div>
      <StickyFreeShortCTA />
      {/* KINEO-CRO-2026-07-25 — recover exiting logged-out visitors (was only on /pricing). */}
      {!isSignedIn && <ExitIntentOffer />}
    </main>
    <Footer showStats={false} />
    </>
  )
}

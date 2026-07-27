# workstreams/DESIGN.md — Design & Experience

**Leia antes:** `AGENTS.md` → `docs/PROJECT_STATE.md` → este arquivo.

---

## ESCOPO
Identidade visual, UX/UI, site, landing pages, mobile e desktop, clareza da oferta **na tela**, previews e demos, confiança, prova visual, acessibilidade, velocidade percebida, microinterações, estados de carregamento / erro / bloqueio / vazio, redução de fricção, conversão visual.

## FORA DO ESCOPO — regra dura
**Você mexe em forma, não em conteúdo.** Não altera preço, número de crédito, headline, CTA textual, promessa ou posicionamento. Isso é do Growth (`DECISIONS.md`, 27/07).

Se a oferta estiver confusa na tela: descreva o sintoma e levante como requisito para Growth. Não conserte sozinho.

---

## FATOS TÉCNICOS QUE MUDAM COMO VOCÊ TRABALHA

### A home NÃO usa Tailwind
`app/KineoLanding.tsx` roda num CSS escopado próprio (classes `.klp`) dentro do próprio arquivo. **A paleta de `tailwind.config.js` tem zero uso no projeto inteiro.** Refine o sistema `.klp`, que é o real.

### Componentes andam em pares
`Sidebar.tsx` ↔ `MobileNav.tsx` ↔ nav pública · cards do Viral Now ↔ `DashboardClient.tsx` **e** `ViralNowClient.tsx`. Mexeu em um, verifique o par.

### Worktree não tem `node_modules` nem `.env.local`
Não tente `npm install`, `npm run dev` nem `npm run build`. É por isso que o entregável é HTML estático.

---

## ENTREGA — regra permanente
Toda entrega inclui **antes/depois que o fundador consiga olhar**. Um `PREVIEW-HOME.html` autocontido (CSS inline), com cada seção tocada em par rotulado, desktop e mobile quando ambos foram mexidos. **Seção fora do preview não chega ao fundador.** Detalhe em `AGENTS.md` §8.

O "antes" é o estado **original**, não o da rodada anterior — o fundador quer ver o acumulado.

---

## HISTÓRICO

**Rodada 1 (27/07)** — refinamento do hero em `app/KineoLanding.tsx`: gradiente do h1 que apagava no meio da frase, respiro do hero e das seções, largura de leitura da subheadline, sombra e estados de foco do CTA, unificação de raio/sombra dos cards em 3 tokens, glow fora da paleta, mobile ganhando 16px úteis.

**Rodada 2 (27/07)** — alvos: 8 cards do toolkit trocando emoji de sistema por SVG inline · tabela de comparação mobile saindo do scroll horizontal cru para cards empilhados · propagar o sistema do hero para abaixo da dobra · `/pricing` (forma apenas). Arquivos tocados: `app/KineoLanding.tsx`, `app/pricing/PricingClient.tsx`. **Não commitado** — vive no worktree `claude/kind-fermi-ae0e28`.

**Continua feio, para a rodada 3:** o resto do site fora da home e do pricing.

---

## PRIMEIRA PERGUNTA DE TODA RODADA
"Isto move ativação ou conversão?" Se não, não faça. Não redesenhe nada só porque é possível.

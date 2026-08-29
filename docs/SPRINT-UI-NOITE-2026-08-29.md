# Sprint noturno de UI — 29/08/2026 (12 sprints, 1/h até 07:00 BRT)
Regras do fundador: NÃO tocar nos cards de motores da home (EngineCycleCard/
engineWall — desenho dele) nem na pista do Codex (aquisição/fluxo/assinaturas/
checkout/pricing). Cada sprint: worktree limpa a partir de entrega-atual,
mudança visível de UI, teste, commit, mover branch entrega-atual. O fundador
sobe TUDO com um clique no !RODAR-AGORA.bat às 07:00.

## Registro (cada rodada appenda aqui)
- [Sprint 1 · feito na sessão principal] Ergonomia de toque no studioKit:
  textarea 16px anti-zoom iOS, alvos ≥44px, vrow 2 colunas no celular.
- [Sprint 2 · 20:20] Tela de erro da casa: app/error.tsx + global-error.tsx.
  Antes, qualquer quebra de tela caia no erro branco default do Next — a mesma
  divida do incidente JWT-skew (telas mascarando erro como vazio). Agora o
  cliente ve "your videos and credits are safe", botao Try again e o codigo do
  erro pra suporte. 8 verificacoes em scripts/test-error-pages.mjs.
  (Base rebaseada: sprint #1 reaplicado sobre origin/main 67b88b0 → a5e788c.)

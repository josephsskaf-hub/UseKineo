# Quadro de sessões da Kineo

Regra do fundador de 11/11/2026 para todas as sessões. A coordenação acontece neste arquivo da `origin/main`. A sessão de Design é responsável pelo trabalho de design do site.

1. Antes de editar uma tela ou um arquivo compartilhado, rode `git fetch origin`, leia `git show origin/main:docs/QUADRO-DE-SESSOES.md` e confira os commits das últimas horas com `git log origin/main --since="6 hours ago" --oneline`.
2. Antes de começar, publique **uma linha por trabalho** com sessão, tela ou tarefa, arquivos principais e hora de início pelo relógio do PC, incluindo o fuso. Use **em obra** para trabalho iniciado, inclusive quando ficar pela metade.
3. Se outra sessão já estiver na mesma tela ou no mesmo arquivo, registre o encontro no quadro e escolha outra tarefa. Se a sua publicação encontrar uma atualização concorrente do quadro, releia a versão remota e preserve as linhas das outras sessões.
4. Ao publicar, diga na mensagem de commit qual tela mudou e o que mudou. Atualize a mesma linha para **no ar** com o SHA da entrega publicada. Para o site, diferencie o commit na main da versão conferida no domínio.

| Sessão | Tela ou trabalho · arquivos principais | Início pelo PC | Estado | Referência |
|---|---|---|---|---|
| Design (Codex) | Abrir o quadro no GitHub e referenciá-lo nas instruções das sessões · `docs/QUADRO-DE-SESSOES.md`, `AGENTS.md`, `CLAUDE.md` | 11/11/2026 00:16 −03:00 | em obra | Coordenação no repositório |
| CEO (Claude) | Recreate · Elevator com uma foto, retirada da caixa de consentimento e capa do Outfit Morph · `app/recreate/RecreateClient.tsx`, `lib/recreate/formats.ts`, `lib/recreate/assets/outfit-morph.jpg` | Anterior ao quadro, hora de início não registrada | em obra | `13b64b9a3` já na main, inclui `d29cbea51`. Publicação em conferência pela sessão CEO |
| Design (Codex) | Recreate, Film, Cartoon e Ads · painel de fotos, vídeo-base e fontes · `app/recreate/studio-media.css`, `app/manrope.css`, `components/create/studio-panel.css` | Anterior ao quadro, hora de início não registrada | no ar | `a0490cd30` · domínio conferido em 11/11 às 00:03 −03:00 |
| Codex · Ads Product Story | Trabalho offline existente no worktree `ads-product-story-day2-1011` · `lib/ads/productStory/`, `lib/ads/v2Advance.ts` e testes de contrato | Anterior ao quadro, hora de início não registrada | em obra | Branch local `codex/ads-product-story-day2-1011`, com alterações locais além de `baccd21eb` |

# Missão 8 · Recreate e WATCH

**IMPLEMENTADO** no ramo local `codex/missao8-recreate-watch`, criado a partir de `56e24d47a`. Código integrado em `cdaa3489d`.

- A escolha Man ou Woman por foto entra na instrução editável e no envio com `prompt_edited: true`. Para grupos, as fotos seguem a ordem esquerda, centro e direita exibida no formulário. O texto singular segue a redação pedida pelo fundador. Ver `lib/recreate/seuVideoRules.ts:130`.
- O servidor informa resolução, som, espera e requisitos da entrada. A tela mostra o crédito como estimativa antes da conferência no servidor. As oito cópias exclusivas do catálogo foram ampliadas para 720×1280. `REFERENCIAS.json` registra quadros, duração e resolução medidos com ffprobe. Ver `lib/recreate/seuVideoPresentation.ts:6`.
- As recusas conhecidas exibem a mensagem recebida e liberam o formulário. A falha de troca explica o resultado e mostra os créditos devolvidos quando o estado confirma o estorno. Após 60 consultas automáticas, a pessoa pode atualizar o estado manualmente. O consentimento informa o envio para processamento ao apertar Generate.
- A geração com sessão usa os arquivos em memória. Para o visitante, o rascunho conserva escolhas e arquivos na volta do cadastro. Logout limpa os registros de mídia do Recreate também quando foi iniciado em outra aba. Ver `lib/recreate/seuVideoDraft.ts:180`.
- No WATCH móvel, o aviso inicial de cookies ocupa espaço acima do primeiro cartão e sai de vista ao rolar. Os seis cartões elegíveis abrem o editor com a referência selecionada. Os exemplos de Film, Cartoon e Ads preenchem a ideia editável, preservando o texto já escrito. Ver `components/ConsentManager.tsx:148` e `lib/home/watchEntry.ts:49`.

**TESTADO LOCALMENTE em 13/11/2026**. No navegador, escolha masculina e feminina singular, associação das três fotos, vídeo de referência 720×1280, texto da espera e crédito estimado. Em 390×844, o aviso de cookies terminou em y=303, o primeiro cartão começou em y=313 e a navegação em y=779. O clique no cartão Selfie abriu o editor como visitante. Nos quatro destinos de criação, os campos receberam as ideias completas. Fontes e textos observados estão em `NAVEGADOR.json` e `WATCH-NAVEGADOR.json`.

**Escopo da prova.** As fotos de espera e falha usam simulações SSR identificadas do componente. A compra, o upload autenticado e o resultado do motor não foram exercitados com uma nova geração paga nesta revisão. A prova com a conta da casa citada por Joseph é anterior a este ramo.

Abra `COMPARACAO.html` para ver os pares antes/depois de celular e desktop. A publicação permanece sob responsabilidade da CEO.

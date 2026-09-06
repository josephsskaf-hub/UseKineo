# Cinco ferramentas de edição — 06/09/2026

## Escopo e estado

- **DECISÃO DO FUNDADOR (chat, 06/09):** pesquisar funções usuais de edição do CapCut, implementar cinco equivalentes próprios na Kineo e renomear Free Tools. Não é integração nem cópia do aplicativo CapCut.
- **IMPLEMENTADO, AINDA SEM VALIDAÇÃO EM PRODUÇÃO:** recorte temporal, formato/enquadramento, velocidade, remoção do áudio, texto gravado nos pixels. Hub `/tools` mantém os treze destinos anteriores e acrescenta cinco entradas para `/tools/editor?tool=...`. Menu desktop/mobile passa a Editing tools / Herramientas de edición.
- **FATO CONFIRMADO:** `lib/videoEditing/browserEditor.ts` usa Canvas, MediaRecorder e Web Audio; não chama fornecedor, geração, armazenamento, conta ou crédito. Download local, não My Videos. Arquivo original não é alterado. Componentes globais do site continuam com a telemetria já existente; “sem upload” refere-se ao arquivo de vídeo.
- **FATO CONFIRMADO:** limites explícitos: entrada até 100 MB / 180 segundos, saída até 1280 px no lado longo, exportação em tempo real, MP4 se codec suportado e WebM como alternativa com extensão correta. Exige aba visível. Não promete qualidade idêntica ao original, 4K, transcrição automática, remoção de fundo ou paridade com CapCut.
- **FATO CONFIRMADO:** nenhum pacote novo, migration, variável, mudança de render, preço ou cobrança. O `node_modules` compartilhado não foi modificado.

## Pesquisa e critério

- **EVIDÊNCIA EXTERNA (consulta 06/09/2026):** CapCut documenta essas operações no [editor online](https://www.capcut.com/tools/online-video-editor), [recorte](https://www.capcut.com/tools/online-video-trimmer), [velocidade](https://www.capcut.com/tools/change-video-speed) e [texto](https://www.capcut.com/tools/add-text-to-video).
- **DESCONHECIDO:** ranking quantitativo das cinco funções mais usadas. Não foi encontrado ranking primário; seleção é de operações básicas úteis, não “top 5 por usuários”.
- **FATO DOCUMENTADO:** [MediaRecorder.isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static) não garante recursos suficientes; há tratamento de erro/cancelamento e verificação real de codec ainda necessária.

## Verificação antes de publicar

- **TESTADO LOCALMENTE:** 79 contratos executam política, exportação real com primitivas de navegador mockadas, descarte de recursos, recorte, mute, desenho de texto, falhas e destinos reais do hub. Isso não comprova o codec do navegador.
- **TESTADO LOCALMENTE:** UX 49, idioma 1058, workspace ES 22, navegação 23, curadoria 247; `npx tsc --noEmit` código 0. Testes históricos do hub atualizados para permitir somente cinco novos destinos, sem perder os antigos; teste do título espanhol atualizado à nova copy; comparação integral da home permite apenas o rename aprovado.
- **ARTEFATO:** `docs/previews/UX-VIDEO-EDITING-2026-09-06.html`, JSX real antes/depois (`163198f0`) desktop/mobile, editor novo EN/ES. HTML estático, sem exportação funcional e sem serviços externos.
- **PENDENTE:** preview web, exportações de amostra no Chrome (incluindo áudio e download), layout móvel, Guardião, merge seguro e validação de produção. Não apresentar código como funcional em produção antes destes gates.

## Coordenação

- Não tocar nos motores/legendas/cenas/créditos do Claude. Arquivos novos concentrados em `app/tools/editor/` e `lib/videoEditing/`; somente label de navegação em `app/KineoLanding.tsx` e a central de ferramentas foram alterados.
- Trabalho na worktree `C:/tmp/usekineo-ux-completo-2026-09-06`, branch `codex/ux-completo-2026-09-06`, base `163198f0`. Nenhum arquivo da árvore principal utilizado para escrita.

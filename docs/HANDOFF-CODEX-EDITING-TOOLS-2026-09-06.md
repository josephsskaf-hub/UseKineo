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

- **TESTADO LOCALMENTE:** 92 contratos executam política, exportação real com primitivas de navegador mockadas, descarte de recursos, recorte, mute, desenho de texto, falhas e destinos reais do hub. Isso não comprova o codec do navegador.
- **TESTADO LOCALMENTE:** UX 49, idioma 1058, workspace ES 22, navegação 23, curadoria 247; `npx tsc --noEmit` código 0. Testes históricos do hub atualizados para permitir somente cinco novos destinos, sem perder os antigos; teste do título espanhol atualizado à nova copy; comparação integral da home permite apenas o rename aprovado.
- **ARTEFATO:** `docs/previews/UX-VIDEO-EDITING-2026-09-06.html`, JSX real antes/depois (`163198f0`) desktop/mobile, editor novo EN/ES. HTML estático, sem exportação funcional e sem serviços externos.
- **PENDENTE NESTE CHECKPOINT:** merge seguro e validação de produção. Os testes de preview abaixo não são ainda produção.

## Coordenação

- Não tocar nos motores/legendas/cenas/créditos do Claude. Arquivos novos concentrados em `app/tools/editor/` e `lib/videoEditing/`; somente label de navegação em `app/KineoLanding.tsx` e a central de ferramentas foram alterados.
- Trabalho na worktree `C:/tmp/usekineo-ux-completo-2026-09-06`, branch `codex/ux-completo-2026-09-06`, base `163198f0`. Nenhum arquivo da árvore principal utilizado para escrita.

## Validação funcional do preview — 06/09, 21:03 BRT

- **TESTADO NO CHROME REAL:** PR #49, código de exportação `aa8c020661bcb290514a135c0584021f250dcbaa`, preview `dpl_D961z4AymJ93z6iCrTs8YJCJoJV6` READY. A amostra sintética identificada como KINEO SAMPLE é criada por clique no navegador, com animação e tom de áudio; não é vídeo de cliente nem render pago. Os arquivos foram baixados pelo link da interface e inspecionados com ffprobe/ffmpeg local.
- **EVIDÊNCIA DO ARQUIVO, 06/09:** corte de 1–3 s silencioso: MP4 H.264, 640×360, 2,040567 s e nenhuma faixa de áudio (`Downloads/kineo-sample-kineo-edit (4).mp4`). Mesma faixa em 9:16 com texto central: 360×640, 2,033400 s, sem áudio (`(5).mp4`). O frame extraído mostra literalmente TESTE KINEO • VIDEO EDITADO nos pixels. Acelerar essa faixa a 2×, mantendo áudio: vídeo 1,020767 s, AAC 0,959042 s, volume médio −29,1 dB (`(6).mp4`). Não é apenas botão ou evento de sucesso.
- **CORREÇÕES GUIADAS PELO TESTE:** os primeiros arquivos falharam: havia atraso de início e MP4 silencioso de ~1 s para seleção de 2 s. Iniciar MediaRecorder após play() removeu o atraso; requestFrame sozinho NÃO resolveu a duração. Trocar o relógio de exportação de requestAnimationFrame por setTimeout com requestFrame resolveu o caso reproduzido. `exportClip` agora decodifica a saída e rejeita arquivo com duração/dimensões incompatíveis antes de oferecê-lo. Arquivos experimentais anteriores não são exemplos aprovados.
- **FATO CONFIRMADO:** proteções e relógio em `lib/videoEditing/browserEditor.ts:66`; desenho comum de texto/preview em `:39`; limites em `lib/videoEditing/settings.ts:13`. `5fc21a0c` também evita redesenhar continuamente o preview pausado, sem alterar o codificador testado.
- **TESTADO VISUALMENTE:** hub desktop com cinco ferramentas e treze destinos preservados; editor em 390 px e espanhol em 320 px sem overflow horizontal; intervalo inválido exibe erro espanhol. HTML antes/depois em `docs/previews/UX-VIDEO-EDITING-2026-09-06.html`.
- **LIMITAÇÃO DE VERIFICAÇÃO:** a extensão Chrome recusou atribuir arquivo ao seletor nativo (Allow access to file URLs desativado). Não contornei a permissão; carga/edição foram exercitadas com a amostra local explícita do app. Seleção de arquivo externo, Safari, telefone físico e todos os codecs não estão validados. Chrome desktop foi o navegador real dos testes, viewport móvel não prova Safari/iOS.
- **TESTADO LOCALMENTE / CI:** Guardião `34068182182` success para `5fc21a0c`; não substitui `npx tsc --noEmit` bruto, que passou sem filtros. O workflow atual usa continue-on-error, portanto não declaro a suíte inteira perfeita pelo verde do CI.
- **COORDENAÇÃO:** commits Claude `5411b6be` (SourceCapture) e `d8a552f8` (llms/fatos de aquisição) incorporados sem conflitos e sem alterações próprias nesses arquivos. Não há migration, serviço novo, envio de arquivo, crédito gasto ou alteração de motores.

## Fechamento — publicado e validado, 06/09/2026

- **VALIDADO EM PRODUÇÃO:** PR #49 merged por fast-forward, SHA `710e1eb0427e8a1bf03665b1ee027b2e44233fc9`. Deploy `dpl_DCDxputAVzx4qFzSZfddZHRjU1Li` READY, target production. Chrome em `https://www.usekineo.com/tools` mostra as cinco ferramentas; clique no card abre o editor real. A home exibe Editing tools no menu principal. Interface EN/ES confirmada no editor público.
- **EVIDÊNCIA DO ARQUIVO PÚBLICO:** no domínio de produção, amostra sintética local → selecionar 1–3 s → 9:16 / Fill → 2× → mute → texto KINEO · TESTE EM PRODUÇÃO → exportar → baixar. MP4 em `C:/Users/josep/Downloads/kineo-sample-kineo-edit (8).mp4`: H.264, 360×640, 1,055033 s, nenhuma faixa de áudio. Frame extraído confirma texto nos pixels e crop selecionado. Sem crédito ou fornecedor. Não é prova de render do gerador, que não foi tocado.
- **TESTADO NO PREVIEW FINAL:** cancelamento deixa fonte e ajustes intactos; nova exportação após cancelar funciona. Corte de 2 s a 0,5×, quadrado com Fill: MP4 H.264 640×640, 4,071933 s, AAC 4,007750 s (`(7).mp4`).
- **GATES FINAIS:** 92 editor; 49 UX; 22 workspace ES; 1058 idioma; 23 navegação; 247 curadoria; 28 fatos AEO do Claude. Todos exit 0; typecheck bruto exit 0 após incorporar `d8a552f8`; diff check limpo. Guardião `34068657243` success no SHA publicado. Uma tentativa de rodar o nome inexistente test-home-curation.mjs falhou antes de executar teste; o arquivo correto test-home-curation-restore.mjs foi executado e passou 247/247.
- **COORDENAÇÃO FINAL:** `430997cb` do Claude acrescentou apenas diário depois do merge; já incorporado por fast-forward antes deste registro. Não reverter esse commit para desfazer ferramentas. Rollback, se necessário, deve ser um novo commit com reversão somente do diff funcional desta entrega, preservando os commits de aquisição e seu diário. Não há tarefa agendada nova.
- **LIMITES MANTIDOS:** arquivos até 100 MB/3 minutos, exportação recodificada até 1280 px, aba visível; compatibilidade varia por navegador. Seleção nativa de arquivo externo não automatizada pela restrição da extensão já documentada. Sem promessa de todos os codecs/dispositivos. Este registro documental não altera o código validado.

# Missão 7 · Recreate com seu vídeo · 13/11/2026

**IMPLEMENTADO / TESTADO LOCALMENTE.** Entrega de tela em `codex/recreate-seu-video-1311`. Prévia `/recreate-preview`, sem índice; interruptor `SEU_VIDEO_PREVIEW_ENABLED` em `lib/recreate/seuVideoPreviewRelease.ts:2`. Geração continua `internal`, definida e conferida pelo servidor. Não houve push, deploy ou geração paga pelo GPT.

Abra `COMPARACAO.html`: CSS e 18 capturas JPEG embutidos, sem build ou servidor. `CAPTURAS.json` contém dimensões nativas e SHA-256. Celular 390×844 e desktop 1920×1080, sem montagem ou redimensionamento das imagens. Os quatro estados simulados estão identificados como fixtures SSR; o vídeo de resultado dessas fixtures é um placeholder do catálogo.

**FATO CONFIRMADO:** a página usa a conta real no servidor e limita a ação às contas permitidas (`app/recreate-preview/page.tsx:16`). O formulário permite escolher o vídeo, 1–3 fotos e editar a instrução antes da conta. Só Generate salva o rascunho e encaminha ao cadastro (`app/recreate-preview/SeuVideoRecreateClient.tsx:149`). A volta usa um identificador opaco de registro local, sem fotos, nome de arquivo, instrução ou credenciais na URL. Restaurar nunca gera automaticamente.

**FATO CONFIRMADO:** a conferência do servidor determina o custo e o texto; uma mudança pede outra confirmação manual. A repetição de um pedido incerto mantém os mesmos arquivos, conferência e chave, sem envio automático. O acompanhamento só lê o estado; estorno é anunciado como confirmado apenas quando a resposta traz créditos devolvidos. Preview do resultado usa `comPrimeiroQuadro`; Download usa o helper `downloadHref` do domínio da casa, sem o fragmento de preview. A medição `prompt_edited` compara a instrução enviada com a conferida (`lib/recreate/seuVideoClient.ts:204`).

**TESTADO LOCALMENTE:** seleção real de foto e MP4 públicos do repositório, edição da instrução, Generate de visitante e retorno em outra aba da mesma origem preservaram os arquivos e texto (`FLUXO-NAVEGADOR.json`). Não se completou um cadastro real. As capturas do formulário e catálogo vieram de build otimizado; as duas capturas do percurso de cadastro vieram do build de desenvolvimento. O DOM do build otimizado registrou largura 390/390 no celular e 1916/1920 no desktop (barra de rolagem), sem texto próprio abaixo de 12px (`DOM-MOBILE.json`, `DOM-DESKTOP.json`).

**FATO CONFIRMADO:** as oito referências são arquivos públicos existentes; seus cabeçalhos reais foram lidos offline com o parser da API (`CATALOGO-METADADOS.json`). A duração não é inventada no catálogo. MP4/MOV de celulares com MIME vazio ou genérico usam a mesma inferência de tipo no cliente e no rascunho; o servidor ainda valida os bytes, duração e fps. WebM não recebe esse fallback.

**QUESTÃO PENDENTE / DESCONHECIDO:** aceitação de rosto real pelo motor, cobrança/estorno reais, geração autenticada completa e áudio original não foram validados pelo GPT. Login externo e conta da casa foram verificados como estados de componente e gates offline, não como sessões reais do navegador. A instrução inicial é a transformação canônica da API, editável; não é uma análise automática da cena do vídeo.

**SUGESTÃO / próximo passo recomendado:** CEO revisa o diff e a comparação, publica a prévia e faz a prova completa com vídeo e foto autorizados na conta da casa, incluindo o download. Não abrir a geração ao público antes da decisão da CEO. O contrato publicado está em `docs/decisoes-1311/recreate-seu-video-contrato-1311.md`.

**DECISÃO DO DONO / escopo:** missão 6 Etapa 2 permanece em espera, preservada no commit `3c171f82f300aceed7a3275ec49689852c0b4f0c` e nos três worktrees `m6s2-*`. Os três consertos adicionais do WATCH também não fazem parte desta entrega.

Os resultados finais de build, tipos e gate ficam em `VALIDACAO.md` e `validacao/`.

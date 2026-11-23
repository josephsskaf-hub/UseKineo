# Citações · devolutiva de 23/11/2026

**TESTADO LOCALMENTE.** Branch `codex/citacoes-cartoon-2311`, de `origin/main` `b2c24e671`. Código `771d445ec5cfc3a3d7dd5179f90bf43cf55b0fd9`. Nenhum push, merge, deploy, gasto, render, conta nova, página nova, escrita no banco ou subagente nesta sessão. A cabeça final fica registrada no quadro local.

**EVIDÊNCIA DE PRODUÇÃO · 23/11, 01:51:10 BRT.** O quadro da CEO registra a publicação `00d58ecd2`: dez páginas de comprador, cores dos blocos e resposta do cartoon. A devolutiva pediu contraste da data/borda no celular escuro, `lastmod` seletivo e reancoragem do guardião de histórias. Este relatório entrega o conserto **local**, ainda pendente da revisão e publicação pela CEO.

**FATO CONFIRMADO · IMPLEMENTADO.** `app/free-ai-shorts/[niche]/page.tsx:748` e `:756` usam a cor `--kpl-muted` no divisor da tabela e no rótulo Reviewed. A cor respeita a paleta já definida na página. O modo escuro de desktop mantém a superfície clara existente; o celular usa a superfície escura. Não alterei o sistema geral de temas.

| Estado real | Contraste da data antes → depois | Divisor da tabela antes → depois |
|---|---:|---:|
| Claro · 1920 | 6,22 → 6,43 | 1,18 → 6,43 |
| Claro · 390 | 6,22 → 6,43 | 1,18 → 6,43 |
| Escuro · 1920 | 6,22 → 6,43 | 1,18 → 6,43 |
| Escuro · 390 | 2,97 → 7,17 | 1,31 → 7,17 |

**TESTADO LOCALMENTE · 23/11.** Valores calculados das cores computadas no navegador, incluindo composição alfa do divisor anterior. Texto normal tem referência de 4,5:1 na [WCAG 2.2, contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Para o divisor adotei alvo voluntário de 3:1; isso não significa que toda borda decorativa tenha essa exigência da [regra de contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), nem comprova conformidade da página inteira. Fontes consultadas em 23/11/2026.

**FATO CONFIRMADO · IMPLEMENTADO.** Uma única data ISO, `2026-11-22`, vem de `lib/seo/paginasLote1Paths.ts:9` e gera a data humana em `lib/seo/paginasLote1.ts:105`. O rótulo visível ganhou `<time datetime="2026-11-22">`. `app/sitemap.ts:388` altera somente `/free-ai-shorts/cartoon` de 12/10 para 22/11, dia da resposta substantiva já publicada. O conserto visual de 23/11 não inventa nova revisão de conteúdo. Todos os demais objetos do sitemap foram comparados com a base, sem alterações.

**TESTADO LOCALMENTE.** `scripts/test-cartoon-answer-2311.mjs` renderiza a rota real em harness offline: data humana/ISO, resposta no HTML inicial, todos os parágrafos e tabelas preservados, exatamente uma entrada canônica e todas as outras datas intactas. Cinco mutações devem falhar: data antiga, sitemap antigo, rejuvenescimento dos outros nichos, remoção da marcação de data e remoção da resposta. As cinco falharam como esperado. Cor e CSS são verificados no navegador real, não pelo mock desse teste.

**FATO CONFIRMADO · IMPLEMENTADO.** `scripts/test-story-video-page-0911.mjs` exige as seis perguntas antigas **mais a pergunta literal de comprador publicada**: conjunto exato de sete, sem duplicação; toda resposta estruturada deve existir no texto visível. Mantém VideoObjects históricos, custo calculado, handoff, canonical e limites de continuidade. Os controles Urdu/Reels foram ancorados no pai publicado `b2c24e671`, pois a fixture anterior antecedia mudanças aprovadas nesses controles. A fixture histórica `bb260242a` continua protegendo os vídeos e os CTAs antigos. A volta de H3 foi delimitada à oferta padrão e sua FAQ; o filme grátis tem política independente em `lib/freeFilmEngine.ts` e seu rótulo continua sendo conferido. Não removi o H3 legítimo desse rótulo para satisfazer uma asserção antiga que proibia H3 no HTML inteiro.

**TESTADO LOCALMENTE · prova visual.** 150 fotos depois, em 44 estados: 11 rotas × 1920/390 × claro/escuro; antes do cartoon também nos quatro estados. Topo, tabela por trechos e FAQ aberto. Zero exceções JavaScript e zero rolagem lateral nos 44 estados. No cartoon, parágrafos, tabelas, JSON-LD e largura de rolagem são idênticos antes/depois. A comparação usa componentes reais do Next local, sem mocks de UI. Serviços locais sem credenciais; telemetria bloqueada. Isso não testa login, pagamento ou geração, nem certifica que cada requisição de API local teve sucesso.

**TESTADO LOCALMENTE · arquivos para olhar.** HTML autocontido (fotos incorporadas, CSS inline, sem servidor): `C:/kineo/docs/citacoes-cartoon-2311/provas/COMPARACAO.html`. Folha de contato: `CONTATO-44.jpg`. Fotos originais, JSON de DOM, manifestos e scripts estão na mesma pasta, preservada fora do Git. Resumo numérico versionado: `PROVAS.json`. Esta pasta não fica em `.codex/visualizations`.

| Rota conferida | Estados depois |
|---|---:|
| /free-ai-shorts/cartoon | 4 |
| /ai-video-generator/for/documentary-shorts | 4 |
| /generador-de-videos-de-terror | 4 |
| /faceless-youtube-shorts-generator | 4 |
| /gerador-de-shorts-gratis | 4 |
| /free-ai-shorts/horror | 4 |
| /generador-de-shorts-gratis | 4 |
| /vs/invideo-alternatives-faceless-shorts | 4 |
| /text-to-video-shorts | 4 |
| /ai-video-generator/for/faceless-videos | 4 |
| /ai-video-generator/for/story-videos | 4 |

**TESTADO LOCALMENTE · gates concluídos.** TypeScript bruto: `node node_modules/typescript/bin/tsc --noEmit --incremental false`, saída 0. Comparador `scripts/ci/novos-vermelhos.sh`: 82 guardiões que citam os quatro arquivos de produção, mais o de histórias explicitamente tocado; 45 verdes, 37 já vermelhos na origin/main `b2c24e671`, **zero vermelho novo**, nenhum timeout. As 37 falhas têm a mesma primeira mensagem na base e no ramo; lista, códigos e mensagens em `GUARDIOES.json`. R7/InVideo rodou isolado: caso real verde e 30 mutantes rejeitados. Os outros 81 rodaram com PARALELO=4. Logs integrais foram preservados na pasta de provas. Nenhuma conclusão de que os 37 testes legados estão saudáveis.

**EVIDÊNCIA DE PRODUÇÃO · corte 23/11/2026 05:33:47 BRT.** SELECT agregado em `MEDIDA.md` / `.json` / `.sql`: 448 sessões ChatGPT explícitas em 14 dias completos, 270 em 7 dias completos. Separadas 2.494 e 1.255 sessões sem origem, respectivamente. Cartoon: 95 e 83 sessões; Seedance: zero explícitas nas duas janelas. A janela curta após a publicação tem 1 sessão no site inteiro e zero nas 11 páginas deste lote; não permite concluir impacto. O conserto desta branch continua local.

**O que estava errado ou pode melhorar — FATO CONFIRMADO / TESTADO LOCALMENTE.** A data pouco legível no celular escuro e o carimbo de outubro foram corrigidos; o guardião desatualizado voltou a conferir o contrato aprovado. A prova visual cobre o código local. **QUESTÃO PENDENTE / DESCONHECIDO:** não demonstra mais citações ou visitas causadas pelas mudanças. Não houve nova pesquisa de concorrentes nesta correção; a fonte histórica de preço do InVideo continua separada da revisão editorial, sem revalidar preço por aparência de frescor.

**Próximo passo recomendado — SUGESTÃO.** A CEO deve revisar o antes/depois e o commit, publicar pelo fluxo dela e continuar comparando visitas com origem explícita por página em janelas equivalentes. Sessões, pessoas, cadastro e filme concluído são medidas diferentes; atribuição ausente continua em todas as origens. Não tratar HTML disponível ou fotos locais como resultado comercial.

**FATO CONFIRMADO · uso e limpeza.** Uso semanal do Codex: 48% no início → 52% após a entrega → 53% depois da limpeza, janela de 10.080 minutos, abaixo do teto vigente. A cópia `C:/kineo-wt/citacoes-cartoon-2311`, a junção e o perfil isolado do navegador foram removidos. `C:/kineo/node_modules` permaneceu com 370 entradas antes/depois. A branch final foi selecionada no workspace original. As provas externas ficam preservadas; o SHA final será registrado no quadro local.

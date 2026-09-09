# ChatGPT: queda de cadastros, links reais e teste de recomendação

> **SUPERSESSÃO — 09/09 18h35 BRT:** este é o retrato ANTERIOR à restauração `65cd0c95`/`2857d96f`. A decisão do fundador em `docs/DECISAO-RESTAURACAO-2026-09-09.md` desligou a entrada de $1 e restaurou 30 créditos grátis. A proposta paga da seção 4 e a remoção de “free” NÃO devem ser executadas. Testes de citações/dados continuam históricos, não descrevem a oferta atual. `/llms.txt` conferido agora com HTTP 200 publica 30 créditos e planos $9.90/$19.90/$39.90. Patches locais HomeTopicForm e Kineo1-paid-copy suspensos sem apagar arquivos. Rotina atualizada, mantendo encerramento 10/09 00h30 BRT.

**Data:** 09/09/2026, consultas e navegador entre aproximadamente 17:25 e 17:40 BRT. **Base de código:** `f1248840`. **Estado:** diagnóstico executado; nenhuma alteração de produto, publicação de GPT, contato ou pagamento neste pacote.

## Decisão operacional

**SUGESTÃO / PIVOTAR PARA:** compradores que chegam às páginas públicas já usadas por clientes, não a ponte /make → /go sem audiência comprovada. Não restaurar gratuidade. Não mudar preço. Corrigir primeiro a verdade da página citada e preservar o caminho da ideia até o Studio; depois testar distribuição da proposta paga por resultado. A hipótese de que o fim do grátis causou toda a queda NÃO foi confirmada.

**EVIDÊNCIA DE PRODUÇÃO:** as três contas atribuídas ao ChatGPT em 08/09 têm a origem preservada e passaram por páginas públicas de terror, calculadora e Kineo 1. **CONTRADIÇÃO:** isso não sustenta a afirmação universal de que as pessoas chegam diretamente ao Studio. O Studio é o destino depois do cadastro dessas três, não o primeiro pouso observado.

## 1. As dez perguntas: teste novo, não comparação histórica inventada

**QUESTÃO PENDENTE / DESCONHECIDO:** não foi localizada uma lista anterior das dez perguntas mais geradoras de aquisição nem respostas arquivadas de 05–07/09. Buscas nos diários/docs e log disponível não permitem afirmar que esta bateria já era usada. Tampouco os UTMs revelam a pergunta original de cada cliente. Portanto esta é uma bateria exploratória NOVA, selecionada pelo caso de uso; não são as dez perguntas comprovadamente mais frequentes.

**TESTADO NO PRODUTO CHATGPT — 09/09/2026:** dez conversas temporárias independentes no Chrome do fundador; UI em português, modo `Instantânea`, personalização desativada. A própria tela declarou que ignorava memória, plugins e instruções personalizadas. Perguntas em inglês; nenhuma contém Kineo. Respostas completas, com links de fontes, lidas pela árvore acessível. Não foi identificado o nome exato do modelo; não chamar isso de amostra representativa dos EUA nem teste de todos os modelos. Não foi feita API simulando ChatGPT. Nenhum link para Kineo foi clicado nesta bateria, evitando criar falso visitante do canal. Abas de teste fechadas ao final.

| # | Pergunta exata | Cinco opções principais, na ordem exibida | Kineo / posição / preço |
|---|---|---|---|
| 1 | What are the best free AI video generators for YouTube Shorts? Give me five options, their free limits, and website links. | Pika; Runway; InVideo AI; Adobe Firefly/Express; Canva | Ausente / não aplicável / não citado |
| 2 | How can I turn my script into a complete faceless video for free, including voiceover and captions? Recommend five websites with links. | CapCut; Fliki; InVideo AI; Kapwing; VEED | Ausente / não aplicável / não citado |
| 3 | What are the best free AI tools to create TikTok videos without showing my face? Recommend five with links and explain their limits. | CapCut; Canva; InVideo AI; HeyGen; VEED | Ausente / não aplicável / não citado |
| 4 | I have a 60-second horror story script. What are five good websites to turn it into a narrated YouTube Short with captions? Include prices and links. | Fliki; InVideo AI; VEED; Pictory; CapCut | Ausente / não aplicável / não citado |
| 5 | What is the cheapest way to make complete 60-second AI Shorts with narration and captions? Compare five tools by cost per finished video and link to them. | Pictory; ClipIA; Fliki; InVideo AI; HeyGen | Ausente / não aplicável / não citado |
| 6 | I wrote a YouTube Shorts script in ChatGPT. Which five tools can turn it into a finished video with voiceover and subtitles? Include entry prices and links. | InVideo AI; VEED; Fliki; Pictory; CapCut | Ausente / não aplicável / não citado |
| 7 | What are five affordable alternatives to InVideo AI for complete faceless YouTube Shorts? I am willing to pay. Include monthly prices and website links. | AutoShorts.ai; Faceless.video; Fliki; AITuber; Revid.ai | Ausente / não aplicável / não citado |
| 8 | I have a budget of $30 a month for narrated faceless Shorts. Which five AI video tools would you recommend for ready-to-publish videos? Include prices and links. | AutoShorts.ai; Clippie AI; InVideo AI; Pictory; Fliki | Ausente / não aplicável / não citado |
| 9 | Where can I make a complete 60-second video using Seedance with narration, music and captions, without assembling clips myself? Recommend five options and include prices and links. | HeyGen; InVideo AI; Seedance.tv; AKOOL; AI Actors | Ausente / não aplicável / não citado |
| 10 | Which five AI Shorts makers let me try a complete narrated video at low cost before committing to a monthly plan? Explain the trial charge, renewal price, and links. | Kineo; ShortFast; Nexclip; JayMaker; Kineclip | **Presente / 1ª / $1 por 7 dias, 80 créditos, depois $19/mês (renovação errada)** |

**EVIDÊNCIA OBSERVADA:** Q10 citou `https://usekineo.com/ai-video-generator/kineo-1?utm_source=chatgpt.com`, recomendou Kineo primeiro também na conclusão e mencionou 5 créditos por filme de 60 s. Isso prova uma recomendação nessa consulta paga, não comprador, clique ou receita. Os preços/capacidades dos concorrentes na resposta NÃO foram auditados; não reutilizar essas respostas como comparativo publicitário.

**CONTRADIÇÃO / VERIFICAÇÃO DIRETA:** GET HTTPS da página citada às **20:36:18 UTC**, status 200, `x-vercel-cache: HIT`, contém renovação **$29/month**, mas ainda tem H1 **“Kineo 1 — the free AI video generator that finishes the whole Short”**. Fonte no código: `app/ai-video-generator/[engine]/page.tsx:109`; pergunta antiga de gratuidade em `:116`. O FAQ responde com a oferta paga. O mecanismo de busca devolveu uma cópia declarada como rastreada três dias antes, ainda com “25 free credits” e preço antigo em outras superfícies. Não confundir essa cópia do índice com o HTML servido hoje. A resposta de Q10 com $19 pode envolver fontes/caches desatualizados ou síntese do modelo; não foi provada a origem exata do erro.

**HIPÓTESE A — INCONCLUSIVA:** ausência nas perguntas gratuitas e presença na pergunta de teste barato são compatíveis com mudança de intenção, mas sem baseline não provam perda de posição, causa da queda ou efeito de remover “free”. A hipótese de que o ChatGPT deixou totalmente de recomendar Kineo é contrariada por Q10. Não usar 1/10 como participação de mercado.

## 2. O que mudou do lado Codex em 08/09

**FATO CONFIRMADO EM GIT:** `7a7b259c`, publicado pelo publicador às 12:30 BRT, aplicou o pacote Codex: oferta contextual em History e /go, componente PostFilmCreatorOffer e helper. O diff de `/go/[token]/page.tsx` substituiu a frase de teste gratuito por aviso de método de pagamento e adicionou a oferta; não alterou o transporte de origem em `lib/gptHandoff.ts`. Os registros `bbe40dd7`, `c9a145ad` e `5a3c051f` documentam deploy/exposição/fechamento. A documentação de 08/09 admite falha de coordenação: o PEDIDOS havia ficado só local e o pacote demorou a chegar ao publicador.

**FATO CONFIRMADO / SEPARAÇÃO DE AUTORIA:** as mudanças gerais de entrada, preço, fatos públicos e /llms foram implementadas pela pista da casa (`89a65eb9`, `2e65d5cb`, `98c633ac`, `f8422d35`, entre outros); não apresentar isso como publicação de um novo GPT feita por esta pista.

**QUESTÃO PENDENTE:** não há nesta auditoria confirmação do estado publicado do GPT no editor da OpenAI, nem histórico de alterações de suas instruções fora do Git. Git não prova que o texto foi colado/publicado. Não afirmei “GPT atualizado” ou “nenhum ajuste fora do Git ocorreu”.

## 3. Atribuição, coorte e páginas reais

**EVIDÊNCIA DE PRODUÇÃO — SELECT em 09/09:** fonte `profiles`, filtro externo canônico de `lib/internalAccounts.ts`, dia BRT; 09/09 cortado às 17h, demais dias completos nesta primeira tabela.

| Dia BRT | Cadastros externos totais | `utm_source=chatgpt` | `signup_utm_source` ChatGPT OU referrer ChatGPT |
|---|---:|---:|---:|
| 03/09 | 41 | 12 | 12 |
| 04/09 | 29 | 13 | 14 |
| 05/09 | 30 | 16 | 16 |
| 06/09 | 36 | 24 | 24 |
| 07/09 | 24 | 12 | 14 |
| 08/09 | 8 | 3 | 3 |
| 09/09 até 17h | 8 | 4 | 4 |

**EVIDÊNCIA DE PRODUÇÃO — janela igual 00h–17h BRT em cada dia:** landing_session_started com origem/referrer ChatGPT, `is_bot != true`, excluídas contas e sessões internas identificáveis. Anônimos não vinculados continuam anônimos; não chamar sessão de pessoa ou garantir ausência de bots não detectados. Numerador de cadastro é `profiles.utm_source=chatgpt`.

| Dia | Sessões registradas ChatGPT | Cadastros ChatGPT na mesma janela |
|---|---:|---:|
| 03/09 | 24 | 5 |
| 04/09 | 18 | 11 |
| 05/09 | 45 | 13 |
| 06/09 | 43 | 15 |
| 07/09 | 36 | 9 |
| 08/09 | 17 | 3 |
| 09/09 | 11 | 4 |

**LIMITE:** estas colunas não são uma coorte vinculada e NÃO autorizam calcular conversão dividindo uma pela outra. Confirmam queda no sinal registrado de entrada, mas não o enunciado “tráfego humano caiu 4x”. A existência de preço público antes do cadastro também impede descartar desistência pré-cadastro motivada pela oferta. Não há controle que isole preço de distribuição, atribuição, tempo ou mudança da audiência.

**EVIDÊNCIA DE PRODUÇÃO — amostra dos três cadastros de 08/09, sem identificadores pessoais:**

| Amostra | Página observada no evento anterior ao cadastro | Campanha no cadastro | Destino autenticado |
|---|---|---|---|
| A | `/free-ai-shorts/horror` (`organic_cta_clicked`) | `push63_niche_horror` | `/studio/create` |
| B | `/cheapest-ai-shorts-maker` (`landing_session_started`, CTA) | `push77_short_cost_calculator` | `/studio/create` |
| C | `/ai-video-generator/kineo-1` (`landing_session_started`, CTA) | `seo_engine_kineo-1` | `/studio/create` |

**FATO / LIMITE:** nas três, o CTA anterior registra `utm_source=chatgpt.com` e o perfil normaliza para `chatgpt`. São caminhos observados, não URLs iniciais completas recuperadas: não há evidência de todos os parâmetros originais. Na amostra A o primeiro landing_session_started disponível aparece no signup com origem nula, enquanto CTA e perfil têm ChatGPT; isso prova cobertura incompleta desse beacon para essa sessão, não perda do cadastro.

**EVIDÊNCIA DE PRODUÇÃO:** `gpt_handoffs`: 16 linhas, 0 vinculadas a user_id, 2 clicked_at; mínimo **07/09 00:15:49 UTC**, máximo **07/09 06:30:29 UTC**. Horários SQL diferem ligeiramente do texto encaminhado. Diário `SPRINT-GPT-LOJA-2026-09-06.md` declara que as 16 eram testes próprios. Sem atribuir pessoa a NULL ou clique a comprador; não mexer mais nessa ponte como ação de venda sem nova audiência.

**FATO CONFIRMADO / AUDITORIA DE LINKS NÃO É 100% VERDE:**

- `lib/acquisitionSource.ts` normaliza `chatgpt` e `chatgpt.com`, e lê o referrer externo. Isso está coerente com as três contas observadas.
- `lib/gptHandoff.ts:408,442–445,547`: a ponte usa `chatgpt_gpt`, `assistant_link` e `paste_page`, não `chatgpt`. O exemplo em `lib/kineoFacts.ts:897` não traz UTM. Não trocar tudo por `chatgpt`: assistant_link pode vir de Claude/Gemini e a alteração inventaria origem. Na janela igual, ZERO cadastros nas três etiquetas alternativas; isso não explica a queda observada.
- `docs/GPT-KINEO-VIDEO-MAKER.md:120,128,220` ainda contém instruções copiáveis de filme grátis; `:235` usa `utm_source=chatgpt_gpt`. Não usar esse documento para publicar/atualizar o GPT. A nova documentação contratual do Claude deve explicitamente substituí-lo.
- Links de páginas públicas da Kineo não devem TODOS ganhar utm_source=chatgpt: cliques internos precisam preservar a origem real, não fabricá-la. Links preparados especificamente para distribuição no ChatGPT devem levar `utm_source=chatgpt` e campanha separada; links gerados espontaneamente por terceiros não estão sob nosso controle.

## 4. Proposta de recomendação paga — não validada comercialmente

**SUGESTÃO:** “Turn your script into a narrated Short with footage, music and captions. Try Kineo Creator for $1 for 7 days with 80 credits. It renews at $29/month unless you cancel before renewal. Kineo 1 and Seedance are included.”

**SUGESTÃO CONDICIONAL:** se incluir quantidade, escrever “up to 16 Kineo 1 videos of 60 seconds at 5 credits each, if all 80 credits are used for those videos”; não prometer 16 Seedance, uso de todo motor, export específico não conferido ou receita do canal. Valores são fotografia de 09/09; implementação importa as fontes canônicas, nunca literais.

**PRÓXIMA AÇÃO / DONOS:**

1. **Codex:** próxima mudança mínima deve eliminar o H1 gratuito contraditório da página Kineo 1 citada em Q10, com revisão da tabela pública compartilhada, não nova landing nem troca de vídeos. Revalidar título/FAQ/meta/CTA contra a mesma oferta antes de propor distribuição. Este pacote é somente diagnóstico; não implementa essa alteração.
2. **Claude:** contrato das 21:30 deve usar caminho direto com UTM e preservação do roteiro; marcar o documento antigo como substituído e confirmar separadamente o que está publicado no GPT. Não investir na ponte sem plateia.
3. **Ambos:** separar retomada dos interessados que encontraram o checkout quebrado da aquisição nova. As seis pessoas já avisadas NÃO recebem outra mensagem. Para novos compradores, priorizar intenção paga de roteiro→Short e demonstração existente do resultado incluso; medir clique qualificado → checkout funcional → payment_success. Não prometer vendas pelo número de alterações.

**ESTADO:** typecheck da base `f1248840` passou em 09/09, sem emissão/incremental. Nenhum render, débito, grant, e-mail, anúncio, recrawl ou atualização de GPT executado. A bateria de dez respostas é evidência de recomendação, não resultado de receita. O encerramento da sprint não foi renovado.

# Obra 3 · fonte dos cinco nichos · 24/11/2026

**EVIDÊNCIA DE PRODUÇÃO.** SELECT somente agregado, janela [2026-10-25T05:05:04.514356+00:00, 2026-11-24T05:05:04.514356+00:00). Supabase, projeto cqqukkvjjrguayiyjvhh. Exclusão de perfis internos conforme o método anterior da FILA 4. Nenhuma identidade ou texto pessoal exportado.

| Coorte de pouso explícito | Sessões de entrada | Pessoas novas vinculadas | Com pedido completed na leitura | Sessões com utm_term |
|---|---:|---:|---:|---:|
| ChatGPT | 1.045 | 408 | 150 | 0 |
| Bing sem rótulo CPC | 383 | 15 | 10 | 0 |
| Campanha marcada Bing/CPC | 63 | 11 | 3 | 63 |

**LIMITES DA MEDIDA.** Sessão = primeira landing_session_started por session_id na janela; não é pessoa. Cadastro = perfil criado após o pouso, vinculado pela única identidade posterior da sessão; múltiplas identidades ficam sem atribuição e cada pessoa só é atribuída uma vez. Excluídos is_bot=true e origem interna reconhecida; is_bot=false não certifica humano. Completed = pedido criado após cadastro, ainda na janela e atualmente completed; sem timestamp histórico da conclusão. Nenhum pagamento medido. CPC é rótulo observado, não prova de gasto executado. Origem não gravada não foi chamada de ChatGPT.

**FATO CONFIRMADO.** components/SourceCapture.tsx:91–134 transforma o referrer em origem/host no evento de pouso; não grava a pergunta. Mas existe outra fonte: lib/analytics.ts:392 guarda o referrer externo e :473 envia signup_referrer; lib/acquisitionSource.ts:118 conserva a URL, limitada a 300 caracteres. app/api/track-signup-source/route.ts:93 e :172 sanitiza e persiste esse campo. Portanto, ausência de utm_term no pouso, sozinha, não bastava para concluir o bloqueio.

**EVIDÊNCIA DE PRODUÇÃO — fonte adicional conferida.** Nos perfis novos da mesma janela, origem explícita ChatGPT soma 385 perfis (380 sem medium, cinco com medium=email); três têm signup_referrer externo. Bing soma 26 perfis (11 CPC, cinco organic, um seo, nove sem medium); 25 têm referrer externo. **Zero signup_referrer com query string; zero parâmetro q/query/search_query/question/prompt não vazio**, em todas essas classes. Somente contagens foram retornadas, sem URLs nem termos. Esta é uma coorte por atribuição persistida no perfil; é diferente da ligação sessão→cadastro acima e não deve ser somada ou tratada como divergência de conversão.

**FATO CONFIRMADO.** O handoff do conector contém script, topic e opções do filme, não a pergunta que levou ao achado. lib/gptHandoff.ts:376 define o contrato; app/api/gpt/handoff/route.ts:154 recebe topic e :184 registra contagens/opções e has_topic. O esquema de gpt_handoffs confirma topic/script, sem campo de consulta de busca. Tema/roteiro do filme é material pessoal de criação; não o reclassifiquei como pergunta de comprador nem exportei esse conteúdo.

**EVIDÊNCIA DE PRODUÇÃO.** Os termos agregados presentes são palavras de campanha, todos com medium=cpc (ex.: ai video maker, ai film generator, text to video ai), não uma pergunta orgânica registrada. Até o rótulo utm_term pode ser palavra configurada de campanha, não a consulta efetiva digitada: lib/growth/paidClickAttribution.ts:67. O material integral de cobertura e entradas está em AGREGADOS-ORIGENS.json. Valores raros/pessoais não foram exportados.

**BLOQUEADO.** Não existe ligação demonstrada entre cinco perguntas reais de ChatGPT/Bing e novos cadastros nesta leitura. As consultas que agentes fizeram em BING.md/PERGUNTAS.md não provam demanda de clientes. Não construir cinco páginas novas com perguntas inventadas para preencher a fila.

**PRÓXIMO PASSO RECOMENDADO.** A CEO pode confrontar as consultas agregadas do Bing AI Performance/Search Performance com as entradas já observadas; isso ainda exige distinguir intenção de busca de cadastro atribuído. Se aprovar escolher por evidência de página/nicho em vez de pergunta exata vinculada, as entradas já existentes de cartoon, horror e story-videos são candidatas a aprofundamento, não cinco novas páginas automaticamente. Enquanto esse pré-requisito não existe, avançar às obras 1, 2 e 4 nas páginas existentes, preservando conteúdo citado.

**ESTADO.** Leitura agregada, sem produto novo, publicação, gasto, render ou banco escrito. SQLs em CONSULTAS.sql são modelos parametrizados: a lista de IDs internos deve ser resolvida privadamente pela mesma política canônica; nenhum identificador foi incluído no documento.

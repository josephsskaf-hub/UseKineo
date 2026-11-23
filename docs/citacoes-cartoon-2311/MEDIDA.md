# Visitas por entrada · leitura de 23/11/2026

**EVIDÊNCIA DE PRODUÇÃO.** SELECT somente leitura em Supabase `cqqukkvjjrguayiyjvhh`, corte 23/11/2026, 05:33:47 BRT. Origem explícita: `referrer_host` normalizado em `chatgpt`, `chatgpt.com`, `www.chatgpt.com`, ou `utm_source ILIKE '%chatgpt%'`. Sem origem registrada fica em **todas as origens**, nunca em ChatGPT. A inferência `ai_assistant_likely` não conta.

**FATO CONFIRMADO — `components/SourceCapture.tsx:85`.** O evento ancora a primeira entrada por aba, limitado por sessionStorage; não é pessoa nem pageview de toda navegação. A consulta deduplica `session_id` dentro de cada janela, exige `metadata.is_bot='false'` e exclui sessões com conta interna reconhecida pelos eventos posteriores, conforme `lib/internalAccounts.ts:24` e `:38`. Um visitante anônimo da casa pode não ser reconhecido. IDs não foram exportados: só contagens e caminhos públicos.

**EVIDÊNCIA DE PRODUÇÃO — janelas declaradas, BRT.** 14 dias completos: 09/11 00:00 até 23/11 00:00 exclusivo. Últimos 7 completos: 16/11 00:00 até o mesmo corte. A coluna de 7 dias está contida na de 14: não somar. Atores identificados são usuários distintos vinculados a exatamente uma identidade na sessão; não equivalem a toda a audiência. Não somar atores entre páginas.

| Página de entrada | ChatGPT 14d (sessões) | ChatGPT 7d (sessões) | Atores identificados 14d | Todas as origens 14d | Sem origem 14d |
|---|---:|---:|---:|---:|---:|
| /free-ai-shorts/cartoon | 95 | 83 | 37 | 109 | 14 |
| /text-to-video-shorts | 28 | 8 | 15 | 98 | 3 |
| /ai-video-generator/for/urdu | 23 | 10 | 12 | 27 | 4 |
| /free-ai-shorts/horror | 23 | 11 | 6 | 30 | 5 |
| /gerador-de-shorts-gratis | 12 | 5 | 10 | 12 | 0 |
| /ai-video-generator/seedance | 0 | 0 | 0 | 28 | 25 |
| /ai-video-generator/for/story-videos | 33 | 12 | 21 | 35 | 2 |
| /ai-video-generator/for/faceless-videos | 5 | 2 | 3 | 7 | 2 |
| /ai-video-generator/for/documentary-shorts | 2 | 2 | 1 | 3 | 1 |
| /generador-de-videos-de-terror | 0 | 0 | 0 | 2 | 2 |
| /faceless-youtube-shorts-generator | 0 | 0 | 0 | 1 | 1 |
| /generador-de-shorts-gratis | 0 | 0 | 0 | 3 | 3 |
| /vs/invideo-alternatives-faceless-shorts | 0 | 0 | 0 | 1 | 1 |
| /how-much-do-instagram-reels-pay | 50 | 33 | 0 | 67 | 15 |
| / | 99 | 65 | 33 | 637 | 373 |

**EVIDÊNCIA DE PRODUÇÃO — controles globais.** Os totais abrangem todo o site; a tabela acima é uma seleção de páginas. A ausência de grupo para uma página elegível representa zero sessões filtradas nessa janela, não estimativa.

| Janela | Sessões deduplicadas antes dos filtros | Bots | Internas reconhecidas | Todas as origens filtradas | ChatGPT explícito | Sem origem | Atores ChatGPT identificados |
|---|---:|---:|---:|---:|---:|---:|---:|
| ultimos_14d_completos | 6542 | 1625 | 350 | 4567 | 448 | 2494 | 164 |
| ultimos_7d_completos | 2734 | 683 | 147 | 1904 | 270 | 1255 | 89 |
| antes_mesmo_relogio | 49 | 2 | 1 | 46 | 6 | 35 | 2 |
| depois_deploy | 53 | 5 | 5 | 43 | 1 | 31 | 0 |

**EVIDÊNCIA DE PRODUÇÃO — leitura curta após publicação.** A CEO registra `00d58ecd2` às 01:51:10 BRT de 23/11. Comparei 23/11 01:51:10 → 23/11/2026, 05:33:47 com os mesmos horários de 22/11. Site inteiro: **6 → 1 sessões ChatGPT**. A única depois entrou por `/how-much-do-instagram-reels-pay`; nas 11 páginas conferidas, **3 → 0**: story-videos 2 → 0 e cartoon 1 → 0, demais 0 → 0. São **3 h 42 min 37 s** por janela. Isso descreve registros; não sustenta efeito causal, recuperação ou queda das alterações de conteúdo. Dias da semana também diferem. O conserto desta branch segue local e não participou dessa exposição.

**QUESTÃO PENDENTE / DESCONHECIDO.** Citação textual real pelo ChatGPT, referrers omitidos pelo navegador e impacto das mudanças permanecem desconhecidos. Esta leitura de acompanhamento mede visitas, sem inferir cadastro, primeiro filme ou receita. A medição original de cadastro/primeiro filme continua documentada em `docs/citacoes-2011/MEDIDA.md`, para sua janela histórica; não juntar coortes. `MEDIDA.json` guarda o retorno agregado; `MEDIDA.sql` fixa o corte para reprodução.

**SUGESTÃO.** Preservar as páginas citadas, publicar o conserto após revisão da CEO e acompanhar por entrada em janelas completas e equivalentes. Validar conversão e filme concluído em coortes identificadas separadamente.

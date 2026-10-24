# KINEO-IDIOMAS-FORMATOS-2410 — idiomas

**FATO CONFIRMADO / IMPLEMENTADO — consulta 24/10/2026.** O catálogo compartilhado contém 37 idiomas com boost explícito no [schema oficial fal Speech 2.8 HD](https://fal.ai/models/fal-ai/minimax/speech-2.8-hd/api), mais Urdu/Bengali preservados como legados. Fonte de código: `lib/textLanguage.ts:29`. `auto` é um modo do provedor, não um idioma selecionável.

**FATO CONFIRMADO / IMPLEMENTADO.** Filme já lê esse catálogo no Studio; Cartoon usa os mesmos códigos para validação, roteiro e seleção. Studio Ads escolha recebe os mesmos códigos no patch de formatos. A interface editorial continua com seus idiomas próprios. Fontes: `app/(dashboard)/studio/StudioClient.tsx:1345`, `lib/kidsCartoon/kidsCartoon.ts:49`, `components/kidsCartoon/KidsCartoonTemplate.tsx:456`.

**FATO CONFIRMADO / IMPLEMENTADO.** Novas línguas do Filme usam MiniMax primária; cache carrega modelo/voz corretos. Línguas antigas conservam o caminho de voz anterior. Ads escolha transmite a língua até o corpo TTS, cujo boost vem do catálogo; não se envia o código ISO ao provedor. Fontes: `lib/compose.ts:565`, `lib/compose.ts:1530`, `lib/ads/cena/runtime.ts:64`, `lib/ttsFallback.ts:70`.

**FATO CONFIRMADO / IMPLEMENTADO.** Os códigos abertos abaixo têm enum explícito no schema fal consultado em 24/10/2026. A tabela vem das linhas executadas do catálogo, não de uma segunda lista de produto.

| Código | Idioma no seletor | Boost MiniMax | Fonte de legenda |
|---|---|---|---|
| en | English | English | Montserrat |
| pt | Português | Portuguese | Montserrat |
| es | Español | Spanish | Montserrat |
| hi | हिन्दी | Hindi | Noto Sans Devanagari |
| fr | Français | French | Montserrat |
| de | Deutsch | German | Montserrat |
| it | Italiano | Italian | Montserrat |
| nl | Nederlands | Dutch | Montserrat |
| pl | Polski | Polish | Montserrat |
| tr | Türkçe | Turkish | Montserrat |
| ru | Русский | Russian | Montserrat |
| uk | Українська | Ukrainian | Montserrat |
| ar | العربية | Arabic | Noto Sans Arabic |
| id | Bahasa Indonesia | Indonesian | Montserrat |
| vi | Tiếng Việt | Vietnamese | Montserrat |
| zh | 普通话 | Chinese | Noto Sans SC |
| yue | 粵語 | Chinese,Yue | Noto Sans TC |
| ja | 日本語 | Japanese | Noto Sans JP |
| ko | 한국어 | Korean | Noto Sans KR |
| th | ไทย | Thai | Noto Sans Thai |
| ro | Română | Romanian | Montserrat |
| el | Ελληνικά | Greek | Noto Sans |
| cs | Čeština | Czech | Montserrat |
| fi | Suomi | Finnish | Montserrat |
| bg | Български | Bulgarian | Montserrat |
| da | Dansk | Danish | Montserrat |
| he | עברית | Hebrew | Noto Sans Hebrew |
| ms | Bahasa Melayu | Malay | Montserrat |
| sk | Slovenčina | Slovak | Montserrat |
| sv | Svenska | Swedish | Montserrat |
| hr | Hrvatski | Croatian | Montserrat |
| hu | Magyar | Hungarian | Montserrat |
| no | Norsk bokmål | Norwegian | Montserrat |
| sl | Slovenščina | Slovenian | Montserrat |
| ca | Català | Catalan | Montserrat |
| nn | Norsk nynorsk | Nynorsk | Montserrat |
| af | Afrikaans | Afrikaans | Montserrat |

**FATO CONFIRMADO / IMPLEMENTADO.** Urdu (`ur`, Noto Sans Arabic) e Bengali (`bn`, Noto Sans Bengali) continuam aceitos por compatibilidade; não constam desse enum MiniMax e usam `auto` se passam pela fal. O Filme mantém o provedor primário antigo nesses dois códigos. Fonte: `lib/textLanguage.ts:178`, `lib/textLanguage.ts:181`.

**QUESTÃO PENDENTE / DESCONHECIDO.** Boa qualidade vocal por língua não foi ouvida nem validada em produção nesta tarefa: chamadas pagas foram proibidas. A [lista oficial MiniMax de IDs](https://platform.minimax.io/docs/faq/system-voice-id), consultada em 24/10/2026, fornece as vozes usadas. Onde ela não publica voz nativa correspondente, o código usa uma voz multilíngue documentada com boost da língua; idade e naturalidade não são resultados medidos. Fonte: `lib/textLanguage.ts:218`.

**FATO CONFIRMADO / IMPLEMENTADO.** CJK/tailandês usam segmentação lexical Unicode para não contar uma frase inteira como uma palavra. Fontes novas por escrita: SC/TC/JP/KR/Thai/Hebrew; grego usa Noto Sans. As famílias existem no [catálogo oficial Google Fonts Noto](https://fonts.google.com/noto). Fontes: `lib/textLanguage.ts:185`, `lib/textLanguage.ts:76`.

**QUESTÃO PENDENTE / DESCONHECIDO.** Calibração auditiva do ritmo e render final do provedor em CJK/tailandês, RTL e caracteres complexos continuam pendentes. Os testes offline conferem unidades, preservação do texto, família da fonte e corpo enviado; não certificam um vídeo remoto.

**FATO CONFIRMADO.** Nenhum dos 37 idiomas explícitos do schema foi excluído. Persa, tâmil e filipino não foram adicionados: não figuram no enum fal verificado. Não se conclui que nenhum outro serviço MiniMax os suporte. Motores com voz própria mantêm a limitação en/pt/es: `lib/textLanguage.ts:81`.

**TESTADO LOCALMENTE — 24/10/2026.** `node --require C:/kineo2410/offline-preload.cjs scripts/test-idiomas-2410.mjs`: quatro contratos raw passaram; cinco mutantes aplicados foram rejeitados; clientes externos/rede bloqueados. Tipo e bateria integrada são registrados no relatório final da tarefa.

**SUGESTÃO — próximo passo recomendado.** Revisar o [antes/depois estático](previews/idiomas-2410.html) e, numa rodada autorizada de render, ouvir as línguas prioritárias com falantes competentes antes de anunciar naturalidade comprovada. Nesta entrega, estado: preparado e testado offline; publicação e qualidade auditiva desconhecidas.

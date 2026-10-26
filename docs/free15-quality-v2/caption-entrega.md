# Legenda legível, filme preservado — 26/10/2026

**DECISÃO APROVADA:** após ouvir o teste próprio C, Joseph disse que a voz e as imagens estavam boas. A solução anterior que recusava o filme foi substituída localmente. O erro observado é a legenda corrompida; a divergência entre ASR e roteiro não prova voz defeituosa. Nenhum novo render, ASR, modelo, retry, crédito ou gasto nesta correção.

## Evidência e implementação

**EVIDÊNCIA DE PRODUÇÃO — teste próprio, 26/10/2026:** C tinha roteiro normal em português, mas o ASR já pago trouxe palavras como “faceboard de Persefuro”. O fundador aprovou a voz após escutar. Os três sidecars A/B/C foram recuperados de cache existente pelo responsável do teste. Fixtures aqui contêm só texto/timestamps próprios, sem cliente, IDs, URL ou credencial.

**IMPLEMENTADO LOCALMENTE:** lib/captionEvidenceGuard.ts mantém a comparação pura e conservadora de roteiro realmente enviado ao TTS com ASR medido. Em Seedance15, voz própria, discrepância forte e duração real válida, selectOwnTtsCaptionSource chama o builder síncrono já existente sem palavras Whisper para obter o fallback proporcional canônico. Copia SOMENTE os elementos de legenda (texto nas trilhas 5/7) para a montagem original. Não altera lib/compose.ts.

**FATO CONFIRMADO:** lib/compose.ts:2426 e :2500 também usam Whisper para cortes de imagem. Por isso não removemos Whisper da montagem original. Áudio, cortes, clips, música, SFX, watermark e demais elementos permanecem iguais. O fallback usa realAudioDuration (lib/compose.ts:2911), e a decoração Faceless já existente recebe null para não reinserir as palavras corrompidas. Seu relato de legenda passa a proporcional; demais relatos permanecem originais.

**IMPLEMENTADO LOCALMENTE:** app/api/compose/route.ts calcula a comparação antes de corrigir grafia, troca legendas depois de montar e aplicar Faceless, antes do envio único ao renderizador. Resposta e evento de tempo já existente recebem caption_alignment com source=canonical_tts_script, timing=approximate, evidence_status=unverified. Nenhum texto pessoal é incluído nesse metadado. Cache/ASR bruto continuam intactos; nenhuma recusa ou estorno decorre dessa discrepância.

## Provas offline

**TESTADO LOCALMENTE — 26/10/2026:** caption-test.mjs executa helper, builder completo e Faceless reais, mais trechos reais da rota extraídos por AST. Passaram 21 grupos e nove mutantes. TypeScript bruto passou.

| Caso | Resultado |
|---|---|
| A, ASR próprio já pago | Caminho e montagem inteiros idênticos |
| B, 6.000/6 mil e Maia/Maya | Comparação inconclusiva; montagem inteira idêntica |
| C, 41 tokens e cobertura 58,5% | Todas as palavras do roteiro correto na ordem, incluindo “A pena é a chave”; legenda termina em 15,336 s; sincronização aproximada |
| Áudio/imagem de C | Todos os elementos fora da legenda, inclusive cortes, URLs, SFX, música e watermark, iguais ao original |
| ASR/cache | Texto e timestamps originais intactos |
| Escopo externo/avatar/serviço/outro motor/duração | Caminho existente preservado |
| Duração ausente, fallback vazio ou erro local | Inconclusivo; preserva montagem existente, sem inventar prova ou abortar filme |

**TESTADO LOCALMENTE:** revisão independente não encontrou bloqueio. Mutantes detectam bypass do fallback, uso de áudio externo, ASR ausente marcado consistente, roteiro sobrescrevendo evidência, transcrição ruim reutilizada, áudio substituído junto, duração pedida usada como medida e rota que ignora a seleção.

## Limites e integração

**QUESTÃO PENDENTE / DESCONHECIDO:** a prova executa montagem real offline, não um MP4 novo. Não demonstra precisão palavra a palavra, nem taxa de acerto nos demais idiomas. Não declara corrigidos vídeos já entregues. O texto canônico é conhecido por ter sido enviado ao TTS; sua sincronização aproximada não certifica independentemente cada palavra audível.

**FATO CONFIRMADO:** missing/inválido, textos curtos, datas/decimais/ordinais, escrita não latina e idiomas não calibrados continuam unverified. A/B não mudam. Nunca inventar que a ausência de evidência equivale a qualidade aprovada. Se o fallback local falhar, a montagem anterior é preservada e o motivo fica explícito.

**PREPARADO / TESTADO LOCALMENTE:** publicação fica com o responsável. Commit anterior de recusa permanece no histórico local, superado por esta correção; não publicar aquele estado isolado. Infra histórica usa nova folha reversível sem regravar os manifests anteriores. Sem novo render ou custo autorizado.

**TESTADO LOCALMENTE — pacote final:** branch `codex/caption-canonico-2610`, base publicada `464bc9d19dbc23a34b08092b7db6c0f5128b7619`. Os 73 comandos atuais do workflow passaram; quatro são controles `--mutant` que devem terminar com erro. A folha nova `desfaz-caption-canonico-2610` passou 113 verificações e 30 mutantes; a camada histórica de vídeo passou 470/253 e os 48 manifests já publicados permanecem iguais. Testes atuais leem produto bruto; a projeção exata é exclusiva das provas históricas. TypeScript terminou com código zero. A branch histórica com a proposta abandonada foi preservada e não é ancestral deste pacote.

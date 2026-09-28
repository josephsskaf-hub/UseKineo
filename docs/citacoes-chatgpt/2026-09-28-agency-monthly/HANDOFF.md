# S24-02 — caminho mensal na entrada de agências

**AUTORIZAÇÃO DIRETA / NOVA — 28/09/2026:** sprint Citações renovada pelo fundador até29/09 23:31UTC. Superfície livre de aquisição `app/ai-shorts-for-agencies/page.tsx`, independente da entrega S24-01. Base f834c583. Contrato anterior à edição no arquivo privado CONTRATO-S24-02.md. Master CHECKPOINT-24H-1000.json de23:41 mantém descoberta ChatGPT com Citações; nenhuma comparação de concorrente foi tomada.

**FATO CONFIRMADO / IMPLEMENTADO:** o corpo da página tinha apenas os caminhos pacotes, exemplos e planejamento gratuito (`page.tsx:143` na base). Acrescentado link contextual `/pricing` para quem produz Shorts todo mês, abaixo dos CTAs preservados. FAQ visível e JSON-LD leem a mesma resposta sobre assinatura mensal separada dos pacotes avulsos (`page.tsx:58` no candidato). Não houve mudança em preço, oferta, pacote, calculadora, compra, briefing, header ou rodapé.

**HIPÓTESE:** evitar que o visitante de produção recorrente suponha que somente lotes avulsos estão disponíveis. Evidência histórica da Master, corte28/09 20:08:30UTC, registra primeira assinatura com entrada agências; não demonstra que esta lacuna causou perda ou que a alteração vai aumentar conversão. Amostra comercial começa após deploy confirmado; fonte/transação externa deduplicada permanece com Master/Claude.

**TESTADO LOCALMENTE:** guardião específico renderiza a página antes/depois, preserva integralmente o HTML fora da nova linha/FAQ, verifica oferta/metadata inalteradas, FAQ visível igual ao JSON-LD e executa o handler real OrganicCtaLink. Evento existente `organic_cta_clicked`, source `ai_shorts_for_agencies`, placement `hero_monthly_plans`, destino `/pricing`, navegação nativa sem bloqueio e sem UTM artificial. Typecheck e comparação completa da suíte ainda pendentes neste registro.

**GATE VISUAL / LOCAL:** comparativo autocontido privado `sprint24h-20260928-2331/preview-agency/antes-depois.html`: introdução completa e FAQ completa, desktop1040/mobile390, Arial fallback, FAQ expandida apenas na revisão. Sem rede, telemetria ou pagamento. Revisão visual humana ainda não confirmada; não contornar bloqueio anterior de file. Mesmo bloqueio crítico do renderer Ads da S24-01, sem repetir pedido ou editar área do dono.

**NÃO ENFILEIRADO / NÃO PUBLICADO:** exposição e primeiras assinaturas atribuíveis DESCONHECIDAS. Não é nova página ou campanha. Parar em conflito de dono, divergência comercial, falha nova, falta de aceite visual ou fim da janela. Publicação permanece com o fundador.

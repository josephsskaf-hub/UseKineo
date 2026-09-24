# Home — hero de filmes, 24/09/2026

**DECISÃO DO USUÁRIO NESTA TAREFA:** migrar a composição aprovada de Examples para apenas o hero da home. Robôs Omni no destaque horizontal; Tunguska Omni, Lituya Bay H3 e vulcão Veo 3.1 nos três cards laterais. O quarto filme foi escolhido explicitamente pelo fundador. Solicitação adicional: 1080p na primeira página e nos exemplos.

**IMPLEMENTADO:** `components/HomeFeaturedFilms.tsx` usa o player existente com uma composição de quatro filmes. `lib/ui/homeFeaturedFilms.ts` referencia os cortes em 1080×1920 já aprovados, sem duplicar arquivos ou recomprimir. Todos os quatro cards reproduzem quando visíveis, respeitando economia de dados e preferência por movimento reduzido. O player expandido preserva o quadro vertical completo. Botão Open Studio usa a entrada geral; badges identificam o motor do filme sem ativar motores em manutenção.

**FATO CONFIRMADO:** `app/KineoLanding.tsx` substitui somente o bloco de mídia do hero. Headline, CTA principal e destinos por sessão/origem, navegação, seções inferiores e oferta permanecem iguais. A seleção dos nove exemplos continua a mesma; uma futura substituição de seus destaques depende da escolha do fundador.

**TESTADO LOCALMENTE:** teste offline de galeria com 528 verificações, incluindo ffprobe nos nove arquivos, ordem dos quatro filmes, SSR do hero sem coleção, sem download de vídeo antes da política de dispositivo. A bateria crítica do Guardião passa; as duas asserções da antiga ordem do hero foram atualizadas para a composição expressamente solicitada, preservando as verificações comerciais e de curadoria inferior.

**ARTEFATO VISUAL:** `scripts/test-examples-gallery.mjs --preview <diretório>` produz `HOME-ANTES-DEPOIS.html`, autocontido, com componentes reais, capas locais, CSS inline e comparação desktop/celular. Antes desta mudança: commit `ed065b91`. A validação interativa ocorre na URL HTTPS da Vercel.

**EVIDÊNCIA DE PRODUÇÃO (24/09/2026):** a correção de qualidade dos nove exemplos foi publicada em `ed065b91`, deployment `dpl_ARuuJ49GC1nyHrcN4hJQZ5dKi6zi`, READY/main. Navegador confirmou 1080×1920 nos vídeos de robôs e Tunguska, readyState 4 e sem erro de mídia.

## Refinamento e rotação solicitados pelo fundador — 24/09/2026

**DECISÃO DO USUÁRIO NESTA TAREFA:** reduzir mais o hero, melhorar o robô e alternar 2–3 filmes por card; reaproveitar os bons vídeos da home anterior junto dos novos escolhidos.

**IMPLEMENTADO:** nove filmes únicos em quatro playlists (3/2/2/2), com título, motor e abertura do player correspondentes ao filme visível. Pausa manual, modal aberto, aba oculta, movimento reduzido e economia de dados interrompem a reprodução automática. Apenas o próximo filme visível é pré-carregado. O hero desktop limita a mídia a 360px e reduz o espaço do título, mostrando mais da seção seguinte.

**FATO CONFIRMADO — mídia:** seis cortes novos, todos 1080×1920 H.264/CRF16, sem geração paga: robôs 12–15s + 22–25s da versão melhorada existente; avião 9–15s; vulcão 45–50s; mulher do trem 44–50s; faroleiro 35–40s; Kling 3 de capuz amarelo 1–7s. Tunguska, Lituya e castelo reaproveitam os cortes HD aprovados. A abertura do robô enquadra a cabeça e depois acompanha a colisão. A titularidade dos vídeos novos foi conferida por leitura restrita à conta do fundador; nenhuma escrita no banco.

**TESTADO LOCALMENTE:** 559 verificações de galeria/arquivos, 180 verificações da home azul, typecheck e bateria crítica do Guardião aprovados. Validação interativa e publicação são registradas no handoff externo após o deploy.

**ARTEFATO VISUAL:** `HOME-ROTACAO-ANTES-DEPOIS.html`, no diretório de outputs desta tarefa, compara a versão compacta anterior com a nova composição em desktop e celular, usando SSR e capas reais.

## Correção após feedback visual — 24/09/2026

**DECISÃO DO USUÁRIO NESTA TAREFA:** não gostou do segundo filme do destaque principal nem de vídeos pequenos com escrita dominante nos laterais.

**IMPLEMENTADO:** avião retirado da playlist principal; robôs e castelo passam a alternar. Oito filmes no total, dois por card. Removida a apresentação que limitava personagens a 38% da largura: todos os vídeos preenchem o card. Títulos laterais reduzidos a 15px no desktop e celular; badge a 8px; removida somente a legenda visual repetida Watch preview dos laterais, mantendo botão inteiro e nome acessível. Hero permanece compacto e os arquivos continuam em 1080×1920. Examples preservado.

**CORREÇÃO ADICIONAL SOLICITADA:** o fundador rejeitou também o recorte horizontal de rostos: precisam aparecer inteiros. Os três cards secundários passam a ser verticais, lado a lado, junto ao principal horizontal. No celular ficam abaixo do principal em três colunas 9:16, com títulos de duas linhas a 11px. Isso preserva o quadro dos filmes verticais e mantém o vídeo preenchendo cada card, sem miniatura lateral nem faixa ampliada sobre olhos/nariz. Desktop conserva a altura compacta de 360px.

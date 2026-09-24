# Home — hero de filmes, 24/09/2026

**DECISÃO DO USUÁRIO NESTA TAREFA:** migrar a composição aprovada de Examples para apenas o hero da home. Robôs Omni no destaque horizontal; Tunguska Omni, Lituya Bay H3 e vulcão Veo 3.1 nos três cards laterais. O quarto filme foi escolhido explicitamente pelo fundador. Solicitação adicional: 1080p na primeira página e nos exemplos.

**IMPLEMENTADO:** `components/HomeFeaturedFilms.tsx` usa o player existente com uma composição de quatro filmes. `lib/ui/homeFeaturedFilms.ts` referencia os cortes em 1080×1920 já aprovados, sem duplicar arquivos ou recomprimir. Todos os quatro cards reproduzem quando visíveis, respeitando economia de dados e preferência por movimento reduzido. O player expandido preserva o quadro vertical completo. Botão Open Studio usa a entrada geral; badges identificam o motor do filme sem ativar motores em manutenção.

**FATO CONFIRMADO:** `app/KineoLanding.tsx` substitui somente o bloco de mídia do hero. Headline, CTA principal e destinos por sessão/origem, navegação, seções inferiores e oferta permanecem iguais. A seleção dos nove exemplos continua a mesma; uma futura substituição de seus destaques depende da escolha do fundador.

**TESTADO LOCALMENTE:** teste offline de galeria com 528 verificações, incluindo ffprobe nos nove arquivos, ordem dos quatro filmes, SSR do hero sem coleção, sem download de vídeo antes da política de dispositivo. A bateria crítica do Guardião passa; as duas asserções da antiga ordem do hero foram atualizadas para a composição expressamente solicitada, preservando as verificações comerciais e de curadoria inferior.

**ARTEFATO VISUAL:** `scripts/test-examples-gallery.mjs --preview <diretório>` produz `HOME-ANTES-DEPOIS.html`, autocontido, com componentes reais, capas locais, CSS inline e comparação desktop/celular. Antes desta mudança: commit `ed065b91`. A validação interativa ocorre na URL HTTPS da Vercel.

**EVIDÊNCIA DE PRODUÇÃO (24/09/2026):** a correção de qualidade dos nove exemplos foi publicada em `ed065b91`, deployment `dpl_ARuuJ49GC1nyHrcN4hJQZ5dKi6zi`, READY/main. Navegador confirmou 1080×1920 nos vídeos de robôs e Tunguska, readyState 4 e sem erro de mídia.

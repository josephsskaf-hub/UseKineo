# Inventário integral de páginas — programa UX de 05/09/2026

**FATO CONFIRMADO:** 124 arquivos de página enumerados com rg em app/, base 67b15c3012cd118c395b2de04535164b87d1e1c1, em 05/09/2026. Rotas dinâmicas não equivalem a uma única URL. APIs, layouts, loading/error/not-found e componentes compartilhados exigem inventário complementar no lote correspondente.

**Estado inicial:** INVENTARIADO, NÃO CERTIFICADO. A auditoria preliminar do plano cobre somente os caminhos declarados nele; esta lista não afirma que todos os arquivos foram lidos ou todos os botões testados. Para cada página registrar depois: manter/refinar/corrigir, defeito ou hipótese, destinos, template/estados exercitados, preview, teste, commit e deploy. Publicação não deve ser marcada antes de validação.

**Dono de UX/navegação/espanhol:** Codex. Regras comerciais e experimentos: coordenação com Claude. Mudanças de backend, preço, crédito e termos fora deste inventário.

| Arquivo-fonte | Estado da revisão integral |
|---|---|
| `app/(auth)/forgot-password/page.tsx` | Pendente |
| `app/(auth)/login/page.tsx` | Pendente |
| `app/(auth)/reset-password/page.tsx` | Pendente |
| `app/(auth)/signup/page.tsx` | Pendente |
| `app/(dashboard)/account/page.tsx` | Pendente |
| `app/(dashboard)/admin/affiliates/page.tsx` | Pendente |
| `app/(dashboard)/admin/ceo/page.tsx` | Pendente |
| `app/(dashboard)/admin/funnel/page.tsx` | Pendente |
| `app/(dashboard)/admin/metrics/page.tsx` | Pendente |
| `app/(dashboard)/admin/users/page.tsx` | Pendente |
| `app/(dashboard)/affiliate/page.tsx` | Pendente |
| `app/(dashboard)/animate/page.tsx` | Pendente |
| `app/(dashboard)/audio/page.tsx` | L1: título do shell preparado/testado; visual e conteúdo da página pendentes |
| `app/(dashboard)/autopilot/page.tsx` | Pendente |
| `app/(dashboard)/avatar/page.tsx` | Pendente |
| `app/(dashboard)/channel/page.tsx` | Pendente |
| `app/(dashboard)/create/page.tsx` | Pendente |
| `app/(dashboard)/dashboard/page.tsx` | Pendente |
| `app/(dashboard)/generate/page.tsx` | Pendente |
| `app/(dashboard)/history/page.tsx` | L2c: três ocorrências de continuação preparadas/testadas, preview pendente. Ofertas/downloads intactos; restante do visual pendente. |
| `app/(dashboard)/images/page.tsx` | L1: título do shell preparado/testado; visual e conteúdo da página pendentes |
| `app/(dashboard)/library/page.tsx` | L1 título + L2c link de continuação preparado/testado, previews pendentes. Abas/downloads/erros intactos; restante do visual pendente. |
| `app/(dashboard)/my-videos/page.tsx` | Pendente |
| `app/(dashboard)/referral/page.tsx` | Pendente |
| `app/(dashboard)/studio/create/page.tsx` | Pendente |
| `app/(dashboard)/studio/page.tsx` | L1 título + L2 dois botões de tema preparados/testados; previews pendentes de aprovação; hierarquia e demais destinos pendentes |
| `app/(dashboard)/templates/page.tsx` | Pendente |
| `app/(dashboard)/thumbnail-generator/page.tsx` | Pendente |
| `app/(dashboard)/v2/page.tsx` | Pendente |
| `app/(dashboard)/video/page.tsx` | Pendente |
| `app/(dashboard)/viral-now/page.tsx` | Pendente |
| `app/admin/leads/page.tsx` | Pendente |
| `app/admin/overview/page.tsx` | Pendente |
| `app/admin/page.tsx` | Pendente |
| `app/admin/paying/page.tsx` | Pendente |
| `app/admin/people/page.tsx` | Pendente |
| `app/admin/supplier-health/page.tsx` | Pendente |
| `app/admin/trial-abuse/page.tsx` | Pendente |
| `app/admin/trial-cohort/page.tsx` | Pendente |
| `app/admin/trial-roi/page.tsx` | Pendente |
| `app/ai-avatar/page.tsx` | Pendente |
| `app/ai-image-generator/page.tsx` | Pendente |
| `app/ai-robot-video-generator/page.tsx` | Pendente |
| `app/ai-shorts-for-agencies/page.tsx` | Pendente |
| `app/ai-shorts-without-filming/page.tsx` | Pendente |
| `app/ai-video-generator/[engine]/page.tsx` | Pendente |
| `app/ai-video-generator/page.tsx` | Pendente |
| `app/ai-video-upscaler/page.tsx` | Pendente |
| `app/ai-video-with-talking-characters/page.tsx` | Pendente |
| `app/ai-voice-generator/page.tsx` | Pendente |
| `app/alternatives/[competitor]/page.tsx` | Pendente |
| `app/alternatives/page.tsx` | Pendente |
| `app/arena/page.tsx` | Pendente |
| `app/best-ai-shorts-generators/page.tsx` | Pendente |
| `app/brainrot-video-generator/page.tsx` | Pendente |
| `app/business-pilot-review/page.tsx` | Pendente |
| `app/business-video-content-plan/page.tsx` | Pendente |
| `app/can-you-monetize-ai-videos/page.tsx` | Pendente |
| `app/chatgpt-to-youtube-shorts/page.tsx` | Pendente |
| `app/cheapest-ai-shorts-maker/page.tsx` | Pendente |
| `app/checkout/cancelled/page.tsx` | Pendente |
| `app/checkout/success/page.tsx` | Pendente |
| `app/client-video-brief-generator/page.tsx` | Pendente |
| `app/coming-soon/page.tsx` | Pendente |
| `app/comment-to-video/page.tsx` | Pendente |
| `app/compare/heygen-alternative/page.tsx` | Pendente |
| `app/compare/invideo-alternative/page.tsx` | Pendente |
| `app/examples/[slug]/page.tsx` | Pendente |
| `app/examples/page.tsx` | Pendente |
| `app/faceless-channel-ideas/page.tsx` | Pendente |
| `app/faceless-video-generator/page.tsx` | Pendente |
| `app/facts/page.tsx` | Pendente |
| `app/founding/page.tsx` | Pendente |
| `app/free-ai-shorts-generator/page.tsx` | Pendente |
| `app/free-ai-shorts/[niche]/page.tsx` | Pendente |
| `app/free-ai-shorts/page.tsx` | Pendente |
| `app/free-hook-generator/page.tsx` | Pendente |
| `app/free-script-generator/page.tsx` | Pendente |
| `app/from-saashub/page.tsx` | Pendente |
| `app/from-youtube/page.tsx` | Pendente |
| `app/generador-de-shorts-gratis/page.tsx` | Pendente |
| `app/gerador-de-shorts-gratis/page.tsx` | Pendente |
| `app/how-much-do-youtube-shorts-pay/page.tsx` | Pendente |
| `app/how-to-start-a-faceless-youtube-channel/page.tsx` | Pendente |
| `app/kineo-vs-higgsfield/page.tsx` | Pendente |
| `app/make-money-clipping-with-ai/page.tsx` | Pendente |
| `app/models-pricing/page.tsx` | Pendente |
| `app/niche-picker/page.tsx` | Pendente |
| `app/omni-flash-vs-sora/page.tsx` | Pendente |
| `app/page.tsx` | L2b: faixa ResumeStrip preparada para revisão no Studio, preview pendente; home/servidor/mídias intactos. Demais seções pendentes. |
| `app/partners/page.tsx` | Pendente |
| `app/pricing/page.tsx` | Pendente |
| `app/privacy/page.tsx` | Pendente |
| `app/product-to-video-script/page.tsx` | Pendente |
| `app/real-estate-video-maker/page.tsx` | Pendente |
| `app/reddit-story-video-generator/page.tsx` | Pendente |
| `app/reviews/page.tsx` | Pendente |
| `app/revive/[handle]/page.tsx` | Pendente |
| `app/scripts/[vertical]/page.tsx` | Pendente |
| `app/scripts/page.tsx` | Pendente |
| `app/shorts-money-calculator/page.tsx` | Pendente |
| `app/sora-alternative/page.tsx` | Pendente |
| `app/start/page.tsx` | Pendente |
| `app/state-of-ai-shorts-2026/page.tsx` | Pendente |
| `app/terms/page.tsx` | Pendente |
| `app/text-to-video-shorts/page.tsx` | Pendente |
| `app/tiktok-creator-rewards-videos/page.tsx` | Pendente |
| `app/tiktok-vs-youtube-shorts-monetization/page.tsx` | Pendente |
| `app/tools/page.tsx` | Pendente |
| `app/trust/page.tsx` | Pendente |
| `app/unsubscribe/page.tsx` | Pendente |
| `app/v/[id]/page.tsx` | Pendente |
| `app/viral-score/page.tsx` | Pendente |
| `app/vs/[pair]/page.tsx` | Pendente |
| `app/vs/page.tsx` | Pendente |
| `app/wall/page.tsx` | Pendente |
| `app/widget/embed/page.tsx` | Pendente |
| `app/widget/page.tsx` | Pendente |
| `app/youtube-automation-case-study/page.tsx` | Pendente |
| `app/youtube-automation/page.tsx` | Pendente |
| `app/youtube-shorts-from-topic/page.tsx` | Pendente |
| `app/youtube-shorts-rpm-by-niche/page.tsx` | Pendente |
| `app/youtube-shorts-script-timer/page.tsx` | Pendente |
| `app/youtube-shorts-title-generator/page.tsx` | Pendente |

**Gate final:** nenhuma linha some para aparentar conclusão. Páginas mantidas recebem justificativa; páginas dinâmicas recebem amostras e estados; exceções e traduções pendentes permanecem explícitas.

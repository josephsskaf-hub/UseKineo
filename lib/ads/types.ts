// KINEO-STUDIO-ADS-2026-09-25 — contrato de dados do pedido (tabela public.ads_orders,
// migrations_pending/2026-09-25_studio_ads.sql). Estado do fluxo vive AQUI, no servidor —
// nunca em sessionStorage (memória "remédio escrito pelo lado que morre").
import type { AdsModelId, AdsSeconds } from '@/lib/ads/models'

export type AdsOrderStatus =
  | 'draft'        // brief salvo, sem render
  | 'rendering'    // /api/ads/render despachou; aguardando o compose
  | 'delivered'    // MP4 pronto, pessoa vê e baixa; entra na fila de revisão humana
  | 'reviewed'     // operador olhou (ok ou re-render enviado)
  | 'failed'       // render falhou; crédito estornado pelo caminho normal
  | 'cancelled'

export interface AdsBrief {
  business: string          // nome + o que vende
  offer: string             // oferta / preço / prazo (pode ser vazio em modelos sem oferta)
  cta: 'call' | 'whatsapp' | 'visit' | 'buy' | 'book' | 'signup'
  contact: string           // telefone, WhatsApp, endereço ou link do CTA
  language: string          // código da narração (lib/textLanguage)
  tone: 'warm' | 'direct' | 'premium'
  audience: string          // 1 linha
  extra: Record<string, string>  // campos extras exigidos pelo modelo (AdsModel.inputs.extraFields)
}

export interface AdsMediaItem {
  footageId: string         // id em user_footage (mesma porta do /api/footage)
  url: string               // URL pública do bucket user-footage/<uid>/…
  kind: 'image' | 'video'
  isLogo: boolean
  bytes: number
  width?: number | null
  height?: number | null
  seconds?: number | null   // vídeo: lido no navegador antes do PUT
}

export interface AdsStoryboardScene {
  index: number
  beatIndex: number
  footageId: string | null  // por ID, nunca por posição
  speech: string
}

export interface AdsOrder {
  id: string
  user_id: string
  status: AdsOrderStatus
  template: AdsModelId | null
  seconds: AdsSeconds | null
  brief: AdsBrief | null
  media: AdsMediaItem[]
  script: string | null
  script_angle: string | null
  voice: string | null
  storyboard: AdsStoryboardScene[]
  card_footage_id: string | null   // PNG do cartão final (desenhado no navegador) já subido
  video_id: string | null
  consent_at: string | null
  qa_by: string | null
  qa_at: string | null
  qa_ok: boolean | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

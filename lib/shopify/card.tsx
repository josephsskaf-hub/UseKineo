// KINEO-SHOPIFY-2026-10-13 (etapa 2) — o CARTÃO FINAL do anúncio que nasce no app da Shopify, desenhado NO SERVIDOR.
//
// No site, o cartão (lib/ads/endCard.ts drawEndCard) é desenhado no <canvas> do navegador e sobe como PNG pelo /api/footage. A
// tela embutida da Shopify não tem o bundle do site (é HTML com o App Bridge primeiro, exigência 2.2.3), então o cartão sai daqui
// com o gerador que o site já usa nos cartões de compartilhamento (next/og — satori + resvg, sem dependência nova). O desenho
// segue a MESMA regra do drawEndCard: 1080×1920, fundo cobrindo a tela toda (o zoom da montagem não mostra borda), todo texto
// dentro da caixa segura x 8–92 %, y 12–64 % (as legendas moram embaixo). Conteúdo: nome da loja, preço do produto, o botão
// ("Shop now") e o domínio da loja — só o que a LOJA publicou. O PNG vai ao user_footage da conta com a moderação de imagem de
// sempre (lib/shopify/adFlow.ts), e o /plan e o /start o tratam como o cartão de qualquer anúncio (card_footage_id, isPng).
import { ImageResponse } from 'next/og'

export const SHOP_CARD_WIDTH = 1080
export const SHOP_CARD_HEIGHT = 1920

export interface ShopCardInput {
  business: string
  offer: string | null
  cta: string
  contact: string | null
}

const clip = (s: string | null | undefined, n: number) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

/** O PNG do cartão (bytes). null = o gerador falhou (o chamador responde 502; nenhum pedido nasce sem cartão). */
export async function renderShopEndCard(input: ShopCardInput): Promise<Uint8Array | null> {
  const business = clip(input.business, 60) || 'Our store'
  const offer = clip(input.offer, 40)
  const cta = clip(input.cta, 30) || 'Shop now'
  const contact = clip(input.contact, 60)
  const nameSize = business.length > 28 ? 72 : business.length > 16 ? 92 : 112
  try {
    const res = new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #10224a 0%, #0a1430 55%, #050a18 100%)', fontFamily: 'sans-serif' }}>
          <div style={{ display: 'flex', height: SHOP_CARD_HEIGHT * 0.12 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: SHOP_CARD_HEIGHT * 0.52, marginLeft: SHOP_CARD_WIDTH * 0.08, marginRight: SHOP_CARD_WIDTH * 0.08, textAlign: 'center' }}>
            <div style={{ display: 'flex', color: '#ffffff', fontSize: nameSize, fontWeight: 800, lineHeight: 1.15, textAlign: 'center', justifyContent: 'center' }}>{business}</div>
            {offer ? <div style={{ display: 'flex', color: '#9cc8ff', fontSize: 72, fontWeight: 700, marginTop: 40 }}>{offer}</div> : null}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 64, padding: '36px 72px', borderRadius: 64, background: 'linear-gradient(90deg, #4fb0ff 0%, #2997ff 100%)' }}>
              <div style={{ display: 'flex', color: '#ffffff', fontSize: 64, fontWeight: 800 }}>{cta}</div>
              {contact ? <div style={{ display: 'flex', color: 'rgba(255,255,255,0.92)', fontSize: 40, fontWeight: 600, marginTop: 12 }}>{contact}</div> : null}
            </div>
          </div>
        </div>
      ),
      { width: SHOP_CARD_WIDTH, height: SHOP_CARD_HEIGHT },
    )
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    // PNG pelos primeiros bytes (o /plan exige .png no user_footage; o arquivo tem de ser PNG de verdade).
    return bytes.length > 1000 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 ? bytes : null
  } catch {
    return null
  }
}

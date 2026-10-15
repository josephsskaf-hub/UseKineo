// KINEO-DEMO-SOB-MEDIDA-1510 — a foto do produto em 9:16, recortada NO SERVIDOR (lib/ads/demoSobMedida.ts tem o porquê).
//
// No site o navegador recorta cada foto em 9:16 antes do /plan; o app da Shopify pede o recorte ao CDN da loja. A demo sob
// medida lê uma página qualquer, então o recorte sai daqui, com o gerador que a casa já usa nos cartões (next/og — satori +
// resvg, sem dependência nova; lib/shopify/card.tsx): 1080×1920, a foto INTEIRA em `contain` sobre fundo branco (a foto de
// loja quase sempre é produto sobre branco; nada do produto sai do quadro — corte duro cortaria a embalagem). A foto
// original vai junto ao /plan como original_footage_id (a trava do produto fiel recorta o produto dela).
// Só JPG/PNG (o satori não lê WebP). null = o gerador falhou (a foto fica de fora).
import { ImageResponse } from 'next/og'

export const DEMO_PHOTO_WIDTH = 1080
export const DEMO_PHOTO_HEIGHT = 1920

export async function renderDemoPhoto916(bytes: Uint8Array, ext: 'jpg' | 'png'): Promise<Uint8Array | null> {
  try {
    const src = `data:${ext === 'png' ? 'image/png' : 'image/jpeg'};base64,${Buffer.from(bytes).toString('base64')}`
    const res = new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={src} width={DEMO_PHOTO_WIDTH} height={DEMO_PHOTO_HEIGHT} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      ),
      { width: DEMO_PHOTO_WIDTH, height: DEMO_PHOTO_HEIGHT },
    )
    if (!res.ok) return null
    const out = new Uint8Array(await res.arrayBuffer())
    return out.length > 1000 && out[0] === 0x89 && out[1] === 0x50 && out[2] === 0x4e && out[3] === 0x47 ? out : null
  } catch {
    return null
  }
}

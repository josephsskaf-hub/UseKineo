// KINEO-HOME-LIMPA-1410 — fundador 14/10: dentro de "More tools", uma galeria grande de fotos feitas no Kineo Images
// (Nano Banana), "no meio da rua", para a home parecer rica. Regras:
//   · SÓ imagens geradas pelas contas da casa (nunca de cliente), baixadas uma vez e servidas de public/home-images/
//     (WebP ≤ 150 KB cada; guardião scripts/test-home-limpa-1410.mjs confere pasta, quantidade e peso);
//   · sem pessoa real, sem criança, sem marca de terceiro, sem texto; pessoas que aparecem são fictícias (prompt da casa);
//   · selo honesto: "Made with Kineo Images · Nano Banana" — nenhuma alegação de cliente;
//   · sem layout shift: width/height reais em cada <img> + aspect-ratio; lazy; cada foto leva para /images.
import Link from 'next/link'
import { UiLabel } from '@/components/InterfaceLanguage'

export type HomeGalleryImage = { file: string; w: number; h: number; alt: string }

/** Pasta única permitida para a galeria (o guardião recusa qualquer src fora dela). */
export const HOME_GALLERY_DIR = '/home-images/' // KINEO-HOME-LIMPA-1410

// Ordem pensada para a grade em colunas (lida de cima para baixo em cada coluna): paisagens espalhadas entre os retratos.
export const HOME_GALLERY_IMAGES: readonly HomeGalleryImage[] = [ // KINEO-HOME-LIMPA-1410
  { file: 'puddle.webp', w: 640, h: 1146, alt: 'A man leaping over a rain puddle on a cobblestone street at golden hour' },
  { file: 'lighthouse.webp', w: 900, h: 502, alt: 'A red and white lighthouse on a cliff in a storm with lightning' },
  { file: 'clock-blue.webp', w: 640, h: 1146, alt: 'A pastel blue twin-bell alarm clock on a white pedestal' },
  { file: 'coffee.webp', w: 640, h: 1146, alt: 'A warm specialty coffee shop with a wooden slatted ceiling' },
  { file: 'perfume.webp', w: 900, h: 502, alt: 'A glass perfume bottle on black stone with a splash of water' },
  { file: 'sneaker-white.webp', w: 640, h: 1146, alt: 'A white running sneaker with orange accents on a round pedestal' },
  { file: 'raincoat.webp', w: 640, h: 1146, alt: 'A woman in a yellow raincoat on a grassy sea cliff' },
  { file: 'boutique.webp', w: 640, h: 1146, alt: 'A concrete streetwear boutique with lit sneaker shelves' },
  { file: 'astronaut.webp', w: 900, h: 502, alt: 'An astronaut standing in a field of sunflowers at sunset' },
  { file: 'apple.webp', w: 640, h: 1146, alt: 'A glossy red apple on a light wooden table by a window' },
  { file: 'coworking.webp', w: 640, h: 1146, alt: 'An open coworking office with wooden desks and plants' },
  { file: 'clock-brass.webp', w: 640, h: 1146, alt: 'A vintage brass alarm clock on a sunny stone windowsill' },
  { file: 'cube.webp', w: 640, h: 1146, alt: 'A colorful puzzle cube on a white pedestal' },
  { file: 'toycar.webp', w: 640, h: 1146, alt: 'A small red vintage toy car on a white desk' },
]

const CSS = `
.klp .khg{padding:22px 0 6px}
.klp .khg-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:14px}
.klp .khg-head h3{margin:0;font-size:clamp(18px,1.6vw,22px);font-weight:600;letter-spacing:-.02em;color:var(--txt)}
.klp .khg-head p{margin:4px 0 0;color:var(--muted);font-size:14px;line-height:1.45}
.klp .khg-tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.klp .khg-grid{columns:4 220px;column-gap:14px}
.klp .khg-item{display:block;break-inside:avoid;margin:0 0 14px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#101821;text-decoration:none}
.klp .khg-item:hover{border-color:var(--blue)}
.klp .khg-item:focus-visible{outline:2px solid var(--home-action,#0A5CFF);outline-offset:3px}
.klp .khg-item img{display:block;width:100%;height:auto;transition:transform .35s ease}
.klp .khg-item:hover img{transform:scale(1.03)}
.klp .khg-portrait img{aspect-ratio:640/1146;object-fit:cover}
.klp .khg-wide img{aspect-ratio:900/502;object-fit:cover}
@media(max-width:700px){.klp .khg-grid{columns:2;column-gap:10px}.klp .khg-item{margin-bottom:10px;border-radius:12px}.klp .khg-portrait img{aspect-ratio:3/4}}
@media(prefers-reduced-motion:reduce){.klp .khg-item img{transition:none}.klp .khg-item:hover img{transform:none}}
`

export default function HomeImageGallery() {
  return (
    <div className="khg" data-home-section="image-gallery" data-home-limpa="KINEO-HOME-LIMPA-1410">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        <div className="khg-head">
          <div>
            <h3><UiLabel>Images made with Kineo</UiLabel></h3>
            <p><UiLabel>Products, places, food and cinematic scenes, each from one line of text.</UiLabel></p>
          </div>
          <span className="khg-tag"><UiLabel>Made with Kineo Images · Nano Banana</UiLabel></span>
        </div>
        <div className="khg-grid">
          {HOME_GALLERY_IMAGES.map((img) => (
            <Link
              key={img.file}
              href="/images"
              className={`khg-item ${img.w > img.h ? 'khg-wide' : 'khg-portrait'}`}
              data-home-cta="gallery_image"
              aria-label={`${img.alt}. Open Kineo Images`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${HOME_GALLERY_DIR}${img.file}`} width={img.w} height={img.h} alt={img.alt} loading="lazy" decoding="async" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

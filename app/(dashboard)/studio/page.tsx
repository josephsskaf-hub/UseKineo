// KINEO-STUDIO-V4-2026-08-16 — [STAGE ONLY] a tela única de geração estilo
// Higgsfield que o fundador desenhou: motor + duração + resolução + aspecto +
// imagem de referência + presets de câmera, tudo visível sem rolar.
//
// ⚠ Esta rota vive na BRANCH studio-v4 (Vercel Preview). NÃO existe em
// produção até o fundador aprovar ("eu aprovando a gente sobe"). Não linkar
// de nenhuma nav até lá.
import StudioClient from './StudioClient'

export const metadata = { title: 'Studio — Kineo [STAGE]' }

export default function StudioPage() {
  return <StudioClient />
}

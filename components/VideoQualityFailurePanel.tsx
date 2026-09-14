'use client'

import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import type { VideoQualityFailure } from '@/lib/cinematic/qualityFailureUi'
import type { QualityFailureExit } from '@/lib/qualityFailureExit'

const COPY = {
  en: {
    title: 'This video needs a review',
    detail: 'We stopped before submitting the final film. We will not retry this attempt automatically.',
    refunded: 'Your credits were returned and this attempt was released. You can edit your idea before starting a new attempt.',
    noDebit: 'No credits were charged for this attempt. You can edit your idea before starting a new attempt.',
    pending: 'We could not confirm that this attempt and its credits are fully settled. Do not start it again yet. Contact support with the reference below.',
    reference: 'Attempt reference', edit: 'Edit my idea', support: 'Contact support', history: 'Open video history',
    // KINEO-S25-RECUSA-NA-TELA-2026-09-14 (Board, MOTORES-ESPECIFICOS-R6) — a
    // recusa do MOTOR para o formato ganha nome e saída: trocar motor ou
    // formato é decisão da pessoa; a tela não altera nada sozinha e não
    // promete reaproveitar cena. Sem preço, sem oferta.
    engineTitle: 'Seedance 2.5 cannot voice an on-camera presenter',
    engineDetail: 'This film asks for a presenter who speaks on camera, and Seedance 2.5 has no voice for that. Pick Kling 3, MiniMax H3 or Omni Flash for a presenter, or keep Seedance 2.5 and ask for a narrated film without a presenter. Your text, length and engine are exactly as you left them — nothing was changed for you.',
    setAside: (n: number) => `${n} scene${n === 1 ? '' : 's'} had already started and ${n === 1 ? 'was' : 'were'} set aside. A new film starts from scratch at its normal price; those scenes are not reused.`,
    changeEngine: 'Change engine or format',
  },
  es: {
    title: 'Este video necesita una revisión',
    detail: 'Detuvimos el proceso antes de enviar la película final. No repetiremos este intento automáticamente.',
    refunded: 'Tus créditos fueron devueltos y este intento quedó liberado. Puedes editar tu idea antes de iniciar un nuevo intento.',
    noDebit: 'No se cobraron créditos por este intento. Puedes editar tu idea antes de iniciar un nuevo intento.',
    pending: 'No pudimos confirmar que este intento y sus créditos estén totalmente resueltos. No lo inicies de nuevo todavía. Contacta con soporte e incluye la referencia de abajo.',
    reference: 'Referencia del intento', edit: 'Editar mi idea', support: 'Contactar con soporte', history: 'Abrir historial de videos',
    engineTitle: 'Seedance 2.5 no puede dar voz a un presentador en cámara',
    engineDetail: 'Este video pide un presentador que habla a cámara y Seedance 2.5 no tiene voz para eso. Elige Kling 3, MiniMax H3 u Omni Flash para un presentador, o mantén Seedance 2.5 y pide un video narrado sin presentador. Tu texto, duración y motor siguen exactamente como los dejaste — no cambiamos nada por ti.',
    setAside: (n: number) => `${n} escena${n === 1 ? '' : 's'} ya ${n === 1 ? 'había' : 'habían'} empezado y ${n === 1 ? 'quedó' : 'quedaron'} apartada${n === 1 ? '' : 's'}. Un video nuevo empieza desde cero a su precio normal; esas escenas no se reutilizan.`,
    changeEngine: 'Cambiar motor o formato',
  },
  hi: {
    title: 'इस वीडियो की समीक्षा ज़रूरी है',
    detail: 'अंतिम फ़िल्म भेजने से पहले प्रक्रिया रोक दी गई। हम इस प्रयास को अपने आप दोबारा शुरू नहीं करेंगे।',
    refunded: 'आपके क्रेडिट वापस कर दिए गए हैं और यह प्रयास बंद हो गया है। नया प्रयास शुरू करने से पहले आप अपना विचार संपादित कर सकते हैं।',
    noDebit: 'इस प्रयास के लिए कोई क्रेडिट नहीं लिया गया। नया प्रयास शुरू करने से पहले आप अपना विचार संपादित कर सकते हैं।',
    pending: 'हम पुष्टि नहीं कर सके कि इस प्रयास और इसके क्रेडिट का निपटारा पूरा हो गया है। अभी इसे दोबारा शुरू न करें। नीचे दिए गए संदर्भ के साथ सहायता से संपर्क करें।',
    reference: 'प्रयास का संदर्भ', edit: 'मेरा विचार संपादित करें', support: 'सहायता से संपर्क करें', history: 'वीडियो इतिहास खोलें',
    engineTitle: 'Seedance 2.5 कैमरे पर बोलने वाले प्रस्तुतकर्ता को आवाज़ नहीं दे सकता',
    engineDetail: 'इस वीडियो में कैमरे पर बोलने वाला प्रस्तुतकर्ता चाहिए, और Seedance 2.5 के पास इसके लिए आवाज़ नहीं है। प्रस्तुतकर्ता के लिए Kling 3, MiniMax H3 या Omni Flash चुनें, या Seedance 2.5 रखकर बिना प्रस्तुतकर्ता वाला वर्णित वीडियो माँगें। आपका टेक्स्ट, अवधि और इंजन वैसे ही हैं जैसे आपने छोड़े थे — हमने आपके लिए कुछ नहीं बदला।',
    setAside: (n: number) => `${n} दृश्य पहले ही शुरू हो चुके थे और अलग रख दिए गए। नया वीडियो सामान्य कीमत पर शुरू से बनता है; वे दृश्य दोबारा उपयोग नहीं होते।`,
    changeEngine: 'इंजन या फ़ॉर्मैट बदलें',
  },
}

export default function VideoQualityFailurePanel({ failure, exit = null, onEdit }: { failure: VideoQualityFailure; exit?: QualityFailureExit | null; onEdit: () => void }) {
  const language = useInterfaceLanguage()
  const copy = COPY[language]
  // Same support address as components/Footer.tsx and app/trust/page.tsx.
  // This opens the user's mail client; it never sends a message automatically.
  const supportHref = `mailto:support@usekineo.com?subject=${encodeURIComponent(`Video quality check — ${failure.generationId || 'reference unavailable'}`)}`
  const linkStyle = { color: '#83c5ff', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, padding: '10px 0' } as const
  // A recusa do motor para o formato nomeia a causa e a saída; qualquer outra
  // razão mantém o cartão byte a byte como era.
  const engineExit = exit?.guidance === 'engine_or_format'
  const setAside = exit?.acceptedScenes ?? 0
  return (
    <section role="alert" aria-labelledby="video-quality-failure-title" lang={language}
      style={{ background: '#181a20', border: '1px solid #756044', borderRadius: 16, padding: 24, marginBottom: 24, color: '#f5f5f7' }}>
      <p style={{ margin: '0 0 10px', color: '#e9bf79', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em' }}>KINEO · QUALITY</p>
      <h2 id="video-quality-failure-title" style={{ margin: '0 0 12px', fontSize: 21, lineHeight: 1.3 }}>{engineExit ? copy.engineTitle : copy.title}</h2>
      <p style={{ margin: '0 0 14px', color: '#c0c4ce', fontSize: 14, lineHeight: 1.6 }}>{engineExit ? copy.engineDetail : copy.detail}</p>
      {setAside > 0 ? <p data-quality-set-aside="" style={{ margin: '0 0 14px', color: '#c0c4ce', fontSize: 14, lineHeight: 1.6 }}>{copy.setAside(setAside)}</p> : null}
      <p style={{ margin: '0 0 18px', color: '#f5f5f7', fontSize: 14, lineHeight: 1.6 }}>
        {failure.canEdit ? failure.noDebit ? copy.noDebit : copy.refunded : copy.pending}
      </p>
      {failure.generationId ? <p style={{ margin: '0 0 16px', fontSize: 12, color: '#a9afbc', overflowWrap: 'anywhere' }}>
        {copy.reference}: <code>{failure.generationId}</code>
      </p> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', alignItems: 'center' }}>
        {failure.canEdit ? <button type="button" onClick={onEdit}
          style={{ background: '#2997ff', color: '#fff', border: 0, borderRadius: 10, minHeight: 44, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{engineExit ? copy.changeEngine : copy.edit}</button> : null}
        <a href={supportHref} style={linkStyle}>{copy.support}</a>
        <a href="/history" style={linkStyle}>{copy.history}</a>
      </div>
    </section>
  )
}

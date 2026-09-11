'use client'

import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import type { VideoQualityFailure } from '@/lib/cinematic/qualityFailureUi'

const COPY = {
  en: {
    title: 'This video needs a review',
    detail: 'We stopped before submitting the final film. We will not retry this attempt automatically.',
    refunded: 'Your credits were returned and this attempt was released. You can edit your idea before starting a new attempt.',
    noDebit: 'No credits were charged for this attempt. You can edit your idea before starting a new attempt.',
    pending: 'We could not confirm that this attempt and its credits are fully settled. Do not start it again yet. Contact support with the reference below.',
    reference: 'Attempt reference', edit: 'Edit my idea', support: 'Contact support', history: 'Open video history',
  },
  es: {
    title: 'Este video necesita una revisión',
    detail: 'Detuvimos el proceso antes de enviar la película final. No repetiremos este intento automáticamente.',
    refunded: 'Tus créditos fueron devueltos y este intento quedó liberado. Puedes editar tu idea antes de iniciar un nuevo intento.',
    noDebit: 'No se cobraron créditos por este intento. Puedes editar tu idea antes de iniciar un nuevo intento.',
    pending: 'No pudimos confirmar que este intento y sus créditos estén totalmente resueltos. No lo inicies de nuevo todavía. Contacta con soporte e incluye la referencia de abajo.',
    reference: 'Referencia del intento', edit: 'Editar mi idea', support: 'Contactar con soporte', history: 'Abrir historial de videos',
  },
  hi: {
    title: 'इस वीडियो की समीक्षा ज़रूरी है',
    detail: 'अंतिम फ़िल्म भेजने से पहले प्रक्रिया रोक दी गई। हम इस प्रयास को अपने आप दोबारा शुरू नहीं करेंगे।',
    refunded: 'आपके क्रेडिट वापस कर दिए गए हैं और यह प्रयास बंद हो गया है। नया प्रयास शुरू करने से पहले आप अपना विचार संपादित कर सकते हैं।',
    noDebit: 'इस प्रयास के लिए कोई क्रेडिट नहीं लिया गया। नया प्रयास शुरू करने से पहले आप अपना विचार संपादित कर सकते हैं।',
    pending: 'हम पुष्टि नहीं कर सके कि इस प्रयास और इसके क्रेडिट का निपटारा पूरा हो गया है। अभी इसे दोबारा शुरू न करें। नीचे दिए गए संदर्भ के साथ सहायता से संपर्क करें।',
    reference: 'प्रयास का संदर्भ', edit: 'मेरा विचार संपादित करें', support: 'सहायता से संपर्क करें', history: 'वीडियो इतिहास खोलें',
  },
}

export default function VideoQualityFailurePanel({ failure, onEdit }: { failure: VideoQualityFailure; onEdit: () => void }) {
  const language = useInterfaceLanguage()
  const copy = COPY[language]
  // Same support address as components/Footer.tsx and app/trust/page.tsx.
  // This opens the user's mail client; it never sends a message automatically.
  const supportHref = `mailto:support@usekineo.com?subject=${encodeURIComponent(`Video quality check — ${failure.generationId || 'reference unavailable'}`)}`
  const linkStyle = { color: '#83c5ff', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, padding: '10px 0' } as const
  return (
    <section role="alert" aria-labelledby="video-quality-failure-title" lang={language}
      style={{ background: '#181a20', border: '1px solid #756044', borderRadius: 16, padding: 24, marginBottom: 24, color: '#f5f5f7' }}>
      <p style={{ margin: '0 0 10px', color: '#e9bf79', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em' }}>KINEO · QUALITY</p>
      <h2 id="video-quality-failure-title" style={{ margin: '0 0 12px', fontSize: 21, lineHeight: 1.3 }}>{copy.title}</h2>
      <p style={{ margin: '0 0 14px', color: '#c0c4ce', fontSize: 14, lineHeight: 1.6 }}>{copy.detail}</p>
      <p style={{ margin: '0 0 18px', color: '#f5f5f7', fontSize: 14, lineHeight: 1.6 }}>
        {failure.canEdit ? failure.noDebit ? copy.noDebit : copy.refunded : copy.pending}
      </p>
      {failure.generationId ? <p style={{ margin: '0 0 16px', fontSize: 12, color: '#a9afbc', overflowWrap: 'anywhere' }}>
        {copy.reference}: <code>{failure.generationId}</code>
      </p> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', alignItems: 'center' }}>
        {failure.canEdit ? <button type="button" onClick={onEdit}
          style={{ background: '#2997ff', color: '#fff', border: 0, borderRadius: 10, minHeight: 44, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{copy.edit}</button> : null}
        <a href={supportHref} style={linkStyle}>{copy.support}</a>
        <a href="/history" style={linkStyle}>{copy.history}</a>
      </div>
    </section>
  )
}

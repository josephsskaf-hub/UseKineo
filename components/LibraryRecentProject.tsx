'use client'
import Link from 'next/link'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { recentProjectState, type RecentLibraryProject } from '@/lib/ui/recentLibraryProject'
import { buildStudioSeriesReviewHref } from '@/lib/navigation/studioSeriesReview'
import { trackEvent } from '@/lib/analytics'

export default function LibraryRecentProjectCard({video}: {video: RecentLibraryProject}) {
  const language = useInterfaceLanguage(), state = recentProjectState(video)
  const labels = language === 'hi' ? {recent:'आपका सबसे हाल का प्रोजेक्ट',ready:'समीक्षा के लिए तैयार',processing:'वीडियो बनने की स्थिति देखें',failed:'इस प्रोजेक्ट की समीक्षा ज़रूरी है',open:'वीडियो खोलें',status:'स्थिति देखें',review:'विवरण देखें',next:'अगला एपिसोड बनाएँ',untitled:'बिना शीर्षक का वीडियो'} : language === 'es' ? {recent:'Tu proyecto más reciente',ready:'Listo para revisar',processing:'Consulta el estado de la generación',failed:'Este proyecto necesita revisión',open:'Abrir vídeo',status:'Ver estado',review:'Revisar detalles',next:'Crear el siguiente episodio',untitled:'Vídeo sin título'} : {recent:'Your most recent project',ready:'Ready to review',processing:'Check the generation status',failed:'This project needs a review',open:'Open video',status:'View status',review:'Review details',next:'Create next episode',untitled:'Untitled video'}
  return <section className="card" aria-label={labels.recent} style={{padding:20,marginBottom:20,borderColor:'#35526e'}}>
    <p style={{fontSize:12,color:'#9baec4',margin:'0 0 8px'}}>{labels.recent}</p>
    <h2 style={{fontSize:20,lineHeight:1.35,fontWeight:500,margin:'0 0 8px',overflowWrap:'anywhere'}}>{video.title || labels.untitled}</h2>
    <p style={{fontSize:14,color:'#b1bfd0',margin:'0 0 14px'}}>{labels[state]}</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
      <Link className="pill on" href={`/history#v-${video.id}`} style={{textDecoration:'none'}} onClick={() => void trackEvent('library_recent_project_opened',{video_id:video.id,state,destination:'history'})}>{state === 'ready' ? labels.open : state === 'failed' ? labels.review : labels.status}</Link>
      {state === 'ready' && video.title && <Link href={buildStudioSeriesReviewHref(video.title,'library_video_card')} prefetch={false} style={{color:'#8ac5ff',fontSize:14}} onClick={() => void trackEvent('series_continue_clicked',{video_id:video.id,source:'library_video_card',placement:'recent_project'})}>{labels.next} →</Link>}
    </div>
  </section>
}

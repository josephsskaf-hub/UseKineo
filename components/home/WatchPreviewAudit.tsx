'use client'

import {useEffect,useState} from 'react'

// Visible reviewer instrumentation, only on the noindex preview. It never sends data.
export default function WatchPreviewAudit(){
  const [report,setReport]=useState({bytes:0,encoded:0,requests:0,unknown:0,frozen:false,video:'',unknownNames:''})
  useEffect(()=>{
    let frozen=false
    const sample=()=>{
      const resources=performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const navigation=performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      const entries=[...navigation,...resources]
      const unknown=resources.filter(e=>!e.name.startsWith(location.origin+'/')&&e.transferSize===0)
      setReport({bytes:entries.reduce((n,e)=>n+e.transferSize,0),encoded:entries.reduce((n,e)=>n+e.encodedBodySize,0),requests:entries.length,unknown:unknown.length,frozen,video:resources.filter(e=>/\.mp4(?:[?#]|$)/.test(e.name)).map(e=>new URL(e.name).pathname).join(', '),unknownNames:unknown.map(e=>{const u=new URL(e.name);return u.origin+u.pathname+' ('+e.initiatorType+')'}).join(', ')})
    }
    const observer=new PerformanceObserver(()=>{if(!frozen)sample()})
    observer.observe({type:'resource',buffered:true})
    const freeze=()=>{if(frozen)return;frozen=true;observer.disconnect();window.removeEventListener('load',sample);sample()}
    document.addEventListener('scroll',freeze,{capture:true,passive:true})
    window.addEventListener('load',sample)
    sample()
    return()=>{observer.disconnect();document.removeEventListener('scroll',freeze,true);window.removeEventListener('load',sample)}
  },[])
  return <aside data-watch-audit data-transfer-bytes={report.bytes} data-unknown={report.unknown} data-frozen={report.frozen} data-build-mode={process.env.NODE_ENV} style={{padding:24,fontSize:14,background:'#191b1e',color:'#fff'}}>
    <h2 style={{fontSize:20}}>Preview review · first-screen transfer</h2>
    <p>{report.bytes.toLocaleString('en-US')} bytes transferred · {report.encoded.toLocaleString('en-US')} encoded body bytes · {report.requests} requests · {process.env.NODE_ENV} build.</p>
    <p>{report.frozen?'Frozen at first scroll.':'Recording until first scroll.'} Resource Timing includes navigation and all reported resources. Cross-origin entries with an unavailable size: {report.unknown}.</p>
    <p>Video requests: {report.video||'none'}</p>
    <p>Unreported external sizes: {report.unknownNames||'none'}</p>
    <p>For a cold measurement, open a fresh origin before scrolling. This report does not initiate generation or send telemetry.</p>
  </aside>
}

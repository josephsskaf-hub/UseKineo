'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cadastroComVolta } from '@/lib/growth/visitanteEscreveAntes'
import { comPrimeiroQuadro } from '@/lib/videoPrimeiroQuadro'
import { downloadHref } from '@/lib/downloadNosso'
import { SEU_VIDEO_LIMITES, validarPrompt, type SeuVideoGender, type SeuVideoPresentation } from '@/lib/recreate/seuVideoRules'
import { SEU_VIDEO_CATALOG, seuVideoCatalogItem } from '@/lib/recreate/seuVideoCatalog'
import { SEU_VIDEO_PREVIEW_PATH } from '@/lib/recreate/seuVideoPreviewRelease'
import { createSeuVideoClient, defaultSeuVideoPrompt, genderSeuVideoPrompt, estimateSeuVideoCredits, isSeuVideoRefusal, validateSeuVideoFile, validateSeuVideoPhotos, SeuVideoClientError, type CheckedSeuVideo, type SeuVideoClip } from '@/lib/recreate/seuVideoClient'
import { saveSeuVideoDraft, restoreSeuVideoDraft, getSeuVideoDraftRef, clearSeuVideoDraft, type SeuVideoDraft } from '@/lib/recreate/seuVideoDraft'
import './seu-video.css'

type Props = {signedIn:boolean;generationAllowed:boolean;accountKey:string|null;presentation:SeuVideoPresentation;initialExample?:string;draftRef?:string}
type Source = SeuVideoDraft['source']
const activeKey = (account:string) => 'kineo:recreate:seu-video:active:'+account
const MAX_STATUS_CHECKS = 60
const positionsFor = (people:number):string[] => people===1?[]:people===2?['on the left','on the right']:['on the left','in the center','on the right']
const validGenders = (values:readonly (SeuVideoGender|null)[],people:number):values is SeuVideoGender[] => values.length===people&&values.every(value=>value==='man'||value==='woman')
const suggestedPrompt = (values:readonly (SeuVideoGender|null)[],people:number) => validGenders(values,people)?genderSeuVideoPrompt(values,positionsFor(people)):''

export default function SeuVideoRecreateClient({signedIn,generationAllowed,accountKey,presentation,initialExample,draftRef}:Props){
  const client=useMemo(()=>createSeuVideoClient({presentation}),[presentation])
  const first=seuVideoCatalogItem(initialExample)??SEU_VIDEO_CATALOG[0]
  const [source,setSource]=useState<Source>({kind:'catalog',id:first.id})
  const [photos,setPhotos]=useState<(File|null)[]>([])
  const [people,setPeople]=useState<1|2|3>(1)
  const [genders,setGenders]=useState<(SeuVideoGender|null)[]>([])
  const [prompt,setPrompt]=useState('')
  const [promptEdited,setPromptEdited]=useState(false)
  const [consent,setConsent]=useState(false)
  const [videoUrl,setVideoUrl]=useState(first.src)
  const [photoUrls,setPhotoUrls]=useState<string[]>([])
  const [seconds,setSeconds]=useState<number|null>(null)
  const [localError,setLocalError]=useState('')
  const [message,setMessage]=useState('')
  const [restoring,setRestoring]=useState(true)
  const [busy,setBusy]=useState(false)
  const [uncertain,setUncertain]=useState(false)
  const [checked,setChecked]=useState<CheckedSeuVideo|null>(null)
  const [clip,setClip]=useState<SeuVideoClip|null>(null)
  const [statusRetry,setStatusRetry]=useState(0)
  const [statusPaused,setStatusPaused]=useState(false)
  const keyRef=useRef<string|null>(null)
  const lock=useRef(false)
  const videoInput=useRef<HTMLInputElement>(null)
  const referenceVideo=useRef<HTMLVideoElement>(null)
  const photoInput=useRef<HTMLInputElement>(null)
  const photoSlot=useRef(0)
  const catalogFiles=useRef(new Map<string,File>())
  const alive=useRef(true)
  const runController=useRef<AbortController|null>(null)
  const pollBudget=useRef({id:'',checks:0})
  const selected=source.kind==='catalog'?seuVideoCatalogItem(source.id):null
  const cost=checked?.credits??(seconds===null?null:estimateSeuVideoCredits(seconds))
  const locked=restoring||busy||uncertain||!!clip
  const gendersReady=validGenders(genders,people)
  const display=checked?.presentation??presentation
  const audioNote=display.audio==='silent'?'Silent video in this version.':'Original audio when available. Some videos may be silent.'
  const durationNote=`Choose a video between ${presentation.minSeconds} and ${presentation.maxSeconds} seconds long.`

  useEffect(()=>{alive.current=true;return()=>{alive.current=false;runController.current?.abort()}},[])
  useEffect(()=>{
    let cancelled=false
    setRestoring(true)
    void restoreSeuVideoDraft(draftRef).then(d=>{
      if(cancelled)return
      if(!d){if(draftRef)setMessage('This saved draft is unavailable or has expired. Choose your files again before generating.');return}
      const restoredGenders=Array.from({length:d.people},(_,i)=>d.genders?.[i]??null)
      const normalized=d.prompt.replace(/\s+/g,' ').trim()
      const automatic=normalized===defaultSeuVideoPrompt(d.people)||normalized===defaultSeuVideoPrompt(d.people,positionsFor(d.people))||normalized===suggestedPrompt(restoredGenders,d.people)
      setSeconds(null);setLocalError('');setSource(d.source);setPhotos(d.photos);setPeople(d.people);setGenders(restoredGenders);setPrompt(automatic?suggestedPrompt(restoredGenders,d.people):d.prompt);setPromptEdited(!automatic);setConsent(d.consent);keyRef.current=d.requestKey??null
      setMessage('Your video, photos and instruction are back. Review them, then press Generate. Nothing starts on return.')
    }).catch(()=>{if(!cancelled)setMessage('Your saved files could not be restored. Keep your original files and choose them again before generating.')}).finally(()=>{if(!cancelled)setRestoring(false)})
    return()=>{cancelled=true}
  },[draftRef])

  useEffect(()=>{
    let cancelled=false
    if(source.kind==='catalog'){
      setVideoUrl(seuVideoCatalogItem(source.id)?.src??'')
      return
    }
    const url=URL.createObjectURL(source.file);setVideoUrl(comPrimeiroQuadro(url)??url)
    void validateSeuVideoFile(source.file,presentation).then(meta=>{if(!cancelled)setSeconds(meta.seconds)}).catch(e=>{if(!cancelled)setLocalError(e instanceof Error?e.message:'Could not read this video.')})
    return()=>{cancelled=true;URL.revokeObjectURL(url)}
  },[source,presentation])
  useEffect(()=>{
    if(source.kind!=='catalog')return
    const video=referenceVideo.current
    const expected=seuVideoCatalogItem(source.id)?.src
    if(!video||video.getAttribute('src')!==expected)return
    const read=()=>{
      if(video.readyState<1)return
      const n=video.duration
      const valid=Number.isFinite(n)&&n>=presentation.minSeconds&&n<=presentation.maxSeconds
      setSeconds(valid?n:null);setLocalError(valid?'':durationNote)
    }
    read()
    video.addEventListener('loadedmetadata',read)
    return()=>video.removeEventListener('loadedmetadata',read)
  },[source,videoUrl,presentation,durationNote])
  useEffect(()=>{
    const urls=photos.map(file=>file?URL.createObjectURL(file):'');setPhotoUrls(urls)
    return()=>urls.forEach(url=>{if(url)URL.revokeObjectURL(url)})
  },[photos])

  useEffect(()=>{
    if(!signedIn||!accountKey||draftRef)return
    try{
      const raw=sessionStorage.getItem(activeKey(accountKey))
      if(!raw)return
      const saved=JSON.parse(raw) as {id?:unknown;at?:unknown}
      if(typeof saved.id==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(saved.id)&&typeof saved.at==='number'&&Date.now()-saved.at>=0&&Date.now()-saved.at<24*60*60*1000){
        setClip({id:saved.id,status:'pending',refundConfirmed:false})
      }
    }catch{/* A missing local status pointer never starts a request. */}
  },[signedIn,accountKey,draftRef])
  const clipId=clip?.id,clipStatus=clip?.status,refundConfirmed=clip?.refundConfirmed
  useEffect(()=>{if(clipId&&clipStatus==='failed')void clearSeuVideoDraft().catch(()=>{})},[clipId,clipStatus])
  useEffect(()=>{
    if(!signedIn||!clipId||clipStatus==='done'||(clipStatus==='failed'&&refundConfirmed))return
    let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined
    const controller=new AbortController()
    if(pollBudget.current.id!==clipId)pollBudget.current={id:clipId,checks:0}
    const read=async()=>{
      if(pollBudget.current.checks>=MAX_STATUS_CHECKS){setStatusPaused(true);setMessage('Automatic status checks paused. Refresh status or check My videos. This will not send another generation.');return}
      pollBudget.current.checks++
      try{
        const result=await client.getSeuVideoStatus(clipId,controller.signal)
        if(cancelled)return
        setClip(result)
        if(result.status==='done'||(result.status==='failed'&&result.refundConfirmed)){
          if(accountKey)try{sessionStorage.removeItem(activeKey(accountKey))}catch{}
          return
        }
        timer=setTimeout(()=>void read(),5000)
      }catch{if(!cancelled)setMessage('Status is unavailable. Refresh the status here or open My videos. This will not send another generation.')}
    }
    void read()
    return()=>{cancelled=true;controller.abort();if(timer)clearTimeout(timer)}
  },[client,signedIn,accountKey,clipId,clipStatus,refundConfirmed,statusRetry])

  function invalidate(){keyRef.current=null;setChecked(null);setMessage('');setUncertain(false)}
  function chooseExample(id:string){if(locked||!seuVideoCatalogItem(id))return;invalidate();setSeconds(null);setLocalError('');setSource({kind:'catalog',id})}
  function chooseVideo(file?:File){if(locked||!file)return;invalidate();setSeconds(null);setLocalError('');setSource({kind:'upload',file})}
  function choosePhoto(file?:File){
    if(locked||!file)return
    if(photoSlot.current<0||photoSlot.current>=people)return
    try{validateSeuVideoPhotos([file])}catch(e){setMessage(e instanceof Error?e.message:'Choose a photo.');return}
    invalidate();setPhotos(current=>{const next=Array.from({length:people},(_,i)=>current[i]??null);next[photoSlot.current]=file;return next})
    const replacing=photos[photoSlot.current]!=null
    const next=Array.from({length:people},(_,i)=>i===photoSlot.current&&replacing?null:genders[i]??null);setGenders(next);if(!promptEdited)setPrompt(suggestedPrompt(next,people))
  }
  function removePhoto(index:number){if(locked)return;invalidate();setPhotos(p=>p.map((file,n)=>n===index?null:file));const next=Array.from({length:people},(_,i)=>i===index?null:genders[i]??null);setGenders(next);if(!promptEdited)setPrompt(suggestedPrompt(next,people))}
  function changePeople(n:1|2|3){if(locked)return;invalidate();const next=Array.from({length:n},(_,i)=>genders[i]??null);setPeople(n);setPhotos(p=>p.slice(0,n));setGenders(next);if(!promptEdited)setPrompt(suggestedPrompt(next,n))}
  function changeGender(index:number,value:SeuVideoGender){if(locked)return;invalidate();const next=Array.from({length:people},(_,i)=>i===index?value:genders[i]??null);setGenders(next);if(!promptEdited)setPrompt(suggestedPrompt(next,people));else setMessage('Your edited instruction is unchanged. Review it against the selected photos before generating.')}
  function refreshStatus(){pollBudget.current.checks=0;setStatusPaused(false);setMessage('');setStatusRetry(n=>n+1)}
  async function referenceFile(signal:AbortSignal):Promise<File>{
    if(source.kind==='upload')return source.file
    const item=seuVideoCatalogItem(source.id)
    if(!item)throw new Error('Choose an available video.')
    const cached=catalogFiles.current.get(item.id)
    if(cached)return cached
    const response=await fetch(item.src,{signal,credentials:'same-origin'})
    if(!response.ok)throw new Error('Could not load this reference. Choose another video or retry.')
    const file=new File([await response.blob()],item.id+'.mp4',{type:'video/mp4'})
    catalogFiles.current.set(item.id,file)
    return file
  }

  async function generate(){
    if(lock.current||clip||restoring)return
    setMessage('')
    if(localError){setMessage(localError);return}
    if(cost===null){setMessage(durationNote);return}
    if(!gendersReady){setMessage('Choose Man or Woman for every photo before generating.');return}
    const valid=validarPrompt(prompt,people)
    if(!valid.ok){setMessage(valid.error);return}
    const readyPhotos=photos.filter((p):p is File=>p!==null)
    if(readyPhotos.length!==people){setMessage('Add one photo for each person you want to replace.');return}
    try{validateSeuVideoPhotos(readyPhotos)}catch(e){setMessage(e instanceof Error?e.message:'Check your photos.');return}
    if(!consent){setMessage('Confirm you have permission to use the video and photos.');return}
    if(signedIn&&!generationAllowed){setMessage('Generation in this preview is currently available to approved accounts only. Your files are still here.');return}
    lock.current=true;setBusy(true)
    const controller=new AbortController();runController.current=controller
    try{
      if(!keyRef.current)keyRef.current='seu-video-'+crypto.randomUUID()
      if(!signedIn){
        const saved=await saveSeuVideoDraft({source,photos:readyPhotos,genders,prompt:valid.prompt,people,consent,requestKey:keyRef.current})
        if(!alive.current||controller.signal.aborted)return
        if(!saved)throw new Error('Could not save your files on this device. Keep this page open and try again. Your files have not been sent.')
        const ref=getSeuVideoDraftRef()
        if(!ref)throw new Error('Could not preserve your files for sign-up. Keep this page open and try again.')
        window.location.assign(cadastroComVolta(SEU_VIDEO_PREVIEW_PATH+'?'+new URLSearchParams({draft:ref}).toString()))
        return
      }
      let prepared=checked
      if(!prepared){
        prepared=await client.prepareSeuVideo({file:await referenceFile(controller.signal),people,genders,positions:positionsFor(people)},controller.signal)
        if(!alive.current)return
        setChecked(prepared)
        const changedCost=prepared.credits!==cost
        const changedPrompt=!promptEdited&&prepared.prompt!==prompt
        if(changedPrompt)setPrompt(prepared.prompt)
        if(changedCost||changedPrompt){setMessage(`Video checked. Review the instruction and confirmed cost of ${prepared.credits} credits, then press Generate again.`);return}
      }
      if(!uncertain&&prepared.needs_plan){setMessage('This video length requires a paid plan. Your files are still here.');return}
      if(!uncertain&&(prepared.shortfall??0)>0){setMessage(`You need ${prepared.shortfall} more credits. Your files are still here.`);return}
      const result=await client.generateSeuVideo({checked:prepared,photos:readyPhotos,prompt:valid.prompt,promptEdited:true,genders,consent:true,key:keyRef.current,confirmedCredits:cost},controller.signal)
      if(!alive.current)return
      setClip(result.clip);setUncertain(false)
      if(accountKey)try{sessionStorage.setItem(activeKey(accountKey),JSON.stringify({id:result.clip.id,at:Date.now()}))}catch{}
      try{await clearSeuVideoDraft()}catch{/* Accepted request remains visible even if local cleanup fails. */}
    }catch(e){
      if(!alive.current)return
      if(e instanceof SeuVideoClientError){
        setUncertain(e.outcome==='unknown'||e.code==='idempotency_conflict')
        if(e.outcome==='unknown'){setMessage('Could not confirm whether this request started. Keep this page open and retry the same request, or check My videos.');return}
        if(isSeuVideoRefusal(e.code)){keyRef.current=null;setChecked(null);void clearSeuVideoDraft().catch(()=>{});setMessage(e.message);return}
        if(e.status===401){
          const ref=getSeuVideoDraftRef()
          if(ref){window.location.assign(cadastroComVolta(SEU_VIDEO_PREVIEW_PATH+'?'+new URLSearchParams({draft:ref}).toString()));return}
        }
        setMessage(e.code==='idempotency_conflict'?'This request may already exist. Keep it unchanged and check My videos before creating another.':e.message)
      }else setMessage(e instanceof Error?e.message:'Could not confirm this request. Keep this page open.')
    }finally{lock.current=false;if(alive.current)setBusy(false)}
  }

  function makeAnother(){
    if(!clip||!['done','failed'].includes(clip.status))return
    setClip(null);setMessage('');setChecked(null);setUncertain(false);setStatusPaused(false);keyRef.current=null
    if(accountKey)try{sessionStorage.removeItem(activeKey(accountKey))}catch{}
  }
  function recheck(){if(busy||uncertain||clip)return;setChecked(null);keyRef.current=null;setMessage('Your files and instruction are unchanged. Press Generate to check availability again.')}
  const canSubmit=!restoring&&!busy&&!localError&&cost!==null&&photos.filter(Boolean).length===people&&gendersReady&&consent&&prompt.trim().length>0
  return <main className="sv-page" data-seu-video-preview="" aria-busy={restoring||busy}>
    <header className="sv-nav"><Link className="sv-brand" href="/watch-preview"><span>▸</span> kineo</Link><nav aria-label="Products"><Link href="/watch-preview">Watch</Link><Link href={SEU_VIDEO_PREVIEW_PATH} aria-current="page">Recreate</Link></nav><div className="sv-nav-right"><Link href="/pricing">Pricing</Link><Link href={signedIn?'/library':'/login'}>{signedIn?'My videos':'Log in'}</Link></div></header>
    <div className="sv-wrap"><div className="sv-intro"><div><p className="sv-kicker">Recreate · preview</p><h1>Recreate with your video</h1></div><p>{display.resolution} · {audioNote} {display.waitLabel}. Generation is currently limited to approved accounts.</p></div>
      {clip ? <section className="sv-card sv-result" aria-live="polite" data-seu-video-result={clip.status}>
        <h2>{clip.status==='done'?'Your version is ready':clip.status==='failed'?'This version could not be completed':'Creating your version'}</h2>
        {clip.status==='done'&&clip.video_url?<><video src={comPrimeiroQuadro(clip.video_url)} controls playsInline preload="metadata" aria-label="Your generated video"/><div className="sv-actions"><a className="sv-button" href={downloadHref(clip.video_url,'kineo-recreate-'+clip.id+'.mp4','recreate-preview')} download>Download</a><Link className="sv-button" href="/library">My videos ↗</Link></div></>:null}
        {clip.status==='pending'||clip.status==='processing'?<><progress aria-label="Creating your video"/><p>{display.waitLabel}. You can leave this page; your video will be in My videos.</p><p className="sv-note">{audioNote}</p></>:null}
        {clip.status==='failed'?<><p>{clip.message??(clip.reason==='not_swapped'||clip.reason==='swap_unchanged'?'The person in your video was not replaced. Try a clearer photo or another video.':'This request failed. Try another photo or video.')}</p><p>{clip.refundConfirmed?`${clip.credits_refunded} credits were returned.`:'The credit return has not been confirmed yet. Refresh the status or check My videos.'}</p></>:null}
        {statusPaused?<p className="sv-note">Automatic checking is paused. Use Refresh status to check again.</p>:null}{message?<p className="sv-alert" role="status">{message}</p>:null}<div className="sv-actions"><button className="sv-button" type="button" onClick={refreshStatus}>Refresh status</button><Link className="sv-button" href="/library">My videos ↗</Link>{['done','failed'].includes(clip.status)?<button className="sv-button" type="button" onClick={makeAnother}>Make another</button>:null}</div>
      </section>:<div className="sv-grid">
        <section className="sv-card sv-reference" aria-labelledby="sv-reference-title"><h2 className="sv-step" id="sv-reference-title"><b>1</b>Reference video</h2>
          <div className="sv-frame">{videoUrl?<video ref={referenceVideo} key={videoUrl} src={videoUrl} poster={selected?.poster} controls playsInline muted preload="metadata" aria-label="Selected reference video" onLoadedMetadata={e=>{if(source.kind==='catalog'){const n=e.currentTarget.duration;setSeconds(Number.isFinite(n)&&n>=presentation.minSeconds&&n<=presentation.maxSeconds?n:null);if(!Number.isFinite(n)||n<presentation.minSeconds||n>presentation.maxSeconds)setLocalError(durationNote)}}}/>:<div className="sv-frame-empty"><strong>Your video goes here</strong><span>Upload a video or choose one below.</span></div>}</div>
          <p className="sv-file-name">{source.kind==='upload'?source.file.name:selected?.title}</p><p className="sv-note sv-format-note">MP4 or MOV · {presentation.minSeconds}–{presentation.maxSeconds} seconds · {presentation.minFps}–{presentation.maxFps} fps · up to {Math.round(presentation.maxBytes/1024/1024)} MB{presentation.minSide>0?<> · Input: 720p or higher (at least {presentation.minSide} px per side)</>:null}</p>
          {localError?<p className="sv-alert" role="alert">{localError}</p>:null}<div className="sv-actions"><button className="sv-button" type="button" disabled={locked} onClick={()=>videoInput.current?.click()}>Upload your video</button></div>
          <input ref={videoInput} type="file" accept="video/mp4,video/quicktime,.mp4,.mov" aria-label="Choose reference video file" onChange={e=>{chooseVideo(e.target.files?.[0]);e.target.value=''}}/>
          <details className="sv-catalog"><summary>Choose from the catalog <span aria-hidden="true">＋</span></summary><div className="sv-catalog-grid">{SEU_VIDEO_CATALOG.map(item=><button type="button" key={item.id} disabled={locked} aria-pressed={source.kind==='catalog'&&source.id===item.id} onClick={()=>chooseExample(item.id)}>{item.poster?<img src={item.poster} alt="" loading="lazy"/>:null}<span>{item.title}</span></button>)}</div></details><p className="sv-note">Your uploads stay on this device until you press Generate.</p>
        </section>
        <section className="sv-card sv-editor" aria-label="Your version">
          <div><div className="sv-step"><b>2</b><span>Your photos</span><div className="sv-count" role="group" aria-label="People to replace">{([1,2,3] as const).map(n=><button type="button" key={n} disabled={locked} aria-label={`${n} ${n===1?'person':'people'}`} aria-pressed={people===n} onClick={()=>changePeople(n)}>{n}</button>)}</div></div>
            <div className="sv-photos">{Array.from({length:people},(_,i)=><div className="sv-photo" key={i}>{photoUrls[i]?<><img src={photoUrls[i]} alt={`Person ${i+1} reference`}/><button type="button" className="sv-photo-remove" disabled={locked} aria-label={`Remove photo ${i+1}`} onClick={()=>removePhoto(i)}>×</button></>:<span className="sv-photo-empty">Photo {i+1}</span>}<button type="button" disabled={locked} onClick={()=>{photoSlot.current=i;photoInput.current?.click()}}>{photos[i]?'Change photo':'Add photo'}</button><span className="sv-position-label">{people===1?'Main person in the video':`Person ${positionsFor(people)[i]} in the video`}</span><div className="sv-gender-options" role="group" aria-label={`Who is in photo ${i+1}?`}>{(['man','woman'] as const).map(value=><button className="sv-gender-option" type="button" key={value} disabled={locked} aria-label={`Photo ${i+1}: ${value==='man'?'Man':'Woman'}`} aria-pressed={genders[i]===value} onClick={()=>changeGender(i,value)}>{value==='man'?'Man':'Woman'}</button>)}</div></div>)}</div><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose person photo" onChange={e=>{choosePhoto(e.target.files?.[0]);e.target.value=''}}/><p className="sv-note">One photo per person · JPG, PNG or WebP · up to 8 MB each. Choose Man or Woman for every photo.</p>
          </div>
          <div><label className="sv-step" htmlFor="sv-prompt"><b>3</b>Prompt</label><textarea className="sv-prompt" id="sv-prompt" value={prompt} placeholder="Choose Man or Woman for each photo to fill the instruction." disabled={locked} maxLength={SEU_VIDEO_LIMITES.maxPrompt} onChange={e=>{invalidate();setPrompt(e.target.value);setPromptEdited(true)}}/><p className="sv-prompt-count">{prompt.length} / {SEU_VIDEO_LIMITES.maxPrompt}</p><p className="sv-note">Edit the instruction for your scene. Keep @Video1 and the @Image number for every photo.</p><button type="button" className="sv-subtle" disabled={locked||!gendersReady} onClick={()=>{if(locked||!gendersReady)return;invalidate();setPrompt(suggestedPrompt(genders,people));setPromptEdited(false)}}>Use the suggested instruction</button></div>
          <label className="sv-permission"><input type="checkbox" checked={consent} disabled={locked} onChange={e=>{invalidate();setConsent(e.target.checked)}}/>I have permission to use this video and these photos, and I agree to send them for processing when I press Generate.</label>
          {restoring?<p className="sv-note" role="status">Restoring your saved files…</p>:null}{message?<p className="sv-alert" role="status">{message}</p>:null}
          <div><button className="sv-generate" type="button" data-seu-video-generate="" disabled={!canSubmit} onClick={()=>void generate()}>{busy?'Preparing…':uncertain?'Retry Generate':'Generate'}{cost!==null?<span data-seu-video-cost={checked?'confirmed':'estimated'}>✦ {checked?'':'Estimated '}{cost} credits</span>:null}</button><p className="sv-note">{audioNote} · {display.resolution} · {display.waitLabel}. Nothing starts until you press Generate.</p>{checked?.needs_plan||(checked?.shortfall??0)>0?<><Link className="sv-subtle" href="/pricing">See plans ↗</Link>{!uncertain?<button className="sv-subtle" type="button" disabled={busy} onClick={recheck}>Check again</button>:null}</>:null}{uncertain?<p className="sv-note">Keep this page open and retry the same request. If you leave, check My videos before starting another.</p>:null}</div>
        </section>
      </div>}
    </div>
  </main>
}

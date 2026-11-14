'use client'

import Link from 'next/link'
import { KineoBrandIcon } from '@/components/KineoBolt'
import CreateTabs from '@/components/create/CreateTabs'
import CreateNavConta from '@/components/create/CreateNavConta'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cadastroComVolta } from '@/lib/growth/visitanteEscreveAntes'
import { comPrimeiroQuadro } from '@/lib/videoPrimeiroQuadro'
import { downloadHref } from '@/lib/downloadNosso'
import { SEU_VIDEO_LIMITES, validarPrompt, promptPorGeneroOpcional, type SeuVideoGender, type SeuVideoPresentation } from '@/lib/recreate/seuVideoRules'
import { SEU_VIDEO_CATALOG, seuVideoCatalogItem } from '@/lib/recreate/seuVideoCatalog'
import { SEU_VIDEO_PREVIEW_PATH } from '@/lib/recreate/seuVideoPreviewRelease'
import { createSeuVideoClient, defaultSeuVideoPrompt, estimateSeuVideoCredits, isSeuVideoRefusal, validateSeuVideoFile, validateSeuVideoPhotos, SeuVideoClientError, type CheckedSeuVideo, type SeuVideoClip, type SeuVideoPhase } from '@/lib/recreate/seuVideoClient'
import { saveSeuVideoDraft, restoreSeuVideoDraft, getSeuVideoDraftRef, clearSeuVideoDraft, type SeuVideoDraft } from '@/lib/recreate/seuVideoDraft'
import './seu-video.css'
import '../recreate/recreate.css'
import './seu-video-current-flow.css'

type Props = {signedIn:boolean;generationAllowed:boolean;accountKey:string|null;presentation:SeuVideoPresentation;initialExample?:string;draftRef?:string;currentFlow?:boolean;flowBasePath?:'/recreate'|'/recreate-flow-preview';createTabs?:boolean}
type Source = SeuVideoDraft['source']
const activeKey = (account:string) => 'kineo:recreate:seu-video:active:'+account
// Tab/account-scoped evidence only: no remote payload, signed path, files or credentials.
// Expiry forbids replay; it never silently turns an unresolved attempt into a new one.
const uncertainKey = (account:string) => 'kineo:recreate:seu-video:uncertain:'+account
const ATTEMPT_TTL = 24*60*60*1000
const RECOVERY_MESSAGE = 'An earlier generation is still unconfirmed. Check My videos before starting another. This page cannot resend it without the original request.'
function readAttempt(account:string):{requestKey:string;expired:boolean}|null{
  const raw=sessionStorage.getItem(uncertainKey(account))
  if(!raw)return null
  const value=JSON.parse(raw) as Record<string,unknown>
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['version','account','requestKey','at'].includes(key))||value.version!==1||value.account!==account||typeof value.requestKey!=='string'||!/^[A-Za-z0-9._:-]{8,100}$/.test(value.requestKey)||typeof value.at!=='number'||!Number.isFinite(value.at)||value.at<0||value.at>Date.now()+60_000)throw new Error('The previous generation record could not be verified. Check My videos before starting another.')
  return{requestKey:value.requestKey,expired:Date.now()-value.at>ATTEMPT_TTL}
}
function rememberAttempt(account:string,key:string):void{
  const previous=readAttempt(account)
  if(previous&&(previous.requestKey!==key||previous.expired))throw new Error(RECOVERY_MESSAGE)
  const raw=JSON.stringify({version:1,account,requestKey:key,at:Date.now()})
  sessionStorage.setItem(uncertainKey(account),raw)
  if(sessionStorage.getItem(uncertainKey(account))!==raw)throw new Error('Could not preserve this request on this device. Keep this page open and try again. Nothing was sent.')
}
function forgetAttempt(account:string,key:string|null):void{
  try{if(key&&readAttempt(account)?.requestKey===key)sessionStorage.removeItem(uncertainKey(account))}catch{/* Unverified recovery evidence is never removed. */}
}
const MAX_STATUS_CHECKS = 60
const positionsFor = (people:number):string[] => people===1?[]:people===2?['on the left','on the right']:['on the left','in the center','on the right']
const legacySuggestedPrompt = (values:readonly (SeuVideoGender|null)[],people:number) => promptPorGeneroOpcional(Array.from({length:people},(_,i)=>values[i]??null),positionsFor(people))

export default function SeuVideoRecreateClient({signedIn,generationAllowed,accountKey,presentation,initialExample,draftRef,currentFlow=false,flowBasePath='/recreate-flow-preview',createTabs=false}:Props){
  function suggestedPrompt(values:readonly (SeuVideoGender|null)[],count:number){
    return currentFlow&&!values.some(value=>value!==null) ? presentation.defaultPrompts?.[count as 1|2|3]??legacySuggestedPrompt(values,count) : legacySuggestedPrompt(values,count)
  }
  const returnPath=currentFlow?flowBasePath+'/your-video':SEU_VIDEO_PREVIEW_PATH
  const [phase,setPhase]=useState<SeuVideoPhase>('local')
  const [genderEditing,setGenderEditing]=useState<number|null>(null)
  const client=useMemo(()=>createSeuVideoClient({presentation,...(currentFlow?{onPhase:setPhase}:{})}),[presentation,currentFlow])
  const first=seuVideoCatalogItem(initialExample)??SEU_VIDEO_CATALOG[0]
  const [source,setSource]=useState<Source>({kind:'catalog',id:first.id})
  const [photos,setPhotos]=useState<(File|null)[]>([])
  const [people,setPeople]=useState<1|2|3>(1)
  const [genders,setGenders]=useState<(SeuVideoGender|null)[]>([null])
  const [prompt,setPrompt]=useState(()=>suggestedPrompt([],1))
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
  const [recoveryOnly,setRecoveryOnly]=useState(false)
  const [checked,setChecked]=useState<CheckedSeuVideo|null>(null)
  const [clip,setClip]=useState<SeuVideoClip|null>(null)
  const [statusRetry,setStatusRetry]=useState(0)
  const [statusPaused,setStatusPaused]=useState(false)
  const keyRef=useRef<string|null>(null)
  const accountRef=useRef(accountKey)
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
  const display=checked?.presentation??presentation
  const audioNote=display.audio==='silent'?'Silent video in this version.':'Original audio when available. Some videos may be silent.'
  const phaseLabel=phase==='video-upload'?'Uploading video…':phase==='photo-upload'?'Uploading photos…':phase==='check'?'Checking your video…':phase==='local'?'Preparing reference…':'Starting your version…'
  const durationNote=`Choose a video between ${presentation.minSeconds} and ${presentation.maxSeconds} seconds long.`

  useEffect(()=>{alive.current=true;return()=>{alive.current=false;runController.current?.abort()}},[])
  useEffect(()=>{
    let cancelled=false
    setRestoring(true)
    if(currentFlow&&accountRef.current!==accountKey){
      accountRef.current=accountKey;runController.current?.abort();keyRef.current=null;setChecked(null);setClip(null);setUncertain(false);setRecoveryOnly(false)
    }
    let recovering=false
    let keepOriginal=currentFlow&&uncertain&&!!checked&&!!keyRef.current
    if(currentFlow&&signedIn&&accountKey){
      try{const attempt=readAttempt(accountKey);if(attempt){recovering=keyRef.current!==attempt.requestKey||!checked;keepOriginal=!recovering;keyRef.current=attempt.requestKey;setUncertain(true);setRecoveryOnly(recovering);setMessage(recovering?RECOVERY_MESSAGE:'The earlier generation is still unconfirmed. Keep this page open and check My videos before retrying the same request.')}}
      catch{recovering=true;setUncertain(true);setRecoveryOnly(true);setMessage(RECOVERY_MESSAGE)}
    }
    if(keepOriginal){setRestoring(false);return()=>{cancelled=true}}
    void restoreSeuVideoDraft(draftRef).then(d=>{
      if(cancelled)return
      if(!d){if(draftRef&&!recovering)setMessage('This saved draft is unavailable or has expired. Choose your files again before generating.');return}
      const restoredGenders=Array.from({length:d.people},(_,i)=>d.genders?.[i]??null)
      const normalized=d.prompt.replace(/\s+/g,' ').trim()
      const automatic=normalized===defaultSeuVideoPrompt(d.people)||normalized===defaultSeuVideoPrompt(d.people,positionsFor(d.people))||normalized===suggestedPrompt(restoredGenders,d.people)
      setSeconds(null);setLocalError('');setSource(d.source);setPhotos(d.photos);setPeople(d.people);setGenders(restoredGenders);setPrompt(automatic?suggestedPrompt(restoredGenders,d.people):d.prompt);setPromptEdited(!automatic);setConsent(d.consent);if(!recovering)keyRef.current=d.requestKey??null
      setMessage(recovering?RECOVERY_MESSAGE:'Your video, photos and instruction are back. Review them, then press Generate. Nothing starts on return.')
    }).catch(()=>{if(!cancelled&&!recovering)setMessage('Your saved files could not be restored. Keep your original files and choose them again before generating.')}).finally(()=>{if(!cancelled)setRestoring(false)})
    return()=>{cancelled=true}
  },[draftRef,currentFlow,signedIn,accountKey])

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
      const saved=JSON.parse(raw) as {id?:unknown;at?:unknown;requestKey?:unknown}
      if(currentFlow){const attempt=readAttempt(accountKey);if(attempt&&attempt.requestKey!==saved.requestKey)return}
      if(typeof saved.id==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(saved.id)&&typeof saved.at==='number'&&Date.now()-saved.at>=0&&Date.now()-saved.at<24*60*60*1000){
        setClip({id:saved.id,status:'pending',refundConfirmed:false})
      }
    }catch{/* A missing local status pointer never starts a request. */}
  },[signedIn,accountKey,draftRef])
  const clipId=clip?.id,clipStatus=clip?.status,refundConfirmed=clip?.refundConfirmed
  useEffect(()=>{if(clipId&&clipStatus==='failed')void clearSeuVideoDraft().catch(()=>{})},[clipId,clipStatus])
  useEffect(()=>{
    if(!signedIn||!clipId||(clipStatus==='done'&&(!currentFlow||!!clip?.video_url))||(clipStatus==='failed'&&refundConfirmed))return
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
        rememberAccepted(result)
        if(result.status==='done'||(result.status==='failed'&&result.refundConfirmed)){
          if(accountKey&&(!currentFlow||result.status!=='done'||!!result.video_url))try{sessionStorage.removeItem(activeKey(accountKey))}catch{}
          return
        }
        timer=setTimeout(()=>void read(),5000)
      }catch{if(!cancelled)setMessage('Status is unavailable. Refresh the status here or open My videos. This will not send another generation.')}
    }
    void read()
    return()=>{cancelled=true;controller.abort();if(timer)clearTimeout(timer)}
  },[client,signedIn,accountKey,clipId,clipStatus,clip?.video_url,refundConfirmed,statusRetry,currentFlow])

  function rememberAccepted(result:SeuVideoClip){
    if(!currentFlow||!accountKey)return
    setUncertain(false);setRecoveryOnly(false)
    try{
      const raw=JSON.stringify({id:result.id,at:Date.now(),requestKey:keyRef.current})
      sessionStorage.setItem(activeKey(accountKey),raw)
      if(sessionStorage.getItem(activeKey(accountKey))===raw)forgetAttempt(accountKey,keyRef.current)
    }catch{/* The accepted ID remains on screen; uncertain evidence survives a failed status-pointer write. */}
  }
  function invalidate(){if(currentFlow&&uncertain)return false;setGenderEditing(null);keyRef.current=null;setChecked(null);setMessage('');setUncertain(false);return true}
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
  function changeGender(index:number,value:SeuVideoGender){if(locked)return;if(currentFlow&&checked&&(checked.genders?.[index]??null)===null){keyRef.current=null;setMessage('')}else invalidate();setGenderEditing(null);const next=Array.from({length:people},(_,i)=>i===index?value:genders[i]??null);setGenders(next);if(!promptEdited)setPrompt(suggestedPrompt(next,people));else setMessage('Your edited instruction is unchanged. Review it against the selected photos before generating.')}
  function refreshStatus(){pollBudget.current.checks=0;setStatusPaused(false);setMessage('');setStatusRetry(n=>n+1)}
  async function referenceFile(signal:AbortSignal):Promise<File>{
    if(source.kind==='upload')return source.file
    const item=seuVideoCatalogItem(source.id)
    if(!item)throw new Error('Choose an available video.')
    const cached=catalogFiles.current.get(item.id)
    if(cached)return cached
    const file=await client.loadReferenceFile(item.src,item.id,signal)
    catalogFiles.current.set(item.id,file)
    return file
  }

  async function generate(){
    if(lock.current||clip||restoring)return
    if(currentFlow&&(recoveryOnly||(uncertain&&(!checked||!signedIn)))){setMessage(RECOVERY_MESSAGE);return}
    setMessage('')
    if(localError){setMessage(localError);return}
    if(cost===null){setMessage(durationNote);return}
    if(currentFlow&&checked&&genders.some(value=>value===null)){setMessage('Choose Man or Woman for the highlighted photo.');return}
    const valid=validarPrompt(prompt,people)
    if(!valid.ok){setMessage(valid.error);return}
    const readyPhotos=photos.filter((p):p is File=>p!==null)
    if(readyPhotos.length!==people){setMessage('Add one photo for each person you want to replace.');return}
    try{validateSeuVideoPhotos(readyPhotos)}catch(e){setMessage(e instanceof Error?e.message:'Check your photos.');return}
    if(!consent){setMessage('Confirm you have permission to use the video and photos.');return}
    if(signedIn&&!generationAllowed){setMessage('Generation in this preview is currently available to approved accounts only. Your files are still here.');return}
    lock.current=true;setBusy(true)
    const controller=new AbortController();runController.current=controller
    let attemptMarked=false
    try{
      if(!keyRef.current)keyRef.current='seu-video-'+crypto.randomUUID()
      if(!signedIn){
        const saved=await saveSeuVideoDraft({source,photos:readyPhotos,genders,prompt:valid.prompt,people,consent,requestKey:keyRef.current})
        if(!alive.current||controller.signal.aborted||(currentFlow&&accountRef.current!==accountKey))return
        if(!saved)throw new Error('Could not save your files on this device. Keep this page open and try again. Your files have not been sent.')
        const ref=getSeuVideoDraftRef()
        if(!ref)throw new Error('Could not preserve your files for sign-up. Keep this page open and try again.')
        window.location.assign(cadastroComVolta(returnPath+'?'+new URLSearchParams({draft:ref}).toString()))
        return
      }
      let prepared=checked
      if(!prepared){
        prepared=await client.prepareSeuVideo({file:await referenceFile(controller.signal),people,photos:readyPhotos,genders,positions:positionsFor(people)},controller.signal)
        if(!alive.current||(currentFlow&&accountRef.current!==accountKey))return
        setChecked(prepared)
        // Server suggestions fill empty slots only. An explicit choice or edited
        // instruction always wins, including a partially completed local draft.
        const suggestions=prepared.suggested_genders
        const merged=Array.from({length:people},(_,i)=>genders[i]??suggestions?.[i]??null)
        const changedGenders=merged.some((value,i)=>value!==(genders[i]??null))
        const completeManual=genders.length===people&&genders.every(value=>value!==null)
        const manualPartial=!completeManual&&genders.some(value=>value!==null)
        const checkedPrompt=manualPartial?suggestedPrompt(merged,people):prepared.prompt
        const changedCost=prepared.credits!==cost
        const changedPrompt=!promptEdited&&checkedPrompt!==prompt
        if(changedGenders)setGenders(merged)
        if(changedPrompt)setPrompt(checkedPrompt)
        if(changedCost||changedPrompt||changedGenders||(currentFlow&&merged.some(value=>value===null))){setMessage(currentFlow&&merged.some(value=>value===null)?'Choose Man or Woman for the highlighted photo.':`Review your instruction · ${prepared.credits} credits. Press Generate to continue.`);return}
      }
      if(!uncertain&&prepared.needs_plan){setMessage('This video length requires a paid plan. Your files are still here.');return}
      if(!uncertain&&(prepared.shortfall??0)>0){setMessage(`You need ${prepared.shortfall} more credits. Your files are still here.`);return}
      if(currentFlow){
        if(!accountKey)throw new Error('Could not verify this account. Keep your files here and sign in again before generating.')
        try{rememberAttempt(accountKey,keyRef.current)}catch{throw new Error('Could not preserve this request on this device. Keep this page open and check My videos before trying again. Nothing new was sent.')}
        attemptMarked=true
      }
      const result=await client.generateSeuVideo({checked:prepared,photos:readyPhotos,prompt:valid.prompt,promptEdited:true,genders,consent:true,key:keyRef.current,confirmedCredits:cost},controller.signal)
      if(!alive.current||(currentFlow&&accountRef.current!==accountKey))return
      setClip(result.clip);setUncertain(false)
      if(currentFlow)rememberAccepted(result.clip)
      else if(accountKey)try{sessionStorage.setItem(activeKey(accountKey),JSON.stringify({id:result.clip.id,at:Date.now()}))}catch{}
      try{await clearSeuVideoDraft()}catch{/* Accepted request remains visible even if local cleanup fails. */}
    }catch(e){
      if(!alive.current||(currentFlow&&accountRef.current!==accountKey))return
      if(e instanceof SeuVideoClientError){
        if(currentFlow&&(uncertain||e.code==='idempotency_conflict'||(attemptMarked&&['queue_full','swap_cap'].includes(e.code)&&e.refusal?.charged!==false))){setUncertain(true);setMessage('The earlier generation is still unconfirmed. Keep this page open and check My videos. An authentication or availability response does not confirm that it stopped.');return}
        setUncertain(e.outcome==='unknown'||e.code==='idempotency_conflict')
        if(e.outcome==='unknown'){setMessage('Could not confirm whether this request started. Keep this page open and retry the same request, or check My videos.');return}
        if(currentFlow&&attemptMarked&&accountKey)forgetAttempt(accountKey,keyRef.current)
        if(isSeuVideoRefusal(e.code)){keyRef.current=null;setChecked(null);void clearSeuVideoDraft().catch(()=>{});setMessage(e.message);return}
        if(e.status===401){
          try{
            const saved=await saveSeuVideoDraft({source,photos:readyPhotos,genders,prompt:valid.prompt,people,consent,requestKey:keyRef.current??undefined})
            if(!alive.current||controller.signal.aborted||(currentFlow&&accountRef.current!==accountKey))return
            if(!saved)throw new Error('Could not save your files on this device. Keep this page open and try again.')
            const ref=getSeuVideoDraftRef()
            if(!ref)throw new Error('Could not preserve your files for sign-in. Keep this page open and try again.')
            window.location.assign(cadastroComVolta(returnPath+'?'+new URLSearchParams({draft:ref}).toString()))
          }catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Could not save your files. Keep this page open and try again.')}
          return
        }
        if(currentFlow&&['queue_full','swap_cap'].includes(e.code)&&e.refusal?.charged!==false){setMessage(e.code==='queue_full'?'Recreate is busy. Please try again later.':'New attempts are paused. Please try again later.');return}
        setMessage(e.code==='idempotency_conflict'?'This request may already exist. Keep it unchanged and check My videos before creating another.':e.message)
      }else{if(currentFlow&&attemptMarked)setUncertain(true);setMessage(e instanceof Error?e.message:'Could not confirm this request. Keep this page open.')}
    }finally{lock.current=false;if(alive.current)setBusy(false)}
  }

  function makeAnother(){
    if(!clip||!['done','failed'].includes(clip.status))return
    if(currentFlow&&accountKey)forgetAttempt(accountKey,keyRef.current)
    setClip(null);setMessage('');setChecked(null);setUncertain(false);setRecoveryOnly(false);setStatusPaused(false);keyRef.current=null
    if(accountKey)try{sessionStorage.removeItem(activeKey(accountKey))}catch{}
  }
  function recheck(){if(busy||uncertain||clip)return;setChecked(null);keyRef.current=null;setMessage('Your files and instruction are unchanged. Press Generate to check availability again.')}
  const canSubmit=!restoring&&!busy&&!recoveryOnly&&!localError&&cost!==null&&photos.filter(Boolean).length===people&&consent&&prompt.trim().length>0&&!(currentFlow&&checked&&genders.some(value=>value===null))
  const instruction=<div><label className="sv-step" htmlFor="sv-prompt"><b>3</b>Prompt</label><textarea className="sv-prompt" id="sv-prompt" value={prompt} disabled={locked} maxLength={SEU_VIDEO_LIMITES.maxPrompt} onChange={e=>{if(!invalidate())return;setPrompt(e.target.value);setPromptEdited(true)}}/><p className="sv-prompt-count">{prompt.length} / {SEU_VIDEO_LIMITES.maxPrompt}</p></div>
  const result=clip?<section className="sv-card sv-result" aria-live="polite" data-seu-video-result={clip.status}>
        <h2>{currentFlow&&clip.queued?'In line'+(clip.queue_position?' · position '+clip.queue_position:''):clip.status==='done'?(currentFlow&&!clip.video_url?'Loading your video…':'Your version is ready'):clip.status==='failed'?'This version could not be completed':'Creating your version'}</h2>
        {clip.status==='done'&&clip.video_url?<><video src={comPrimeiroQuadro(clip.video_url)} controls playsInline preload="metadata" aria-label="Your generated video"/><div className="sv-actions"><a className="sv-button" href={downloadHref(clip.video_url,'kineo-recreate-'+clip.id+'.mp4','recreate-preview')} download>Download</a><Link className="sv-button" href="/library">My videos ↗</Link></div></>:null}
        {currentFlow&&['pending','processing'].includes(clip.status)?<video src={videoUrl} poster={selected?.poster} muted controls playsInline preload="metadata" aria-label="Reference video while waiting"/>:null}
        {clip.status==='pending'||clip.status==='processing'?<><progress aria-label={currentFlow&&clip.queued?'Waiting in line':'Creating your video'}/><p>{currentFlow&&clip.queued?'You can leave this page; we will keep your place.':display.waitLabel+'. You can leave this page; your video will be in My videos.'}</p><p className="sv-note">{audioNote}</p></>:null}
        {clip.status==='failed'?<><p>{(currentFlow&&!clip.refundConfirmed?(clip.reason==='queue_failed'?'Your video could not be completed in time. Refresh status to check the credit return.':undefined):clip.message)??(clip.reason==='not_swapped'||clip.reason==='swap_unchanged'?'The person in your video was not replaced. Try a clearer photo or another video.':'This request failed. Try another photo or video.')}</p><p>{clip.refundConfirmed?`${clip.credits_refunded} credits were returned.`:'The credit return has not been confirmed yet. Refresh the status or check My videos.'}</p></>:null}
        {statusPaused?<p className="sv-note">Automatic checking is paused. Use Refresh status to check again.</p>:null}{message?<p className="sv-alert" role="status">{message}</p>:null}<div className="sv-actions"><button className="sv-button" type="button" onClick={refreshStatus}>Refresh status</button><Link className="sv-button" href="/library">My videos ↗</Link>{['done','failed'].includes(clip.status)?<button className="sv-button" type="button" onClick={makeAnother}>Make another</button>:null}</div>
      </section>:null
  const view=<main className={currentFlow?'sv-page sv-current-flow':'sv-page'} data-seu-video-flow={currentFlow?'current':undefined} data-seu-video-result-stage={currentFlow&&clip?'true':undefined} data-seu-video-preview="" aria-busy={restoring||busy}>
    {currentFlow?<header className={createTabs?'rc-nav ct-nav':'rc-nav'}><Link className="rc-brand" href="/"><KineoBrandIcon size={28}/><span>Kineo</span></Link>{createTabs?<CreateTabs active="recreate" {...{recreateHref:flowBasePath}}/>:<Link href={flowBasePath}>Recreate</Link>}{createTabs?<CreateNavConta/>:<Link href={signedIn?'/library':'/login'}>{signedIn?'My videos ↗':'Log in'}</Link>}</header>:<header className="sv-nav"><Link className="sv-brand" href="/watch-preview"><span>▸</span> kineo</Link><nav aria-label="Products"><Link href="/watch-preview">Watch</Link><Link href={SEU_VIDEO_PREVIEW_PATH} aria-current="page">Recreate</Link></nav><div className="sv-nav-right"><Link href="/pricing">Pricing</Link><Link href={signedIn?'/library':'/login'}>{signedIn?'My videos':'Log in'}</Link></div></header>}
    <div className="sv-wrap"><div className="sv-intro"><h1>{currentFlow?'Your video, your version.':'Recreate with your video'}</h1></div>
      {clip&&!currentFlow ? result : <div className="sv-grid">
        {clip&&currentFlow?result:<>
        <section className="sv-card sv-reference" aria-labelledby="sv-reference-title"><h2 className="sv-step" id="sv-reference-title"><b>{currentFlow?2:1}</b>Reference video</h2>
          <div className="sv-frame">{currentFlow&&busy?<span className="sv-stage-status" role="status">{phase==='video-upload'?'Uploading video…':phase==='photo-upload'?'Preparing photos…':phase==='check'?'Checking your video…':'Starting your version…'}</span>:null}{videoUrl?<video ref={referenceVideo} key={videoUrl} src={videoUrl} poster={selected?.poster} controls playsInline muted preload="metadata" aria-label="Selected reference video" onLoadedMetadata={e=>{if(source.kind==='catalog'){const n=e.currentTarget.duration;setSeconds(Number.isFinite(n)&&n>=presentation.minSeconds&&n<=presentation.maxSeconds?n:null);if(!Number.isFinite(n)||n<presentation.minSeconds||n>presentation.maxSeconds)setLocalError(durationNote)}}}/>:<div className="sv-frame-empty"><strong>Your video goes here</strong><span>Upload a video or choose one below.</span></div>}</div>
          <p className="sv-file-name">{source.kind==='upload'?source.file.name:selected?.title}</p>
          {localError?<p className="sv-alert" role="alert">{localError}</p>:null}<div className="sv-actions"><button className="sv-button" type="button" disabled={locked} onClick={()=>videoInput.current?.click()}>Upload your video</button></div>
          <input ref={videoInput} type="file" accept="video/mp4,video/quicktime,.mp4,.mov" aria-label="Choose reference video file" onChange={e=>{chooseVideo(e.target.files?.[0]);e.target.value=''}}/>
          <details className="sv-catalog"><summary>Choose from the catalog <span aria-hidden="true">＋</span></summary><div className="sv-catalog-grid">{SEU_VIDEO_CATALOG.map(item=><button type="button" key={item.id} disabled={locked} aria-pressed={source.kind==='catalog'&&source.id===item.id} onClick={()=>chooseExample(item.id)}>{item.poster?<img src={item.poster} alt="" loading="lazy"/>:null}<span>{item.title}</span></button>)}</div></details>
        </section>
        </>}
        <section className="sv-card sv-editor" aria-label="Your version">
          <div><div className="sv-step"><b>{currentFlow?1:2}</b><span>Your photos</span><div className="sv-count" role="group" aria-label="People to replace">{([1,2,3] as const).map(n=><button type="button" key={n} disabled={locked} aria-label={`${n} ${n===1?'person':'people'}`} aria-pressed={people===n} onClick={()=>changePeople(n)}>{n}</button>)}</div></div>
            <div className="sv-photos">{Array.from({length:people},(_,i)=><div className="sv-photo" key={i}>{currentFlow?<><button type="button" className="sv-photo-drop" disabled={locked} aria-label={photos[i]?'Change photo '+(i+1):'Add photo '+(i+1)} onClick={()=>{photoSlot.current=i;photoInput.current?.click()}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(locked)return;photoSlot.current=i;choosePhoto(e.dataTransfer.files[0])}} onPaste={e=>{const file=e.clipboardData.files[0]??Array.from(e.clipboardData.items).find(item=>item.kind==='file')?.getAsFile();if(file&&!locked){e.preventDefault();photoSlot.current=i;choosePhoto(file)}}}>{photoUrls[i]?<img src={photoUrls[i]} alt={'Person '+(i+1)+' reference'}/>:<span className="sv-photo-empty">＋<strong>Add your photo</strong></span>}</button>{photos[i]?<button type="button" className="sv-photo-remove" disabled={locked} aria-label={'Remove photo '+(i+1)} onClick={()=>removePhoto(i)}>×</button>:null}</>:<div className="sv-photo-media">{photoUrls[i]?<><img src={photoUrls[i]} alt={`Person ${i+1} reference`}/><button type="button" className="sv-photo-remove" disabled={locked} aria-label={`Remove photo ${i+1}`} onClick={()=>removePhoto(i)}>×</button></>:<span className="sv-photo-empty">Photo {i+1}</span>}</div>}<div className="sv-photo-controls">{!currentFlow?<button className="sv-photo-add" type="button" disabled={locked} onClick={()=>{photoSlot.current=i;photoInput.current?.click()}}>{photos[i]?'Change photo':'Add photo'}</button>:null}{people>1?<span className="sv-position-label">Person {positionsFor(people)[i]} in the video</span>:null}{currentFlow&&checked&&genders[i]!=null&&genderEditing!==i?<button type="button" className="sv-gender-edit" disabled={locked} onClick={()=>setGenderEditing(i)} aria-label={`Change preference for photo ${i+1}`}>{genders[i]==='man'?'Man':'Woman'} · Change</button>:null}{!currentFlow||(checked&&(genders[i]==null||genderEditing===i))?<div className="sv-gender-options" role="group" aria-label={currentFlow?`Choose Man or Woman for photo ${i+1}`:`Photo ${i+1} preference, optional`}>{(['man','woman'] as const).map(value=><button className="sv-gender-option" type="button" key={value} disabled={locked} aria-label={`Photo ${i+1}: ${value==='man'?'Man':'Woman'}`} aria-pressed={genders[i]===value} onClick={()=>changeGender(i,value)}>{value==='man'?'Man':'Woman'}</button>)}</div>:null}</div></div>)}</div><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose person photo" onChange={e=>{choosePhoto(e.target.files?.[0]);e.target.value=''}}/>
          </div>
          {currentFlow?<details className="sv-prompt-details"><summary>Instruction</summary>{instruction}</details>:instruction}
          <label className="sv-permission"><input type="checkbox" checked={consent} disabled={locked} onChange={e=>{if(!invalidate())return;setConsent(e.target.checked)}}/>I have permission to use these files.</label>
          {restoring?<p className="sv-note" role="status">Restoring your saved files…</p>:null}{message?<p className="sv-alert" role="status">{message}</p>:null}
          {!(currentFlow&&clip)?<div className="sv-generate-area">{currentFlow&&recoveryOnly?<Link className="sv-generate" href="/library">Check My videos ↗</Link>:<button className="sv-generate" type="button" data-seu-video-generate="" disabled={!canSubmit} onClick={()=>void generate()}>{busy?(currentFlow?phaseLabel:'Preparing…'):uncertain?'Retry Generate':'Generate'}{cost!==null?<span data-seu-video-cost={checked?'confirmed':'estimated'}>✦ {checked?'':'Estimated '}{cost} credits</span>:null}</button>}{currentFlow&&display.audio==='silent'?<span className="sv-output-note">Silent video</span>:null}{checked?.needs_plan||(checked?.shortfall??0)>0?<><Link className="sv-subtle" href="/pricing">See plans ↗</Link>{!uncertain?<button className="sv-subtle" type="button" disabled={busy} onClick={recheck}>Check again</button>:null}</>:null}{uncertain?<p className="sv-note">{currentFlow&&recoveryOnly?"The original request is not available on this page. Check My videos before starting another.":"Keep this page open and retry the same request. If you leave, check My videos before starting another."}{currentFlow&&!recoveryOnly?<> <Link href="/library">Check My videos ↗</Link></>:null}</p>:null}</div>:null}
        </section>
      </div>}
    </div>
    {currentFlow&&clip&&['pending','processing'].includes(clip.status)?<div className="sv-job-dock" aria-label="Current video status"><strong>{clip.queued?'In line'+(clip.queue_position?' · position '+clip.queue_position:''):'Creating your version'}</strong><Link href="/library">My videos ↗</Link></div>:null}
  </main>
  return currentFlow?<div className="recreate">{view}</div>:view
}

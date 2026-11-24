const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root='C:/Users/josep/AppData/Local/Temp/citacoes-crescimento-volta-2411',phase=process.argv[2];
fs.mkdirSync(root,{recursive:true});
const actor={id:'33333333-3333-4333-8333-333333333333',email:'local-proof',email_confirmed_at:'2026-01-01T00:00:00Z',created_at:'2026-01-01T00:00:00Z',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{full_name:'Local proof'}};
const session=()=>({access_token:[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:actor.id,email:actor.email,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+7200})).toString('base64url'),'local-proof-signature'].join('.'),refresh_token:'local-proof-only',token_type:'bearer',expires_in:7200,expires_at:Math.floor(Date.now()/1000)+7200,user:actor});
(async()=>{
 const tab=await(await fetch('http://127.0.0.1:9367/json/new?about:blank',{method:'PUT'})).json(),ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0,boot;const pending=new Map(),errors=[],proof=[],photos=[],requests=[],authResponses=[],finished=new Set();
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Network.responseReceived'&&m.params.response.url.startsWith('http://127.0.0.1:3236/auth/v1/user')&&m.params.response.status===200)authResponses.push(m.params.requestId);if(m.method==='Network.loadingFinished')finished.add(m.params.requestId);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Network.requestWillBeSent'&&/\/api\//.test(m.params.request.url))requests.push({method:m.params.request.method,path:new URL(m.params.request.url).pathname});if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value};
 const poll=async(fn,label,max=300)=>{for(let i=0;i<max;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout '+label)};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setBlockedURLs',{urls:['*clarity.ms/*','*bat.bing.com/*','*google-analytics.com/*','*googletagmanager.com/*','*/_vercel/insights/*','*supabase.co/rest/*']});
 const click=async selector=>{const p=await ev("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('missing click target');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});};
 await send('Fetch.enable',{patterns:[{urlPattern:'*://localhost:3235/api/*',requestStage:'Request'}]});
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Fetch.requestPaused'){const p=m.params,allow=p.request.method==='GET'&&new URL(p.request.url).pathname==='/api/citations/film-entry';void send(allow?'Fetch.continueRequest':'Fetch.failRequest',{requestId:p.requestId,...(allow?{}:{errorReason:'BlockedByClient'})}).catch(error=>{if(!String(error).includes('Invalid InterceptionId'))throw error;});}});
 const routes=[
 ['free','/free-ai-shorts-generator','#free-ai-shorts-generator-form'],
 ['pay','/how-much-do-youtube-shorts-pay','#payout-start-a-short'],
 ['cheap','/cheapest-ai-shorts-maker','#try-costed-workflow'],
 ['reels','/how-much-do-instagram-reels-pay','#reels-start-a-short'],
 ['best','/best-ai-shorts-generators','#roundup-start-a-short'],
 ['state','/state-of-ai-shorts-2026','#study-start-a-short'],
 ['script','/free-script-generator','#free-script-generator-tool'],
 ];
 const save=async(record,stage)=>{
  const state=await ev("(()=>{const input=document.querySelector('textarea.studio-prompt')||document.querySelector('textarea'),r=input?.getBoundingClientRect();return{width:innerWidth,theme:document.documentElement.dataset.theme,scrollWidth:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth),input:r?{top:r.top,bottom:r.bottom}:null}})()");
  assert.ok(state.scrollWidth<=state.width,'no horizontal overflow');
  const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:82,fromSurface:true,captureBeyondViewport:false});
  const file=[phase,record.page,record.theme,record.width,record.mode||'idea',stage].join('-')+'.jpg';fs.writeFileSync(path.join(root,file),Buffer.from(shot.data,'base64'));
  photos.push({...record,stage,...state,file});fs.writeFileSync(root+'/'+phase+'-fotos.json',JSON.stringify(photos,null,2));return state;
 };
 for(const [page,route,oldTarget]of routes)for(const theme of['light','dark'])for(const width of[1920,390]){
  if(phase==='logado'&&(theme!=='dark'||width!==390))continue;
  const modes=phase==='antes'?['idea']:['idea','finished_script'];
  for(const mode of modes){
   const record={page,route,theme,width,mode,authState:phase==='logado'?'already-authenticated':'guest-login'};await send('Network.clearBrowserCookies');
   if(boot)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:boot});
   const key=[phase,page,theme,width,mode].join('-');
   boot=(await send('Page.addScriptToEvaluateOnNewDocument',{source:"if(location.origin==='http://localhost:3235'){if(sessionStorage.getItem('citation-proof-case')!=="+JSON.stringify(key)+"){sessionStorage.clear();localStorage.clear();sessionStorage.setItem('citation-proof-case',"+JSON.stringify(key)+")}localStorage.setItem('kineo:appearance:v1',"+JSON.stringify(theme)+")}"})).identifier;
   await send('Network.setCookie',{name:'kineo_consent',value:'v1.denied',url:'http://localhost:3235',path:'/',sameSite:'Lax'});
   await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1080,deviceScaleFactor:1,mobile:false});
   if(phase==='logado')await send('Network.setCookie',{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session())).toString('base64url'),url:'http://localhost:3235',path:'/',sameSite:'Lax'});
   await send('Page.navigate',{url:'http://localhost:3235'+route});
   await poll(()=>ev("location.pathname==="+JSON.stringify(route)+"&&document.readyState==='complete'&&!!document.querySelector('textarea')"),'article '+page,900);
   await ev('document.fonts.ready');await poll(()=>ev('document.documentElement.dataset.theme==='+JSON.stringify(theme)),'appearance from boot');
   const inputSelector=page==='script'?'#free-script-generator-tool textarea':(phase==='antes'?oldTarget+' textarea':'[data-variant] textarea');
   if(mode==='idea'){const top=await save(record,'topo');if(phase==='depois')assert.ok(top.input&&top.input.top>=0&&top.input.bottom<=(width===390?844:1080),'first editable box above fold '+page+' '+width)}
   await poll(()=>ev('!!document.querySelector('+JSON.stringify(inputSelector)+')'),'article input '+page);
   if(phase==='antes'){
    await ev("(()=>{const e=document.querySelector("+JSON.stringify(inputSelector)+");e.scrollIntoView({block:'center'});return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})()");
    await save(record,'campo');console.log('PASS before '+page+' '+theme+' '+width);continue;
   }
   if(mode==='finished_script')await ev("(()=>{const buttons=[...document.querySelectorAll('[data-variant] button[aria-pressed]')];if(buttons.length!==2)throw Error('mode controls');buttons[1].click();return true})()");
   const prompt=mode==='idea'?'A lighthouse keeper found a brass owl under the last blue lantern.':'The lighthouse keeper found three keys.\nOnly the smallest key opened the door.\nAt dawn the brass owl returned.';
   await ev("(()=>{const e=document.querySelector("+JSON.stringify(inputSelector)+");e.scrollIntoView({block:'center'});e.focus();e.select();return true})()");
   await send('Input.insertText',{text:prompt});
   await poll(()=>ev('document.querySelector('+JSON.stringify(inputSelector)+').value==='+JSON.stringify(prompt)),'native text');
   await save(record,'campo');
   if(page==='pay'||page==='best'){
    await ev("(()=>{const e=document.querySelector('[data-kineo=citation-comparison-method-2411]')||document.querySelector('[data-kineo=citation-film-proof-2411] figure');e.scrollIntoView({block:'center'});return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})()");
    await save(record,'exemplo');
   }
   const authBefore=authResponses.length;
   await click(page==='script'?'#free-script-generator-tool a':'[data-variant] button[type=submit]');
   if(phase!=='logado'){
    await poll(()=>ev("location.pathname==='/signup'&&!!document.querySelector('#saved-creation-heading')"),'signup saved card',900);
    const signup=await ev("({url:location.href,preview:document.querySelector('#saved-creation-heading').parentElement.innerText})");
    assert.ok(signup.preview.replace(/\s+/g,' ').includes(prompt.replace(/\s+/g,' ')),'saved idea visible');
    const params=new URL(signup.url).searchParams;
    assert.equal(params.get('prompt').replace(/\r\n/g,'\n'),prompt,'native signup exact text');
    assert.equal(params.get('script_mode'),mode==='idea'?'ai':'verbatim');
    const target=new URL(params.get('redirect'),'http://localhost:3235');
    assert.equal(target.pathname,'/studio/create','canonical saved card; application owns routing');
    await save(record,'cadastro');
    await click('a[href^="/login?"]');
    await poll(()=>ev("location.pathname==='/login'&&!!document.querySelector('#login-email')"),'actual login page',900);
    for(const [selector,value]of[['#login-email','fixture'+String.fromCharCode(64)+'example.invalid'],['#login-password','Local-fixture-only-2411!']]){
     await ev("document.querySelector("+JSON.stringify(selector)+").focus();true");await send('Input.insertText',{text:value});
    }
    await click('form button[type=submit]');
   }
   await poll(()=>ev("location.pathname==='/studio'&&!!document.querySelector('textarea.studio-prompt')"),'real Studio editable field',900);
   await poll(()=>ev("document.querySelector('textarea.studio-prompt').value==="+JSON.stringify(prompt)),'Studio prompt restored');
   await poll(async()=>authResponses.slice(authBefore).some(id=>finished.has(id)),'verified SDK getUser response');
   const responseId=authResponses.slice(authBefore).filter(id=>finished.has(id)).at(-1);
   const responseBody=await send('Network.getResponseBody',{requestId:responseId});
   const verifiedUser=JSON.parse(responseBody.base64Encoded?Buffer.from(responseBody.body,'base64').toString('utf8'):responseBody.body);
   assert.equal(verifiedUser.id,actor.id,'SDK verified synthetic identity');

   const actual=new URL(await ev('location.href'));const params=actual.searchParams;
   assert.equal(actual.pathname,'/studio');assert.equal(params.get('prompt'),prompt);assert.equal(params.get('script_mode'),mode==='idea'?'ai':'verbatim');
   for(const key of ['create_intent','autoanalyze','studio','duration','utm_source','utm_medium','utm_campaign'])assert.equal(params.has(key),false,'review keeps auto-start and invented attribution absent');
   const studioMode=await ev("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes("+JSON.stringify(mode==='idea'?'Let AI structure it':'Use my script as is')+"));return !!b&&b.classList.contains('on')})()");
   assert.equal(studioMode,true,'real Studio mode');
   await ev("(()=>{const e=document.querySelector('textarea.studio-prompt');if(e.disabled||e.readOnly)throw Error('field not editable');e.scrollIntoView({block:'center'});e.focus();e.select();return true})()");
   await send('Input.insertText',{text:prompt+' Edited locally.'});await poll(()=>ev("document.querySelector('textarea.studio-prompt').value==="+JSON.stringify(prompt+' Edited locally.')),'real field edited');
   await ev("document.querySelector('textarea.studio-prompt').select();true");await send('Input.insertText',{text:prompt});await poll(()=>ev("document.querySelector('textarea.studio-prompt').value==="+JSON.stringify(prompt)),'real field restored');
   await save(record,'studio');
   proof.push({...record,prompt,signupPath:phase==='logado'?null:'/signup',studioPath:'/studio',scriptMode:params.get('script_mode'),campaign:params.get('intent_campaign'),autostart:false,actualBrowserDestination:true,editable:true,verifiedGetUser:true,auth:'Real browser navigation. Already-authenticated fixture or actual login page/password SDK against local token fixture. No URL mapping or destination rewriting in test. No real account/database/OAuth/generation/payment.'});
   fs.writeFileSync(root+'/'+phase+'-passagens.json',JSON.stringify(proof,null,2));console.log('PASS after '+page+' '+theme+' '+width+' '+mode+' -> saved card -> editable Studio');
  }
 }
 fs.writeFileSync(root+'/'+phase+'-erros.json',JSON.stringify(errors.map(x=>x.split('\n')[0]),null,2));fs.writeFileSync(root+'/'+phase+'-requests.json',JSON.stringify(requests,null,2));
 assert.equal(requests.filter(r=>(r.method==='POST' && ['generate-video','/api/recreate','/api/clips'].some(marker=>r.path.includes(marker))) || ['/api/stripe/checkout','/api/paypal/checkout'].includes(r.path)).length,0,'no generation or new checkout request attempted');
 await send('Browser.close');ws.close();if(errors.length)throw Error('Runtime exceptions: '+errors.length+'; first '+errors[0].split('\n')[0]);
 console.log('PASS '+phase+' '+photos.length+' photographs, '+proof.length+' handoffs; no account or generation');
})().catch(e=>{console.error(String(e.stack||e).replace(/[^\s"'<>]+@[^\s"'<>]+/g,'[omitted]'));process.exitCode=1});

// A bounded visual pass over the approved v3 preview. No network or app APIs.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'public/design/polished-v3-20260924');
const out=path.join(root,'public/design/polished-v4-20260924');
const keys=['home','image','create','business','pricing','video','studio','library','explore'];

const css=`
/* Same approved palette. More room for the work, quieter framing. */
.wrap{width:min(1540px,calc(100% - 88px))}
.nav{gap:36px}
.navlinks a{transition:color .18s}
.navlinks a:hover{color:var(--accent)}
.navlinks a[aria-current=page]:after{width:22px;left:50%;right:auto;transform:translateX(-50%)}
.btn{box-shadow:0 4px 10px #1456a914,inset 0 1px 0 #ffffff18;transition:background .18s,box-shadow .18s,transform .18s}
.btn:hover{transform:translateY(-1px);box-shadow:0 7px 19px #1456a921}
.btn:active{transform:translateY(0);box-shadow:0 2px 5px #1456a918}
.btn.secondary{box-shadow:inset 0 1px 0 #ffffff15}
.btn.secondary:hover{border-color:#a4bddb;background:var(--tint)}
:where(a,button,select,textarea,input,summary):focus-visible{outline:3px solid #3a87e9;outline-offset:4px}
.home-hero{padding:26px 0 30px}
.home-editorial{grid-template-columns:1.3fr 1fr;margin-bottom:19px;gap:56px}
.home-editorial .hero-side{max-width:395px}
.hero-side p{max-width:360px}
.reel-label{margin-bottom:12px}
.film-grid{gap:20px}
.film-media{height:404px;border-radius:19px;border-color:#c9d6e5;box-shadow:0 1px 2px #1b35520b,0 12px 30px #21344c0c}
.film-media img,.film-media video{transition:filter .25s}
.film-card:hover img{transform:none}
.film-card:hover .film-media{border-color:#93b4dd}
.film-caption{display:flex;flex-direction:column;gap:3px;padding:0 2px;margin-top:14px;min-height:41px}
.film-caption span{font-size:13px;line-height:1.55;font-weight:600}
.film-caption small{font-size:11px;line-height:1.55;margin:0;color:#617286}
.film-open{width:44px;height:44px;bottom:16px;right:16px;background:#12243c9e;border:1px solid #ffffff70;transition:background .18s,transform .18s;cursor:pointer}
.film-open:hover{background:#1766d3;transform:scale(1.05)}
.film-open svg{width:14px;height:14px}
.entry-grid{gap:20px;margin-top:3px}
.entry,.entry+.entry{border-radius:18px;padding:28px;transition:border-color .2s,box-shadow .2s,transform .2s}
.entry{background:linear-gradient(150deg,#fff,#fafcff)}
.entry+.entry{background:linear-gradient(135deg,#eaf3ff,#f7faff)}
.entry:hover{border-color:#a1bfdf;box-shadow:0 9px 25px #2a527c0b;transform:translateY(-2px)}
.entry>svg{color:#416588;flex-shrink:0}
.entry-icon{width:46px;height:46px;border-radius:13px}
.entry h2{line-height:1.3}
.entry p{max-width:440px}
.editorial-section{gap:80px}
.editorial-art{box-shadow:0 12px 32px #21344c0b}
.footer{padding-bottom:27px}
.footer-links a{width:fit-content;transition:color .18s}
.footer-links a:hover{color:var(--accent)}
.footer .footnote{padding-top:26px;line-height:1.7}

/* Image and Video retain their controls; previews gain breathing room. */
.image-hero{padding-top:39px}
.image-intro{margin-bottom:29px}
.image-workbench{padding:15px;gap:28px;border-radius:24px;box-shadow:0 2px 5px #27456705,0 20px 60px #1833520a}
.image-controls{padding:29px 28px}
.image-controls h2{margin-bottom:27px}
.image-controls textarea{min-height:146px;background:#f6f9fd;border-color:#d1ddec}
.image-settings select{min-height:45px}
.image-result{min-height:516px;border-radius:16px}
.image-result figcaption{background:#f5f8f5ed;border-color:#ffffffe0;padding:16px 18px;backdrop-filter:blur(12px)}
.image-controls label{font-size:13px}
.image-controls>small{font-size:12px;line-height:1.6}
.image-features{gap:60px;padding-top:28px}
.image-features article{border-top:1px solid var(--line);padding-top:27px}
.video-landing{grid-template-columns:1.05fr 1fr;gap:70px;padding-top:46px}
.video-showcase{height:518px;border-radius:22px;box-shadow:0 14px 40px #18335210}
.video-quality{font-size:12px}
.video-motion{min-height:38px;padding:8px 12px;font-size:12px}
.video-process{gap:50px;padding:30px 0 37px}
.video-process p{max-width:365px}
.video-pair{gap:25px}
.gallery-film{height:330px;border-radius:19px;box-shadow:0 8px 24px #21344c0a}
.gallery-film>span{background:#0315280b;transition:background .18s}
.gallery-film:hover>span{background:#03152830}

/* Ads and plans: aligned card edges, readable detail and consistent actions. */
.ads-hero{gap:76px;padding-top:58px}
.ads-photo{height:488px;border-radius:21px;box-shadow:0 24px 65px #02091140}
.ads-product{border-width:5px!important;border-radius:18px}
.ads-surface .btn.secondary:hover{background:#1d3450;border-color:#6e98c4}
.ads-surface .film-caption small{color:var(--muted)}
.creation-routes{gap:24px}
.creation-route{padding:37px;border-radius:20px;display:flex;flex-direction:column}
.creation-route p{max-width:540px;line-height:1.85}
.creation-route .text-link{margin-bottom:26px}
.creation-route .route-sample{margin-top:auto;min-height:59px}
.text-link{transition:color .18s}
.text-link:hover{color:var(--accent)}
.route-top .tag{border:1px solid #8cb6e222;border-radius:6px;padding:6px 9px}
.usecase-grid{gap:28px}
.usecase-grid article>div{height:390px;border-radius:20px;border:1px solid #8cb6e22b}
.service{padding:33px;border-radius:19px;display:flex;flex-direction:column}
.service ul{margin-bottom:25px}
.service .btn{margin-top:auto;justify-content:space-between;min-height:49px}
.service p{line-height:1.8}
.ads-surface .service.highlight{box-shadow:0 12px 40px #0002;border-color:#79a7d2}
.price-grid{gap:23px}
.price-card{padding:33px;border-radius:19px;box-shadow:0 2px 5px #24456704;display:flex;flex-direction:column}
.price-card.featured{border-color:#8ab5e9;box-shadow:0 12px 42px #2466bf12}
.price-heading span{font-size:12px}
.price-card li{font-size:13px;line-height:1.7}
.price-card ul{gap:16px}
.price-number{margin-top:27px}
.price-card .btn{min-height:49px;font-size:14px}
.pricing-header{padding-top:42px}
.pricing-tabs{margin-bottom:31px}
.pricing-tabs button{min-height:44px}
.pricing-context{margin-bottom:22px}
.pricing-support{padding-top:43px}
.faq details{border-color:var(--line)}
.faq summary{padding-top:21px;padding-bottom:21px;line-height:1.7}
.faq p{max-width:740px}

/* Workspaces use the same finishing, without changing the existing workflow. */
.workspace .panel{padding:31px;border-color:#354b62;box-shadow:inset 0 1px 0 #b4d6ff04,0 8px 28px #030b1212}
.workspace .preview-panel{padding:17px}
.workspace .field textarea{line-height:1.85;min-height:178px}
.workspace .panel-bottom{align-items:center}
.workspace .work-title{margin-bottom:29px}
.workspace .template-option{border-radius:12px}
.workspace .template-option:focus-visible{outline-color:#8fc6ff}
.workspace .library-grid{gap:20px}
.workspace .library-card{border-radius:15px;border-color:#34495e}
.workspace .library-card .media{height:316px}
.workspace .library-card .card-copy{padding:20px}
.workspace .card-copy h3{line-height:1.6}
.workspace .card-copy p{font-size:12px}
.movie{height:428px;border-radius:18px}
.movie-caption{padding-top:13px}

@media(min-width:1000px) and (max-height:850px){
 .home-hero{padding-top:22px;padding-bottom:24px}
 .home-editorial{margin-bottom:18px;gap:48px}
 .home-editorial h1{font-size:52px;letter-spacing:-2.2px}
 .home-editorial .hero-side p{font-size:15px;line-height:1.7;margin-bottom:15px}
 .film-media{height:340px}
 .film-caption{margin-top:12px}
 .reel-label{margin-bottom:10px}
 .entry,.entry+.entry{padding:23px 26px}
 .ads-hero{padding-top:38px;padding-bottom:27px}
 .ads-photo{height:416px}
 .video-landing{padding-top:31px;padding-bottom:31px}
 .video-showcase{height:442px}
 .image-hero{padding-top:32px}
 .image-result{min-height:490px}
 .pricing-header{padding-top:34px}
}
@media(min-width:761px) and (max-width:1100px){
 .wrap{width:calc(100% - 56px)}
 .film-grid{gap:15px}.film-media{height:330px}
 .film-caption span{font-size:12px}.film-caption small{font-size:11px}
 .entry,.entry+.entry{padding:23px;gap:17px}
 .image-controls{padding:25px 18px}.image-workbench{gap:14px}
 .video-landing{gap:35px}.video-showcase{height:435px}
 .ads-hero{gap:40px}.ads-photo{height:435px}
 .creation-route{padding:29px}.service,.price-card{padding:27px}
 .price-card li{font-size:12px}
}
@media(min-width:761px) and (max-width:999px){
 .film-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:23px 18px}
 .film-media{height:370px}
 .home-editorial{gap:30px}
}
@media(max-width:760px){
 .wrap{width:calc(100% - 32px)}
 .navlinks{gap:15px}.navlinks a{padding-top:14px;padding-bottom:13px}
 .navlinks a[aria-current=page]:after{width:20px}
 .home-hero{padding-top:27px;padding-bottom:23px}
 .home-editorial{margin-bottom:21px}
 .home-editorial h1{font-size:41px;letter-spacing:-1.8px}
 .home-editorial .hero-side{max-width:none}
 .hero-side p{font-size:14px;max-width:none}
 .film-grid{gap:19px 12px}.film-media{height:274px;border-radius:15px}
 .film-caption{margin-top:10px;gap:2px;min-height:45px;padding:0 1px}
 .film-caption span{font-size:12px;line-height:1.5}
 .film-caption small{font-size:11px;line-height:1.5}
 .film-open{width:42px;height:42px;bottom:10px;right:10px}
 .entry-grid{gap:13px}.entry,.entry+.entry{padding:23px;gap:17px;border-radius:17px}
 .entry-icon{width:40px;height:40px;border-radius:11px}
 .entry h2{font-size:22px}.entry p{font-size:13px}
 .editorial-section{padding:46px 0}.footer{padding-bottom:23px}
 .image-hero{padding-top:28px}.image-intro{margin-bottom:26px}
 .image-workbench{padding:10px;gap:3px;border-radius:19px}
 .image-controls{padding:24px 14px}.image-controls textarea{min-height:169px}
 .image-controls label{font-size:12px}.image-controls>small{font-size:11px}
 .image-result{min-height:332px;border-radius:13px}
 .image-result figcaption{padding:13px 14px;left:11px;right:11px;bottom:11px;font-size:11px;gap:8px}
 .image-result small{font-size:10px}
 .image-features{gap:19px;padding-top:15px}.image-features article{padding-top:24px}
 .video-landing{padding-top:29px;gap:29px}.video-showcase{height:418px;border-radius:18px}
 .video-quality{font-size:10px}.video-motion{font-size:11px;min-height:36px}
 .video-process{gap:27px;padding:28px 0}.video-process p{max-width:none}
 .video-pair{gap:25px}.gallery-film{height:288px;border-radius:17px}
 .ads-hero{padding-top:33px;padding-bottom:20px}.ads-photo{height:362px;border-radius:18px}
 .ads-product{height:163px;border-radius:14px}.ads-composition{padding-bottom:52px}
 .creation-routes{gap:17px}.creation-route{padding:28px;border-radius:18px}
 .creation-route .text-link{margin-bottom:21px}.creation-route .route-sample{font-size:10px;gap:8px}
 .route-top .tag{font-size:10px;padding:5px 7px}
 .usecase-grid{gap:31px}.usecase-grid article>div{height:312px;border-radius:18px}
 .service,.price-card{padding:28px;border-radius:18px}.service p{font-size:14px}
 .price-grid{gap:17px}.price-card li{font-size:13px}.price-card .btn{font-size:14px}
 .price-heading span{font-size:11px}.price-number{margin-top:25px}
 .pricing-header{padding-top:30px}.pricing-tabs{margin-bottom:28px}
 .pricing-tabs button{min-height:44px}.pricing-support{padding-top:35px}
 .faq summary{font-size:14px;padding-top:18px;padding-bottom:18px}
 .workspace .panel{padding:25px 21px}.workspace .preview-panel{padding:14px}
 .workspace .work-title{margin-bottom:25px}.workspace .field textarea{min-height:175px}
 .workspace .library-grid{gap:13px}.workspace .library-card .media{height:252px}
 .workspace .library-card .card-copy{padding:14px}.workspace .card-copy p{font-size:11px}
 .movie{height:396px}
}
@media(max-width:360px){.film-media{height:250px}.film-caption span{font-size:11px}.film-caption small{font-size:10px}.entry,.entry+.entry{padding:20px}.image-result{min-height:306px}.price-card,.service{padding:24px}.creation-route{padding:24px}}
@media(prefers-reduced-motion:reduce){.btn:hover,.entry:hover,.film-open:hover{transform:none}}
`;

fs.mkdirSync(out,{recursive:true});
for(const key of keys){
 const original=fs.readFileSync(path.join(source,key+'.html'),'utf8');
 const html=original.replace('</style>',css+'</style>').replace('Kineo refined 03','Kineo refined 04');
 for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 fs.writeFileSync(path.join(out,key+'.html'),html);
 fs.writeFileSync(path.join(out,'previous-'+key+'.html'),original.replace(/<script>[\s\S]*?<\/script>/g,''));
}
for(const key of ['home','business'])fs.copyFileSync(path.join(source,'before-'+key+'.html'),path.join(out,'before-'+key+'.html'));
let index=fs.readFileSync(path.join(source,'index.html'),'utf8')
 .replaceAll('refinamento 03','refinamento 04')
 .replaceAll('Proposta anterior','Prévia aprovada (03)')
 .replaceAll('["home","create","business","video","studio","library","explore"]',JSON.stringify(keys));
for(const m of index.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
fs.writeFileSync(path.join(out,'index.html'),index);
console.log('Refinement 04: larger cards, same palette and navigation, 9 approved-page comparisons. No app changes.');

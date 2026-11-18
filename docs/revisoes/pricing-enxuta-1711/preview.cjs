// Offline SSR of the real PricingClient. Effects and checkout disabled, account SIMULATED.
const fs=require('fs'),cp=require('child_process'),React=require('react'),{renderToStaticMarkup:ssr}=require('react-dom/server'),{loader}=require('../../recreate-0911/test-recreate.cjs');
const noop=()=>null,children=({children})=>React.createElement(React.Fragment,null,children);
function render(before=false,signedIn=false,active=false,{billing='monthly',orderFixture=false,promo=false,valueCards,latestFilm,inspect,sourceOverride,trackEvent=()=>{throw Error('analytics forbidden')},mutate=s=>s}={}){
 const source=sourceOverride ?? (before?cp.execFileSync('git',['show','8c1d7b4d4:app/pricing/PricingClient.tsx'],{encoding:'utf8'}):fs.readFileSync('app/pricing/PricingClient.tsx','utf8'));
 let prepared=source.replace('const [alreadySubscribed, setAlreadySubscribed] = useState(false)', 'const [alreadySubscribed, setAlreadySubscribed] = useState('+active+')').replace('useState<boolean | null>(null)',`useState<boolean | null>(${signedIn})`).replace('useState<DisplayCurrency | null>(null)',"useState<DisplayCurrency | null>('usd')");
 if(promo) prepared=prepared.replace('const [arrivedWithPromo, setArrivedWithPromo] = useState(false)', 'const [arrivedWithPromo, setArrivedWithPromo] = useState(true)');
 if(valueCards!==undefined) prepared=prepared.replace('useState(watchPricing || PRICING_VALUE_CARDS_PUBLIC)',`useState(${valueCards})`);
 if(latestFilm) prepared=prepared.replace('seconds: number | null } | null>(null)',`seconds: number | null } | null>(${JSON.stringify(latestFilm)})`);
 if(orderFixture){
  prepared=prepared.replace(/export const PRICING_SHOW_ADS_BLOCK = \w+/, 'export const PRICING_SHOW_ADS_BLOCK = true')
    .replace(/export const PRICING_SHOW_AUTOPILOT = \w+/, 'export const PRICING_SHOW_AUTOPILOT = true')
    .replace(/\bTOPUPS_LIVE\s*\?/g, 'true ?');
 }
 prepared=mutate(prepared);
 const L=loader({
 react:{...React,useEffect:()=>{}},
 'next/link':{__esModule:true,default:({href,children,...props})=>React.createElement('a',{href,...props},children)},
 '@/components/InterfaceLanguage':{UiLabel:children,useInterfaceLanguage:()=> 'en'},
 '@/components/FreeTierOfferProvider':{useFreeTierOffer:()=>loader()('lib/freeTierOffer').getFreeTierOffer()},
 '@/components/Kling4PaidNotice':{__esModule:true,default:noop,useKling4PaidAvailability:()=>null},
 '@/components/AppearanceSettings':{AppearanceSettingsButton:noop},
 '@/components/pricing/AnnualOfferCountdown':{AnnualOfferCountdown:noop,useWelcomeOffers:()=>({annual:null,monthly:{deadlineMs:null,ended:false}})},
 '@/lib/growth/useWelcome20Deadline':{useWelcome20Deadline:()=>({label:null,active:false})},
 '@/lib/checkoutTelemetry':{useCheckoutLaunch:()=>({pending:null,launch:()=>{throw Error('checkout forbidden')}})},
 '@/lib/analytics':{trackEvent},
 '@/lib/supabase/client':{createClient:()=>{throw Error('auth forbidden')}},
 },{'app/pricing/PricingClient.tsx':prepared});
 const Comp=L('app/pricing/PricingClient').default;
 function Fixture() {
   const tree = Comp({ initialBilling: billing });
   inspect?.(tree);
   return tree;
 }
 return ssr(React.createElement(Fixture));
}
if(require.main===module)(async()=>{
 const postcss=require('postcss'),tailwind=require('tailwindcss');
 const css=(await postcss([tailwind({content:['app/pricing/PricingClient.tsx','components/pricing/**/*.tsx','components/seo/TrafficCitation2310.tsx','components/AdvertiserIdentity.tsx'],theme:{extend:{}},corePlugins:{preflight:true}})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
 for(const account of ['guest','signed'])for(const theme of ['light','dark'])for(const side of ['before','after']){
 const html=render(side==='before',account==='signed',account==='signed');
 const vars=theme==='light'?'--bg:#f9fafb;--card:#fff;--card2:#f0f2f6;--surface:#fff;--text:#171b24;--text2:#374151;--muted:#626b7a;--muted2:#697181;--border:#dce0e7;--border2:#d0d6df;':'--bg:#101113;--card:#191b1f;--card2:#22252b;--surface:#191b1f;--text:#f3f4f7;--text2:#d7dce5;--muted:#abb4c2;--muted2:#abb4c2;--border:#343942;--border2:#414854;';
 fs.writeFileSync(`${process.env.KINEO_PRICING_PREVIEW_DIR || __dirname}/${side}-${account}-${theme}.html`,`<!doctype html><html data-theme="${theme}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pricing ${side} ${account} ${theme} · DEV</title><style>${css}\nhtml{scrollbar-width:none;${vars}--accent:#0655f8;--indigo:#0655f8;--on-accent:#fff;--accent-soft:rgba(6,85,248,.09);font-family:system-ui}body{margin:0}button,a,summary{font:inherit}.fixture-label{padding:12px 24px;font-size:14px;background:var(--card2);color:var(--text)}[hidden]{display:none!important}</style><div class="fixture-label">DEV · ${side} · ${account==='signed'?'signed-in account SIMULATED':'guest SIMULATED'} · ${theme} · no checkout or generation</div>${html}</html>`);
 }
 console.log('8 offline SSR pages generated');
})().catch(e=>{console.error(e);process.exitCode=1});
module.exports={render};

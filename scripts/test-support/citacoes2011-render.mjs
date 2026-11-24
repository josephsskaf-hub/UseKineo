import {execFileSync} from 'node:child_process'
import {offlineModules,React,renderToStaticMarkup,source} from '../gpt24h-offline-support.mjs'
export async function renderBuyerProof2011({filmRelease}={}) {
 const plain=({children})=>React.createElement('div',null,children)
 const mocks=Object.fromEntries(['Footer','AgencyVolumeBridge','ExitIntentOffer','LocalizedScriptHandoff','StickyFreeShortCTA','Kineo1RetiredNotice','PaidSeedanceBridge','ScriptToSeedanceBridge','BuyCreatorCta','NicheHouseFilm','GeoRodada3Sections'].map(n=>[`components/${n}.tsx`,{__esModule:true,default:plain}]))
 mocks['components/OrganicCtaLink.tsx']={__esModule:true,default:({children,source,placement,...props})=>React.createElement('a',props,children)}
 mocks['components/seo/PaginaClara.tsx']={PaginaClaraTopo:plain,PaginaClaraCards:plain,PaginaClaraVitrine:plain}
 mocks['app/youtube-shorts-from-topic/TopicGeneratorForm.tsx']={__esModule:true,default:plain}
 mocks['app/chatgpt/ChatgptPastePanel.tsx']={__esModule:true,default:plain}
 mocks['app/claude-connector/ConnectPanel.tsx']={ChatgptConnectSteps:plain}
 mocks['app/text-to-video-shorts/TextToVideoIntentForm.tsx']={__esModule:true,default:plain}
 const pages=[['pt','app/gerador-de-shorts-gratis/page.tsx',{}],['urdu','app/ai-video-generator/for/[slug]/page.tsx',{slug:'urdu'}],['h3','app/ai-video-generator/[engine]/page.tsx',{engine:'seedance'}],['cost','app/best-ai-shorts-generators/page.tsx',{}],['script','app/chatgpt/page.tsx',{}],['text','app/text-to-video-shorts/page.tsx',{}]]
 const replaced=[...pages.map(p=>p[1]),'lib/growth/h3TurboPage.ts','lib/seo/paginasCitadas0511.ts']
 const replacements=Object.fromEntries(replaced.map(f=>[f,execFileSync('git',['show',`3be85d7db:${f}`],{encoding:'utf8'})]))
 const handoff = source('lib/gptHandoff.ts')
 const cryptoImport = "import { createHash } from 'node:crypto'"
 if(!handoff.includes(cryptoImport))throw Error('Crypto boundary moved; review offline render')
 // Rendering only: hashing must never run here. Actual handoff behavior has its own real-crypto guard.
 const dependencies = { 'lib/gptHandoff.ts': handoff.replace(cryptoImport, "const createHash = () => { throw new Error('Unexpected hashing during public-page render') }") }
 // KINEO-CITACOES-PUBLIC-2411: filmRelease fixa a caixa de filme (padrão: o valor do código) para isolar a prova de 20/11.
 if(filmRelease){const f='lib/growth/citationFilmRelease.ts',t=source(f).replace(/(CITATION_FILM_RELEASE: CitationFilmRelease = )'(?:off|internal|public)'/,"$1'"+filmRelease+"'");if(!t.includes("CITATION_FILM_RELEASE: CitationFilmRelease = '"+filmRelease+"'"))throw Error('Film release anchor moved');dependencies[f]=t}
 const result={}
 for(const phase of ['before','after']){const load=offlineModules({mocks,replacements:{...dependencies,...(phase==='before'?replacements:{})}});for(const [id,file,params] of pages)result[phase+'-'+id]=renderToStaticMarkup(await load(file).default({params}))}
 return result
}

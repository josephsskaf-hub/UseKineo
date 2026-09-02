// sprint-assinaturas #3 — o "terminou sozinho" do finish-stranded-renders
// precisa perguntar por ESTA geração, não por qualquer vídeo do dono.
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../app/api/cron/finish-stranded-renders/route.ts', import.meta.url), 'utf8')
let n = 0, bad = 0
const check = (name, ok) => { n++; if (!ok) { bad++; console.log('FAIL', name) } else console.log('ok  ', name) }
const start = src.indexOf('sprint-assinaturas #3')
const block = src.slice(start, src.indexOf("if (weComposed || renderId)", start))
check('bloco #3 existe e vem antes da Fase 2', start > 0 && block.length > 100)
check('pergunta pelo compose_submission_claim da geração', /\.eq\('name', 'compose_submission_claim'\)/.test(block) && /\.eq\('session_id', genId\)/.test(block))
check('não pergunta mais por videos do usuário (selfDone morreu)', !/selfDone/.test(src) && !/\.from\('videos'\)[\s\S]{0,120}\.gte\('created_at', claim\.created_at/.test(src))
check('não consulta videos dentro do bloco', !/from\('videos'\)/.test(block))
check('só decide quando nunca houve tentativa nossa', /attempts\.get\(genId\) \?\? 0\) === 0/.test(block))
check('erro da consulta vai pro log e não muda a decisão', /ownComposeErr\) console\.warn/.test(block))
check('desfecho continua user_finished_themselves', /outcome: 'user_finished_themselves'/.test(block))
check('sem compose claim segue para a Fase 1 (nenhum continue fora do if)', (block.match(/continue/g) || []).length === 1)
const code = block.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
check('código do bloco não chama compose, e-mail, fal nem refund', !/composePost|sendEmail|fal\.|refund|credits/.test(code))
check('código do bloco não toca preço/plano/checkout', !/price|plan|checkout|stripe|coupon/i.test(code))
check('Fase 1 ainda insere marcador de tentativa antes do compose', src.indexOf("name: ATTEMPT_EVENT") < src.indexOf("await composePost(composeReq)"))
check('outcomes #1 continuam no log', /\[stranded\] outcomes/.test(src))
console.log(`${n - bad}/${n} verificações`)
process.exit(bad ? 1 : 0)

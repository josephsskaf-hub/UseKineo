// KINEO-ORIGEM-CLAUDE-0911 — o clique real vindo do Claude (teste do Cowork 09/11: sem referrer, sem utm) pousou em
// /kineo-in-claude e ficou com source NULO, porque a rota não estava na lista de páginas de conteúdo. Este guardião
// prova que /kineo-in-claude agora ganha a estimativa ai_assistant_likely, e que nada mais mudou.
import assert from 'node:assert/strict'
const { inferAiAssistantLikely, landingSessionSourceClass, AI_ASSISTANT_LIKELY_SOURCE } = await import('../lib/acquisitionSource.ts')
const vazio = { rawReferrer: '', search: '' }
for (const path of ['/kineo-in-claude', '/kineo-in-claude/']) {
  assert.equal(inferAiAssistantLikely({ ...vazio, path }), AI_ASSISTANT_LIKELY_SOURCE, `pouso limpo em ${path} = assistente provável`)
  assert.equal(landingSessionSourceClass({}, path), AI_ASSISTANT_LIKELY_SOURCE, `painel classifica ${path}`)
}
// origem conhecida continua vencendo
assert.equal(inferAiAssistantLikely({ path: '/kineo-in-claude', rawReferrer: 'https://www.google.com/', search: '' }), null)
assert.equal(inferAiAssistantLikely({ path: '/kineo-in-claude', rawReferrer: '', search: '?utm_source=claude_connector' }), null)
assert.equal(landingSessionSourceClass({ utm_source: 'claude_connector' }, '/kineo-in-claude'), 'claude_connector')
// home, preço, produto e a tela do conector seguem fora (regra 4 + lista proibida do guardião 1610)
for (const path of ['/', '/pricing', '/studio', '/login', '/claude-connector']) assert.equal(inferAiAssistantLikely({ ...vazio, path }), null, `${path} fica fora`)
// nada de prefixo solto: só o segmento inteiro
assert.equal(inferAiAssistantLikely({ ...vazio, path: '/kineo-in-claudex' }), null)
console.log('PASS: /kineo-in-claude ganha ai_assistant_likely; origem conhecida vence; home/pricing/studio/login/claude-connector fora')

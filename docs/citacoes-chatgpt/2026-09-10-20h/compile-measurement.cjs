const fs = require('fs');
const path = require('path');
const directory = __dirname;
const root = path.resolve(directory, '../../..');
const baseline = JSON.parse(fs.readFileSync(path.join(directory, '../2026-09-10-prioridade/chatgpt-20-perguntas.json'), 'utf8'));
const currentPath = path.join(directory, 'chatgpt-20-perguntas.json');
const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
for (const record of current.records) {
  const before = baseline.records.find(item => item.id === record.id);
  if (!before) throw new Error('Unknown query ' + record.id);
  record.query_exact = before.query_exact;
  record.baseline_kineo_position = before.kineo_position;
  record.kineo_links = record.source_links_selected.filter(url => new URL(url).hostname === 'www.usekineo.com');
}
if (current.records.length !== 20 || new Set(current.records.map(r => r.id)).size !== 20) throw new Error('Incomplete');
if (current.records.filter(r => r.kineo_cited).length !== current.counts.kineo_present) throw new Error('Count mismatch');
fs.writeFileSync(currentPath, JSON.stringify(current, null, 2) + '\n', 'utf8');
const position = value => value === null ? 'não' : value + 'ª';
const table = [
  '| Pergunta | Tarde EN | 20h EN | Tarde PT | 20h PT |',
  '|---|---|---|---|---|'
];
const labels = ['Grátis para YouTube Shorts','Roteiro → faceless grátis','TikTok sem aparecer','Terror de 60 segundos','Custo por vídeo de 60 segundos','Roteiro do ChatGPT → filme','Alternativas ao InVideo','Orçamento de USD 30','Seedance completo','Teste antes de assinar'];
for (let i=1; i<=10; i++) {
  const suffix = String(i).padStart(2,'0');
  const en = current.records.find(r => r.id === 'EN'+suffix);
  const pt = current.records.find(r => r.id === 'PT'+suffix);
  table.push('| '+i+'. '+labels[i-1]+' | '+[en.baseline_kineo_position,en.kineo_position,pt.baseline_kineo_position,pt.kineo_position].map(position).join(' | ')+' |');
}
const lines = [
'# CITACOES-01 — medição real no ChatGPT às 20h',
'',
'**EVIDÊNCIA DE PRODUÇÃO — 10/09/2026:** 20 respostas completas lidas, em conversas temporárias independentes. Coleta de 20:05:09 a 20:12:51 BRT. A Kineo aparece em **3/20**, todas na primeira posição; **17/20** ausências. EN09 e EN10 ainda apresentam ofertas antigas. PT09 apresenta o preço inicial correto, sem explicitar todos os termos vigentes.',
'',
'**EVIDÊNCIA DE PRODUÇÃO — método:** '+current.method,
'',
'**EVIDÊNCIA DE PRODUÇÃO — comparação:** a rodada da tarde, de 13:49:50 a 14:00:11 BRT, teve 4/20. Ganho de presença em PT09; perdas em EN05 e PT10; manutenção em EN09/EN10. Oito páginas do mandato respondem perguntas já existentes na auditoria; não há pergunta nova única a acrescentar.',
'',
...table,
'',
'**HIPÓTESE:** recuperação de conteúdo antigo no índice/retrieval ou composição da resposta continuam compatíveis com os erros comerciais. **QUESTÃO PENDENTE / DESCONHECIDO:** não se identificou a origem exata dos números usados nem uma causa comprovada da queda de cadastros. A mudança entre duas amostras não estabelece tendência ou efeito causal das páginas publicadas.',
'',
'**CONTRADIÇÃO / EVIDÊNCIA DE PRODUÇÃO — 20h:** EN09 cita três URLs e anuncia planos antigos; EN10 cita duas variantes da calculadora e anuncia trial pago/80 créditos/renovação antiga. Os cinco GETs exatos de contraprova exibem trial de 30 e não apresentam aqueles preços antigos nos trechos de HTML, FAQ/JSON-LD ou metadados inspecionados. Quatro GETs foram feitos às 20:08:43–44; a variante exata da calculadora foi reutilizada do checkpoint de 20:03:52. PT09 usa a mesma URL Seedance, sem nova URL a consultar. Ver [contraprova](HTTP-CITED-LINKS.md) e [JSON com hashes](http-cited-links.json). Não é prova de cache.',
'',
'**EVIDÊNCIA DE PRODUÇÃO — busca separada:** [20 buscas literais](busca-20-perguntas.md), de 20:02:11 a 20:03:08 BRT, encontram Kineo nas mesmas 7/20 perguntas da tarde; zero ganhos ou perdas de presença. Ordem devolvida pela ferramenta não é posição no ChatGPT, Google ou Bing. Três consultas em português retornam snippet com plano antigo de USD 14 e USD mundial na página portuguesa.',
'',
'**EVIDÊNCIA DE PRODUÇÃO — publicação e erros ativos:** [checkpoint HTTP](HTTP-CHECKPOINT.md) de 20:03:49–53 verifica as cinco páginas novas publicadas (200, marcador e canonical próprios) e as três preparadas ainda 404. Kling/Veo ainda têm FAQ de 80 créditos; a apresentação de motores como Studio e textos de cobrança mundial em USD persistem. Não houve edição comercial nem nova publicação nesta rodada.',
'',
'**REFERÊNCIA VIGENTE — instrução do fundador em 10/09/2026:** trial grátis de 30 créditos, sem cartão, todo motor desbloqueado condicionado ao saldo; filmes do trial com marca; USD 9,90/19,90/39,90 para 60/150/300 créditos; brasileiros pagam em reais.',
'',
'## Registro por pergunta',
'',
'**EVIDÊNCIA DE PRODUÇÃO:** a ordem abaixo é a primeira lista/tabela de recomendações da resposta. Preços, limites e features de concorrentes são alegações observadas, não verificação nossa nem oferta a republicar. Links são os destinos renderizados selecionados; não houve clique de aquisição.',
''];
for (const r of current.records) {
  lines.push('### '+r.id, '', '**Pergunta literal:** '+r.query_exact, '',
    '**EVIDÊNCIA DE PRODUÇÃO — '+r.collected_utc+':** Kineo '+position(r.kineo_position)+'. Ordem: '+r.primary_order.map((name,index)=>(index+1)+'. '+name).join(' → ')+'.', '',
    '**Destaques observados na resposta:** '+r.observed_highlights, '',
    '**Fontes renderizadas selecionadas:** '+r.source_links_selected.map((url,index)=>'[fonte '+(index+1)+']('+url+')').join(' · '), '');
}
lines.push('**QUESTÃO PENDENTE / DESCONHECIDO:** cadastros únicos externos via ChatGPT e receita não foram consultados neste checkpoint. Não contabilizar estas pesquisas, GETs ou aberturas como clientes.');
fs.writeFileSync(path.join(directory,'chatgpt-20-perguntas.md'), lines.join('\n')+'\n','utf8');
fs.writeFileSync(path.join(directory,'comparison-table.md'), '**EVIDÊNCIA DE PRODUÇÃO — 10/09/2026, amostras da tarde e das 20h.**\n\n'+table.join('\n')+'\n','utf8');
console.log(JSON.stringify({queries:current.records.length,present:current.records.filter(r=>r.kineo_cited).map(r=>r.id),old:current.records.filter(r=>r.obsolete_kineo_offer).map(r=>r.id),exactMatch:current.records.every(r=>baseline.records.find(b=>b.id===r.id).query_exact===r.query_exact)},null,2));

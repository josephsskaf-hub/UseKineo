// Offline comparison: retain original attempts and expose every new failing assertion.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const [baseFile, candidateFile, output, rerunsFile] = process.argv.slice(2);
if (!baseFile || !candidateFile) throw new Error('Usage: node compare-admin-leve-2310.cjs baseline.json candidate.json [output.json] [reruns.json]');
const base = JSON.parse(fs.readFileSync(baseFile)), candidate = JSON.parse(fs.readFileSync(candidateFile));
const reruns = rerunsFile ? JSON.parse(fs.readFileSync(rerunsFile)) : { base: [], candidate: [] };
const roots = [base.root, candidate.root].filter((s) => s && s !== '.');
const normalize = (s) => { let n = s.replace(/\\/g, '/'); for (const root of roots) n = n.split(root.replace(/\\/g, '/')).join('<ROOT>'); return n; };
const fingerprint = (runFile, run, item) => {
  const log = path.join(path.dirname(runFile), run.label, item.log);
  return { ...item, logSha256: fs.existsSync(log) ? crypto.createHash('sha256').update(fs.readFileSync(log)).digest('hex') : null };
};
const baseMap = new Map(base.results.map((r) => [r.file, fingerprint(baseFile, base, r)]));
const candidateMap = new Map(candidate.results.map((r) => [r.file, fingerprint(candidateFile, candidate, r)]));
function effective(map, list, file) { return list.filter((r) => r.file === file).at(-1) ?? map.get(file); }
const all = [...new Set([...baseMap.keys(), ...candidateMap.keys(), ...reruns.base.map((r) => r.file), ...reruns.candidate.map((r) => r.file)])].sort();
const newReds = [], newAssertions = [], newTests = [], missing = [], unchangedReds = [];
const matrix = all.map((file) => {
  const b = effective(baseMap, reruns.base, file), c = effective(candidateMap, reruns.candidate, file);
  if (!b) { newTests.push({ file, status: c?.status }); if (c?.status !== 0) newReds.push(file); }
  else if (!c) missing.push(file);
  else if (c.status !== 0) {
    if (b.status === 0) newReds.push(file); else unchangedReds.push(file);
    const old = new Set((b.failures ?? []).map(normalize));
    const added = (c.failures ?? []).map(normalize).filter((s) => !old.has(s));
    if (added.length) newAssertions.push({ file, added });
  }
  return { file, base: b?.status ?? null, candidate: c?.status ?? null };
});
const result = { date: '2026-10-23', complete: base.done === base.total && candidate.done === candidate.total && missing.length === 0, baseline: base, candidate, reruns, matrix, newTests, missing, newReds, newAssertions, unchangedReds, logFingerprints: { base: [...baseMap.values()], candidate: [...candidateMap.values()] } };
if (output) fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ complete: result.complete, baseline: `${base.done}/${base.total}`, candidate: `${candidate.done}/${candidate.total}`, newTests, missing, newReds, newAssertions, unchangedReds: unchangedReds.length }, null, 2));
process.exitCode = result.complete && newReds.length === 0 && newAssertions.length === 0 && newTests.every((t) => t.status === 0) ? 0 : 1;

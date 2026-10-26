import { readdirSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
const own = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] || process.cwd());
const label = process.argv[3] || 'baseline';
const maxReaders = Math.max(1, Number(process.argv[6] || 1));
const timeoutMs = Math.max(1000, Number(process.argv[7] || 600000));
if (!process.argv[4]) throw new Error('Pass an explicit output directory outside the checkout.');
const out = resolve(process.argv[4]);
const outputRelative = relative(root, out);
if (!outputRelative || (!isAbsolute(outputRelative) && outputRelative.split(sep)[0] !== '..')) throw new Error('Output must stay outside the checkout, so scope guards see a clean tree.');
mkdirSync(out, { recursive: true });
const env = { ...process.env, NODE_OPTIONS: `--require "${join(own, 'offline-preload.cjs').replaceAll('\\', '/')}"`, GIT_TERMINAL_PROMPT: '0', GIT_ALLOW_PROTOCOL: 'file' };
for (const key of Object.keys(env)) if (/SECRET|TOKEN|PASSWORD|API_KEY|SERVICE_ROLE|SUPABASE|STRIPE|RESEND|OPENAI|FAL_|VERCEL/i.test(key)) delete env[key];
const selection = process.argv[5] ? new Set(JSON.parse(readFileSync(resolve(process.argv[5]), 'utf8'))) : null;
const priority = name => /affiliate|afiliad|checkout|partners|pricing|promo|welcome/.test(name) ? 0 : 1;
const scripts = readdirSync(join(root, 'scripts')).filter(x => /^test-.*\.mjs$/.test(x) && (!selection || selection.has(x))).sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
const reportPath = join(out, 'results.json');
const currentSourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : { label, date: new Date().toISOString(), root, base: currentSourceSha, offline: true, total: scripts.length, results: [] };
for (const result of report.results) { result.source_sha ??= report.base; result.date_utc ??= report.date; }
report.current_source_sha = currentSourceSha;
const completed = new Set(report.results.map(x => x.name));
report.total = new Set([...scripts, ...completed]).size;
report.readerLimit = maxReaders; report.timeoutMs = timeoutMs; report.paused = false; delete report.finished;
async function run(name) {
  const start = Date.now();
  const result = await new Promise(done => {
    let stdout = '', stderr = '', timedOut = false;
    const child = spawn(process.execPath, [join(root, 'scripts', name)], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', b => { stdout += b; }); child.stderr.on('data', b => { stderr += b; });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.on('error', error => { clearTimeout(timer); done({ code: -1, stdout, stderr: stderr + String(error), timedOut }); });
    child.on('close', code => { clearTimeout(timer); done({ code, stdout, stderr, timedOut }); });
  });
  writeFileSync(join(out, name + '.log'), result.stdout + result.stderr);
  report.results.push({ name, code: result.code, timedOut: result.timedOut, ms: Date.now() - start, source_sha: currentSourceSha, date_utc: new Date().toISOString() });
  if (result.code !== 0) console.log(`FAIL ${name}: ${result.code}${result.timedOut ? ' timeout' : ''}`);
  if (report.results.length % 50 === 0) console.log(`${label}: ${report.results.length}/${scripts.length}`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
}
// Tests that may write or launch descendants form barriers. Read-only tests
// between them run in small parallel batches; no reader overlaps a mutator.
let readers = [];
for (const name of scripts.filter(x => !completed.has(x))) {
  if (existsSync(join(out, 'STOP'))) { await Promise.all(readers); readers = []; report.paused = true; break; }
  const source = readFileSync(join(root, 'scripts', name), 'utf8');
  const serial = /writeFile|appendFile|renameSync|unlinkSync|rmSync|rmdirSync|copyFile/.test(source);
  if (serial) { await Promise.all(readers); readers = []; await run(name); }
  else { readers.push(run(name)); if (readers.length >= maxReaders) { await Promise.all(readers); readers = []; } }
}
await Promise.all(readers);
report.passed = report.results.filter(x => x.code === 0).length; report.failed = report.results.filter(x => x.code !== 0).length; report.complete = report.results.length === report.total; report.finished = new Date().toISOString();
writeFileSync(join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ label, total: report.total, passed: report.passed, failed: report.failed }));

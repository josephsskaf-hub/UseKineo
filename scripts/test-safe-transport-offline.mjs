// Executes the REAL candidate scripts against fresh file-only bare repositories.
// No network, production refs, credentials, or cleanup. Fixtures are preserved.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const scripts = dirname(fileURLToPath(import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'kineo-transport-offline-'));
const bash = 'C:/Program Files/Git/bin/bash.exe';
const env = { ...process.env, GIT_ALLOW_PROTOCOL: 'file', GIT_TERMINAL_PROMPT: '0',
  GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_AUTHOR_NAME: 'Offline Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Offline Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' };
delete env.GIT_INDEX_FILE;
delete env.GIT_DIR;
delete env.GIT_WORK_TREE;
function run(command, args, cwd = root, extra = {}) {
  return spawnSync(command, args, { cwd, env: { ...env, ...extra }, encoding: 'utf8', timeout: 30000 });
}
function git(cwd, ...args) {
  const result = run('git', args, cwd);
  assert.equal(result.status, 0, `git ${args.join(' ')}\n${result.stderr}`);
  return result.stdout.trim();
}
function fixture(name) {
  const folder = join(root, name); mkdirSync(folder);
  const bare = join(folder, 'remote.git');
  git(folder, 'init', '--bare', '--initial-branch=main', bare);
  const repo = join(folder, 'repo'); git(folder, 'clone', bare, repo);
  writeFileSync(join(repo, 'tracked.txt'), 'base\n');
  git(repo, 'add', 'tracked.txt'); git(repo, 'commit', '-m', 'base');
  const base = git(repo, 'rev-parse', 'HEAD'); git(repo, 'push', 'origin', 'HEAD:main');
  git(repo, 'branch', 'entrega-atual', base);
  git(repo, 'branch', 'claude/preserve', base);
  git(repo, 'checkout', '-b', 'codex/test');
  const commit = (text = 'approved') => {
    writeFileSync(join(repo, 'tracked.txt'), text + '\n');
    git(repo, 'add', 'tracked.txt'); git(repo, 'commit', '-m', text);
    return git(repo, 'rev-parse', 'HEAD');
  };
  const head = commit();
  return { repo, bare, base, head, folder, commit };
}
const enqueue = f => run(bash, [join(scripts, 'enfileirar.sh')], f.repo);
const publish = (f, sha = f.head, base = f.base) => run(bash,
  [join(scripts, 'publish-reviewed-queue.sh'), f.repo, sha, base]);
const remote = f => git(f.bare, 'rev-parse', 'main');
let passed = 0;
function check(name, fn) { fn(); ++passed; console.log(`PASS ${name}`); }
const happy = fixture('happy');
check('queue CAS + publisher happy path', () => {
  const q = enqueue(happy); assert.equal(q.status, 0, q.stderr);
  assert.equal(git(happy.repo, 'rev-parse', 'entrega-atual'), happy.head);
  const p = publish(happy); assert.equal(p.status, 0, p.stderr);
  assert.equal(remote(happy), happy.head);
  assert.equal(git(happy.repo, 'rev-parse', 'claude/preserve'), happy.base);
});
check('repeated exact delivery is a no-op', () => {
  assert.equal(enqueue(happy).status, 0);
  const p = publish(happy, happy.head, happy.head); assert.equal(p.status, 0, p.stderr);
});
const changedQueue = fixture('changed-queue');
check('publisher rejects queue changed after review', () => {
  const newer = changedQueue.commit('newer queued work');
  git(changedQueue.repo, 'update-ref', 'refs/heads/entrega-atual', newer, changedQueue.base);
  assert.notEqual(publish(changedQueue).status, 0);
  assert.equal(remote(changedQueue), changedQueue.base);
  assert.equal(git(changedQueue.repo, 'rev-parse', 'entrega-atual'), newer);
});
const changedMain = fixture('changed-main');
check('publisher rejects remote changed since review', () => {
  assert.equal(enqueue(changedMain).status, 0);
  const newer = changedMain.commit('new remote');
  git(changedMain.repo, 'push', 'origin', `${newer}:main`);
  assert.notEqual(publish(changedMain).status, 0);
  assert.equal(remote(changedMain), newer);
  assert.equal(git(changedMain.repo, 'rev-parse', 'entrega-atual'), changedMain.head);
});
const dirty = fixture('dirty');
check('dirty worktree, index, untracked files and preexisting locks preserved', () => {
  writeFileSync(join(dirty.repo, 'tracked.txt'), 'user unstaged\n');
  writeFileSync(join(dirty.repo, 'staged.txt'), 'user staged\n'); git(dirty.repo, 'add', 'staged.txt');
  writeFileSync(join(dirty.repo, 'untracked.txt'), 'user untracked\n');
  const index = readFileSync(join(dirty.repo, '.git/index'));
  writeFileSync(join(dirty.repo, '.git/index.lock'), 'do not delete');
  writeFileSync(join(dirty.repo, '.git/HEAD.lock'), 'do not delete head');
  assert.notEqual(enqueue(dirty).status, 0);
  assert.deepEqual(readFileSync(join(dirty.repo, '.git/index')), index);
  assert.equal(readFileSync(join(dirty.repo, 'tracked.txt'), 'utf8'), 'user unstaged\n');
  assert.equal(readFileSync(join(dirty.repo, 'staged.txt'), 'utf8'), 'user staged\n');
  assert.equal(readFileSync(join(dirty.repo, 'untracked.txt'), 'utf8'), 'user untracked\n');
  assert.equal(readFileSync(join(dirty.repo, '.git/index.lock'), 'utf8'), 'do not delete');
  assert.equal(readFileSync(join(dirty.repo, '.git/HEAD.lock'), 'utf8'), 'do not delete head');
  assert.equal(git(dirty.repo, 'rev-parse', 'entrega-atual'), dirty.base);
});
const refused = fixture('reject-push');
check('remote rejection has no retry, cleanup or branch reconciliation', () => {
  assert.equal(enqueue(refused).status, 0);
  const hook = '#!/bin/sh\nprintf "called\\n" >> "$GIT_DIR/rejections.log"\nexit 1\n';
  writeFileSync(join(refused.bare, 'hooks/pre-receive'), hook, { mode: 0o755 });
  const before = git(refused.repo, 'show-ref');
  assert.notEqual(publish(refused).status, 0);
  assert.equal(remote(refused), refused.base);
  assert.equal(git(refused.repo, 'show-ref'), before);
  assert.equal(readFileSync(join(refused.bare, 'rejections.log'), 'utf8').trim(), 'called');
});
const checkedOut = fixture('checked-out-queue');
check('queue checked out elsewhere cannot be moved', () => {
  git(checkedOut.repo, 'worktree', 'add', join(checkedOut.folder, 'owner'), 'entrega-atual');
  assert.notEqual(enqueue(checkedOut).status, 0);
  assert.equal(git(checkedOut.repo, 'rev-parse', 'entrega-atual'), checkedOut.base);
});
check('full SHAs and normal codex branch are mandatory', () => {
  assert.notEqual(publish(happy, happy.head.slice(0, 8), happy.head).status, 0);
  git(checkedOut.repo, 'checkout', 'main');
  assert.notEqual(enqueue(checkedOut).status, 0);
});
const race = fixture('concurrent');
const other = join(race.folder, 'other');
git(race.repo, 'worktree', 'add', '-b', 'codex/other', other, race.base);
writeFileSync(join(other, 'other.txt'), 'other writer\n'); git(other, 'add', 'other.txt');
git(other, 'commit', '-m', 'other writer'); const otherHead = git(other, 'rev-parse', 'HEAD');
function asyncEnqueue(cwd) {
  return new Promise(resolveResult => {
    const proc = spawn(bash, [join(scripts, 'enfileirar.sh')], { cwd, env, stdio: 'pipe' });
    let output = ''; proc.stdout.on('data', chunk => output += chunk); proc.stderr.on('data', chunk => output += chunk);
    proc.on('error', error => resolveResult({ code: -1, output: String(error) }));
    proc.on('close', code => resolveResult({ code, output }));
  });
}
const racers = await Promise.all([asyncEnqueue(race.repo), asyncEnqueue(other)]);
check('concurrent enqueue preserves winner and rejects loser', () => {
  assert.equal(racers.filter(r => r.code === 0).length, 1, JSON.stringify(racers));
  const winner = git(race.repo, 'rev-parse', 'entrega-atual');
  assert.equal(winner, racers[0].code === 0 ? race.head : otherHead);
  assert.equal(remote(race), race.base);
});
const wrapper = fixture('batch wrapper spaces');
check('Windows BAT wrapper executes same publisher in isolated fixture', () => {
  assert.equal(enqueue(wrapper).status, 0);
  const copiedScripts = join(wrapper.repo, 'scripts'); mkdirSync(copiedScripts);
  const bat = readFileSync(join(scripts, '!RODAR-AGORA.bat'), 'utf8').replace(/\r?\n/g, '\r\n');
  writeFileSync(join(copiedScripts, '!RODAR-AGORA.bat'), bat);
  writeFileSync(join(copiedScripts, 'publish-reviewed-queue.sh'), readFileSync(join(scripts, 'publish-reviewed-queue.sh')));
  const result = run('cmd.exe', ['/d', '/c', 'scripts\\!RODAR-AGORA.bat', wrapper.head, wrapper.base], wrapper.repo);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(remote(wrapper), wrapper.head);
  assert.equal(git(wrapper.repo, 'rev-parse', 'claude/preserve'), wrapper.base);
});
const gitLock = fixture('queue-lock');
const movingQueue = fixture('queue-moves-at-pre-push');
check('queue movement AFTER final checks cannot change pushed SHA', () => {
  assert.equal(enqueue(movingQueue).status, 0);
  const later = movingQueue.commit('later not reviewed for this push');
  writeFileSync(join(movingQueue.repo, '.git/hooks/pre-push'),
    `#!/bin/sh\ngit update-ref refs/heads/entrega-atual ${later} ${movingQueue.head}\n`, { mode: 0o755 });
  const result = publish(movingQueue);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(remote(movingQueue), movingQueue.head);
  assert.equal(git(movingQueue.repo, 'rev-parse', 'entrega-atual'), later);
  assert.notEqual(remote(movingQueue), later);
});
check('preexisting queue lock is preserved and stops enqueue', () => {
  const lock = join(gitLock.repo, '.git/refs/heads/entrega-atual.lock');
  writeFileSync(lock, 'other active queue writer');
  assert.notEqual(enqueue(gitLock).status, 0);
  assert.equal(readFileSync(lock, 'utf8'), 'other active queue writer');
  assert.equal(git(gitLock.repo, 'rev-parse', 'entrega-atual'), gitLock.base);
});
const gitIndex = fixture('alternate-index');
check('alternate index rejected before any writes', () => {
  const oldQueue = git(gitIndex.repo, 'rev-parse', 'entrega-atual');
  const extra = { GIT_INDEX_FILE: join(gitIndex.folder, 'not-created.index') };
  assert.notEqual(run(bash, [join(scripts, 'enfileirar.sh')], gitIndex.repo, extra).status, 0);
  assert.notEqual(run(bash, [join(scripts, 'publish-reviewed-queue.sh'), gitIndex.repo, gitIndex.head, gitIndex.base], root, extra).status, 0);
  assert.equal(existsSync(extra.GIT_INDEX_FILE), false);
  assert.equal(git(gitIndex.repo, 'rev-parse', 'entrega-atual'), oldQueue);
  assert.equal(remote(gitIndex), gitIndex.base);
});
const summary = { passed, fixtures: root, network: 'disabled: file protocol only',
  productionTouched: false, timestamp: new Date().toISOString(), races: racers };
writeFileSync(join(root, 'result.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

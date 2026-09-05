#!/usr/bin/env node
// KINEO — guardiao do PUBLICADOR (scripts/!RODAR-AGORA.bat), 05/09/2026.
//
// POR QUE ESTE TESTE EXISTE
// Em 05/09 a fila tinha 19 entregas prontas e ZERO no ar. O clique do fundador
// terminava em "PAROU NO CONFLITO" com a lista de arquivos VAZIA. Duas rotacoes
// trataram o publicador como consertado sem nunca terem RODADO o publicador.
// Quando ele foi finalmente rodado, apareceram dois defeitos, os dois
// escondidos por supressao de saida:
//
//   (a) `git cherry-pick --skip >/dev/null 2>&1` — `>/dev/null` e sintaxe de
//       shell POSIX. Dentro de um .bat o cmd NAO executa o comando: tenta abrir
//       o caminho \dev\null, reclama e pula a linha. O --skip que o v10 existe
//       para dar nunca foi dado uma vez sequer.
//
//   (b) O QUE TRAVAVA DE VERDADE: os refspecs de `git fetch` nao tinham o "+"
//       de forca. `refs/remotes/empurrar-novo` sobra da rodada anterior, e cada
//       rebase gera commits NOVOS (SHAs diferentes), entao o fetch e recusado:
//         ! [rejected] empurrar -> empurrar-novo (non-fast-forward)
//       O `2>nul` comia a mensagem, `|| exit /b 1` fazia :rebasar devolver 1 e
//       o bat anunciava conflito. Consequencia: o publicador funcionava UMA vez
//       na vida da maquina e nunca mais.
//
// O teste tem duas partes: LEITURA do bat real (nao de uma copia) e uma PROVA
// executavel em git de que a causa (b) e real e que o "+" a resolve.
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const BAT = join(RAIZ, 'scripts', '!RODAR-AGORA.bat');

let ok = 0, fail = 0;
const check = (nome, cond, detalhe = '') => {
  if (cond) { ok++; console.log(`  ok   ${nome}`); }
  else { fail++; console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ''}`); }
};

console.log('== 1. o bat real, lido do disco ==');
const bat = readFileSync(BAT, 'latin1');
const linhas = bat.split(/\r?\n/);

// (a) nenhuma redacao POSIX dentro do .bat
// Comentario REM nao e codigo — e este arquivo DESCREVE o defeito, entao sem
// ignorar comentario o teste acusaria a si mesmo.
const ehComentario = (l) => /^\s*(REM\b|::)/i.test(l);
const posix = linhas
  .map((l, i) => [i + 1, l])
  .filter(([, l]) => !ehComentario(l))
  .filter(([, l]) => /(^|\s)\d?>>?\s*\/dev\/null/.test(l));
check('nenhum >/dev/null (sintaxe POSIX) dentro do .bat', posix.length === 0,
  posix.map(([n, l]) => `linha ${n}: ${l.trim()}`).join(' | '));

// e o --skip do v10 precisa continuar existindo, agora com redacao de cmd
const skip = linhas.filter(l => /cherry-pick\s+--skip/.test(l));
check('o cherry-pick --skip continua no bat', skip.length >= 1);
check('o --skip usa >nul (redacao do cmd), nao >/dev/null',
  skip.every(l => />nul/.test(l) && !/\/dev\/null/.test(l)),
  skip.map(l => l.trim()).join(' | '));

// (b) TODO refspec que escreve em refs/remotes/ precisa do "+" de forca
const refspecs = [];
for (const [i, l] of linhas.entries()) {
  if (!/git fetch/.test(l)) continue;
  for (const m of l.matchAll(/"([^"]*:refs\/remotes\/[^"]*)"/g)) refspecs.push([i + 1, m[1]]);
}
check('o bat ainda tem refspecs de fetch para refs/remotes/ (o teste nao ficou cego)',
  refspecs.length >= 3, `achei ${refspecs.length}`);
const semForca = refspecs.filter(([, r]) => !r.startsWith('+'));
check('todo refspec de fetch para refs/remotes/ carrega o "+" de forca',
  semForca.length === 0,
  semForca.map(([n, r]) => `linha ${n}: ${r}`).join(' | '));

// o refspec que travava a fila, nominalmente
check('o refspec do empurrar-novo e forcado',
  refspecs.some(([, r]) => r === '+refs/heads/empurrar:refs/remotes/empurrar-novo'));

// a ordem de seguranca nao pode ter mudado: o branch -f so acontece DEPOIS do
// fetch dar certo, senao a fila seria movida para um hash nao verificado.
const iFetch = linhas.findIndex(l => /empurrar-novo/.test(l) && /git fetch/.test(l));
const iBranch = linhas.findIndex(l => /git branch -f entrega-atual/.test(l));
check('o `git branch -f entrega-atual` continua DEPOIS do fetch verificado',
  iFetch > -1 && iBranch > -1 && iBranch > iFetch, `fetch=${iFetch + 1} branch=${iBranch + 1}`);

console.log('== 2. prova executavel: o "+" e mesmo o que destrava ==');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const box = mkdtempSync(join(tmpdir(), 'kineo-refspec-'));
try {
  const origem = join(box, 'origem'), destino = join(box, 'destino');
  for (const d of [origem, destino]) {
    git(box, 'init', '-q', d);
    git(d, 'config', 'user.email', 'teste@kineo');
    git(d, 'config', 'user.name', 'Teste');
  }
  const commitar = (texto) => {
    writeFileSync(join(origem, 'a.txt'), texto);
    git(origem, 'add', 'a.txt');
    git(origem, 'commit', '-q', '-m', texto);
    return git(origem, 'rev-parse', 'HEAD').trim();
  };
  // primeira rodada: a ref de destino nasce. Isso sempre funcionou.
  commitar('rodada 1');
  git(destino, 'fetch', '-q', origem, 'refs/heads/master:refs/remotes/empurrar-novo');
  const r1 = git(destino, 'rev-parse', 'refs/remotes/empurrar-novo').trim();
  check('1a rodada: o fetch sem "+" cria a ref (por isso o bug parecia intermitente)', !!r1);

  // segunda rodada: o rebase gera commit NOVO, historia divergente. Sem "+", recusa.
  git(origem, 'checkout', '-q', '--orphan', 'outra');
  const r2 = commitar('rodada 2 — historia diferente, como um rebase novo');
  let recusou = false, msg = '';
  try {
    // sem -q de proposito: e a saida do git que prova o MOTIVO da recusa.
    git(destino, 'fetch', origem, 'refs/heads/outra:refs/remotes/empurrar-novo');
  } catch (e) { recusou = true; msg = [e.stderr, e.stdout, e.message].filter(Boolean).join(' ').trim(); }
  check('2a rodada SEM "+": o fetch e recusado (era isto que travava o clique)',
    recusou, msg || 'o fetch passou — a reproducao do defeito falhou');
  check('  e a ref NAO se moveu: continua no commit da 1a rodada',
    git(destino, 'rev-parse', 'refs/remotes/empurrar-novo').trim() === r1,
    'a ref mudou apesar da recusa');
  check('  e a recusa e por non-fast-forward, nao outro erro qualquer',
    /non-fast-forward|rejected/i.test(msg), msg.replace(/\s+/g, ' ').slice(0, 200));

  // com "+" a mesma operacao passa e a ref aponta para o commit novo
  git(destino, 'fetch', '-q', origem, '+refs/heads/outra:refs/remotes/empurrar-novo');
  check('2a rodada COM "+": o fetch passa e a ref aponta para o commit novo',
    git(destino, 'rev-parse', 'refs/remotes/empurrar-novo').trim() === r2);
} finally {
  rmSync(box, { recursive: true, force: true });
}

console.log(`\n${ok}/${ok + fail} verificacoes verdes`);
if (fail) { console.log('PUBLICADOR REPROVADO — o clique do fundador pode voltar a parar.'); process.exit(1); }
console.log('PUBLICADOR OK.');

// Evidence runner guard: never read env files or contact a real external host.
const fs = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');
const forbidden = p => /(?:^|[\\/])\.env(?:\.|$)/i.test(String(p));
for (const key of ['readFileSync', 'readFile', 'openSync', 'open', 'createReadStream']) {
  const original = fs[key];
  fs[key] = function(p, ...args) {
    if (forbidden(p)) throw new Error('OFFLINE_GUARD: env-file read blocked');
    return original.call(this, p, ...args);
  };
}
const exists = fs.existsSync;
fs.existsSync = p => forbidden(p) ? false : exists(p);
for (const key of ['readFile', 'open']) {
  const original = fs.promises[key];
  fs.promises[key] = function(p, ...args) {
    if (forbidden(p)) return Promise.reject(new Error('OFFLINE_GUARD: env-file read blocked'));
    return original.call(this, p, ...args);
  };
}
const local = target => {
  let hostname;
  try { hostname = new URL(String(target?.url ?? target)).hostname; } catch { hostname = target?.hostname ?? target?.host; }
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
};
const fetchOriginal = globalThis.fetch;
globalThis.fetch = (target, ...args) => local(target)
  ? fetchOriginal(target, ...args)
  : Promise.reject(new Error('OFFLINE_GUARD: external fetch blocked'));
for (const moduleName of ['node:http', 'node:https']) {
  const mod = require(moduleName);
  for (const key of ['request', 'get']) {
    const original = mod[key];
    mod[key] = function(target, ...args) {
      if (!local(target)) throw new Error('OFFLINE_GUARD: external HTTP blocked');
      return original.call(this, target, ...args);
    };
  }
}
syncBuiltinESMExports();

const fs = require('node:fs');
const mod = require('node:module');
const envFile = p => /(^|[\\/])\.env(?:[.\\/]|$)/i.test(String(p));
for (const name of ['readFileSync','readFile','openSync','open']) {
  const old = fs[name]; fs[name] = function(p, ...rest) { if(envFile(p)) throw new Error('OFFLINE_GUARD: env read forbidden'); return old.call(this,p,...rest); };
}
const oldExists = fs.existsSync; fs.existsSync = function(p) { return envFile(p) ? false : oldExists.call(this,p); };
for (const name of ['readFile','open']) { const old = fs.promises[name]; fs.promises[name] = function(p,...rest) { if(envFile(p)) return Promise.reject(new Error('OFFLINE_GUARD: env read forbidden')); return old.call(this,p,...rest); }; }
const blocked = () => { throw new Error('OFFLINE_GUARD: network forbidden'); };
for(const name of ['node:http','node:https']) { const m=require(name);m.request=blocked;m.get=blocked; }
for(const name of ['node:net','node:tls']) { const m=require(name);m.connect=blocked;if(m.createConnection)m.createConnection=blocked; }
globalThis.fetch=blocked;
mod.syncBuiltinESMExports();

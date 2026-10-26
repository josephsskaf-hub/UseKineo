const fs = require('node:fs');
const path = require('node:path');
const { syncBuiltinESMExports } = require('node:module');
const forbidden = x => { throw new Error('OFFLINE_GUARD forbids ' + x); };
const validate = value => { let text; try { text = value instanceof URL ? value.pathname : String(value); } catch { return; } if (text.split(/[\\/]/).some(part => /^\.env(?:\.|$)/i.test(part))) forbidden('environment-file read'); };
for (const name of ['readFileSync','readFile','openSync','open','createReadStream']) { const old = fs[name]; fs[name] = function(file,...args) { validate(file); return old.call(this,file,...args); }; }
for (const name of ['readFile','open']) { const old = fs.promises[name]; fs.promises[name] = function(file,...args) { validate(file); return old.call(this,file,...args); }; }
for (const [name, methods] of [['node:http',['request','get']], ['node:https',['request','get']], ['node:net',['connect','createConnection']], ['node:tls',['connect']], ['node:dns',['lookup','resolve','resolve4','resolve6']]]) { const mod = require(name); for (const method of methods) mod[method] = () => forbidden(name + '.' + method); }
globalThis.fetch = () => forbidden('fetch');
if (globalThis.WebSocket) globalThis.WebSocket = class { constructor(){ forbidden('WebSocket'); } };
syncBuiltinESMExports();

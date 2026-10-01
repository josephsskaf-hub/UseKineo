const net=require('node:net'),tls=require('node:tls'),http=require('node:http'),https=require('node:https');
const deny=()=>{throw Error('SHOWCASE_OFFLINE: network forbidden')};
net.connect=net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;http.request=http.get=https.request=https.get=deny;globalThis.fetch=deny;
require('node:module').syncBuiltinESMExports();

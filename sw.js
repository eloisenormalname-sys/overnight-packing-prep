// Increment VERSION whenever any cached asset changes. Scope stays in this app folder.
const VERSION='v1.0.2';
const PREFIX=`overnight-prep:${self.registration.scope}:`;
const CACHE=PREFIX+VERSION;
const ASSETS=['./','./index.html','./styles.css','./app.js','./model.js','./routine.json','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./README.md'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  // A release is cached atomically; mixed old JS/new data cannot partially replace it.
  const exact=await cache.match(event.request,{ignoreSearch:true});if(exact)return exact;
  if(event.request.mode==='navigate')return (await cache.match('./index.html'))||fetch(event.request);
  return fetch(event.request);
 })());
});

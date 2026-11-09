/* Deures · service worker: funciona sin conexión + recibe notificaciones push */
const VERSION='deures-20261109204259';
const SHELL=['./','./index.html','./config.js','./vendor/supabase.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/badge-96.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin){
    // fuentes de Google: caché primero; el resto (Supabase) siempre a la red
    if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(caches.open(VERSION).then(c=>c.match(req).then(r=>r||fetch(req).then(res=>{ if(res.ok||res.type==='opaque') c.put(req,res.clone()); return res; }))));
    return;
  }
  if(req.mode==='navigate'){
    // red primero (para tener siempre la última versión); sin red, la copia guardada
    e.respondWith(fetch(req).then(res=>{ if(res.ok){ const cp=res.clone(); caches.open(VERSION).then(c=>c.put('./index.html',cp)); } return res; }).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit=>{
    const net=fetch(req).then(res=>{ if(res.ok) caches.open(VERSION).then(c=>c.put(req,res.clone())); return res; }).catch(()=>hit);
    return hit||net;
  }));
});

self.addEventListener('push',e=>{
  let d={}; try{ d=e.data?e.data.json():{}; }catch(err){ d={title:'Deures',body:e.data?e.data.text():''}; }
  const title=d.title||'Deures';
  const opts={body:d.body||'',tag:d.tag||undefined,renotify:!!d.tag,icon:'./icons/icon-192.png',badge:'./icons/badge-96.png',data:{url:d.url||'#hoy'},timestamp:Date.now()};
  e.waitUntil(self.registration.showNotification(title,opts));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const hash=(e.notification.data&&e.notification.data.url)||'#hoy';
  const target=new URL('./'+hash,self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){ if(c.url.startsWith(self.registration.scope)){ c.postMessage({type:'nav',hash:hash.replace('#','')}); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});

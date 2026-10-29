// Lapisan pengganti Firebase compat (auth + firestore) di atas Supabase, agar kode index.html dan tryout.html tetap sama.
// Tiap dokumen Firestore = satu baris tabel public.docs (path, col, data). Lihat supabase-schema.sql.
(function(){
  'use strict';
  const cfg=window.SUPABASE_CONFIG||{};
  const sb=window.supabase.createClient(cfg.url,cfg.key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.__sb=sb;

  // ---------- Timestamp ----------
  class Timestamp{constructor(ms){this._ms=ms;this.seconds=Math.floor(ms/1000);this.nanoseconds=(ms%1000)*1e6;}
    toMillis(){return this._ms;}toDate(){return new Date(this._ms);}valueOf(){return this._ms;}
    isEqual(o){return o instanceof Timestamp&&o._ms===this._ms;}toJSON(){return {seconds:this.seconds,nanoseconds:this.nanoseconds};}
    static now(){return new Timestamp(Date.now());}static fromMillis(ms){return new Timestamp(ms);}static fromDate(d){return new Timestamp(d.getTime());}}
  const NOW={__fv:'now'};
  const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  // Tulis: Timestamp/Date -> {__ts:ms}; serverTimestamp() di tingkat atas -> "__now__" (diganti trigger), di dalam -> waktu klien.
  function enc(v,top){
    if(v===NOW)return top?'__now__':{__ts:Date.now()};
    if(v instanceof Timestamp)return {__ts:v._ms};
    if(v instanceof Date)return {__ts:v.getTime()};
    if(Array.isArray(v))return v.map(x=>enc(x,false));
    if(isObj(v)){const o={};for(const k in v)if(v[k]!==undefined)o[k]=enc(v[k],false);return o;}
    return v;}
  const encTop=d=>{const o={};for(const k in d)if(d[k]!==undefined)o[k]=enc(d[k],true);return o;};
  function dec(v){
    if(Array.isArray(v))return v.map(dec);
    if(isObj(v)){const ks=Object.keys(v);if(ks.length===1&&ks[0]==='__ts')return new Timestamp(+v.__ts);
      const o={};for(const k of ks)o[k]=dec(v[k]);return o;}
    return v;}

  // ---------- Galat ala Firebase ----------
  function err(e){if(!e)return e;const m=e.message||String(e);const x=new Error(m);
    x.code=e.code==='42501'||/row-level security|hanya|boleh/i.test(m)?'permission-denied':/not-found/.test(m)?'not-found':
      /JWT|auth/i.test(m)?'unauthenticated':/fetch|network/i.test(m)?'unavailable':(e.code||'unknown');return x;}
  const chk=r=>{if(r.error)throw err(r.error);return r.data;};

  // ---------- Snapshot ----------
  class DocSnap{constructor(path,row){this.ref=new DocRef(path);this.id=path.split('/').pop();this.exists=!!row;this._d=row?row.data:undefined;this.metadata={hasPendingWrites:false,fromCache:false};}
    data(){return this.exists?dec(this._d):undefined;}get(f){const d=this.data();return d?d[f]:undefined;}}
  class QuerySnap{constructor(rows){this.docs=rows.map(r=>new DocSnap(r.path,r));this.size=this.docs.length;this.empty=!this.size;}
    forEach(f,t){this.docs.forEach(f,t);}}

  // ---------- Cache lokal (IndexedDB) untuk get({source:'cache'}), dipakai bank soal ----------
  let idbP=null;const idb=()=>idbP||(idbP=new Promise((ok,no)=>{try{const r=indexedDB.open('cat-sb',1);r.onupgradeneeded=()=>r.result.createObjectStore('d');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);}catch(e){no(e);}}));
  const cGet=k=>idb().then(db=>new Promise((ok,no)=>{const q=db.transaction('d').objectStore('d').get(k);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);}));
  const cPut=(k,v)=>idb().then(db=>{const t=db.transaction('d','readwrite');t.objectStore('d').put(v,k);}).catch(()=>{});

  // ---------- Realtime: satu kanal per pendengar ----------
  let seq=0;const live=new Set();
  function listen(filter,onRow,onDel,onReady){
    const ch=sb.channel('l'+(++seq)+'-'+Math.random().toString(36).slice(2,8));
    ch.on('postgres_changes',{event:'*',schema:'public',table:'docs',filter},p=>{
        if(p.eventType==='DELETE'){if(p.old&&p.old.path)onDel(p.old.path);return;}
        const r=p.new;if(!r||!r.path)return;if(p.errors&&p.errors.length)onRow(r.path,null,true);else onRow(r.path,{path:r.path,data:r.data},false);})
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'docs'},p=>{if(p.old&&p.old.path)onDel(p.old.path);})
      .subscribe(s=>{if(s==='SUBSCRIBED')onReady();});
    const L={ch,touch:onRow};live.add(L);
    return ()=>{live.delete(L);sb.removeChannel(ch);};}
  // Setelah menulis, segarkan pendengar yang memantau dokumen itu tanpa menunggu realtime.
  async function local(path){if(!live.size)return;const r=await sb.from('docs').select('path,data').eq('path',path).maybeSingle();
    if(r.error)return;live.forEach(L=>L.touch(path,r.data||null,false,true));}

  // ---------- Referensi dokumen ----------
  const rid=()=>{const a='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',b=crypto.getRandomValues(new Uint8Array(20));return Array.from(b,x=>a[x%62]).join('');};
  class DocRef{
    constructor(path){this.path=path.replace(/^\/+|\/+$/g,'');this.id=this.path.split('/').pop();}
    get parent(){return new Query(this.path.replace(/\/[^/]+$/,''));}
    async get(o){const src=o&&o.source;
      if(src==='cache'){const v=await cGet(this.path).catch(()=>null);if(!v)throw Object.assign(new Error('not in cache'),{code:'unavailable'});return new DocSnap(this.path,v);}
      const r=await sb.from('docs').select('path,data').eq('path',this.path).maybeSingle();const row=chk(r);
      if(row)cPut(this.path,row);return new DocSnap(this.path,row);}
    async set(d,o){chk(await sb.rpc('doc_set',{p_path:this.path,p_data:encTop(d),p_merge:!!(o&&o.merge)}));local(this.path);}
    async update(d){chk(await sb.rpc('doc_update',{p_path:this.path,p_patch:encTop(d)}));local(this.path);}
    async delete(){chk(await sb.from('docs').delete().eq('path',this.path));live.forEach(L=>L.touch(this.path,null,false,true));}
    collection(c){return new Query(this.path+'/'+c);}
    onSnapshot(a,b){const next=typeof a==='function'?a:a.next,fail=typeof a==='function'?b:a.error;let off=false,last='\u0000';
      const emit=row=>{if(off)return;const s=JSON.stringify(row&&row.data);if(s===last)return;last=s;next(new DocSnap(this.path,row));};
      const load=()=>sb.from('docs').select('path,data').eq('path',this.path).maybeSingle().then(r=>{if(r.error)throw err(r.error);emit(r.data);}).catch(e=>{if(!off&&fail)fail(err(e));});
      const stop=listen('path=eq.'+this.path,(p,row,partial)=>{if(p!==this.path)return;if(partial)load();else emit(row);},p=>{if(p===this.path)emit(null);},load);
      return ()=>{off=true;stop();};}
  }
  // ---------- Koleksi dan kueri (orderBy, limit) ----------
  const cmp=(a,b)=>{const v=x=>x instanceof Timestamp?x._ms:x;a=v(a);b=v(b);
    if(a===undefined||a===null)return b===undefined||b===null?0:-1;if(b===undefined||b===null)return 1;return a<b?-1:a>b?1:0;};
  class Query{
    constructor(col,ord,lim){this.col=col.replace(/^\/+|\/+$/g,'');this.id=this.col.split('/').pop();this._o=ord||[];this._l=lim||0;}
    doc(id){return new DocRef(this.col+'/'+(id||rid()));}
    orderBy(f,dir){return new Query(this.col,this._o.concat([[f,dir==='desc']]),this._l);}
    limit(n){return new Query(this.col,this._o,n);}
    async add(d){const r=this.doc();await r.set(d);return r;}
    _sort(rows){const o=this._o;if(o.length)rows.sort((x,y)=>{const a=dec(x.data),b=dec(y.data);for(const [f,desc] of o){const c=cmp(a[f],b[f]);if(c)return desc?-c:c;}return x.path<y.path?-1:x.path>y.path?1:0;});
      else rows.sort((x,y)=>x.path<y.path?-1:1);
      return this._l?rows.slice(0,this._l):rows;}
    async _fetch(){let q=sb.from('docs').select('path,data').eq('col',this.col);
      for(const [f,desc] of this._o)q=q.order('data->'+f,{ascending:!desc,nullsFirst:!desc});
      if(this._l)q=q.limit(this._l);return this._sort(chk(await q)||[]);}
    async get(){return new QuerySnap(await this._fetch());}
    onSnapshot(a,b){const next=typeof a==='function'?a:a.next,fail=typeof a==='function'?b:a.error;let off=false,m=new Map(),last,tm=null;
      const emit=()=>{if(off)return;const rows=this._sort(Array.from(m.values()));const s=JSON.stringify(rows);if(s===last)return;last=s;next(new QuerySnap(rows));};
      const load=()=>this._fetch().then(rows=>{m=new Map(rows.map(r=>[r.path,r]));emit();}).catch(e=>{if(!off&&fail)fail(err(e));});
      const later=()=>{clearTimeout(tm);tm=setTimeout(load,150);};
      const mine=p=>p.slice(0,p.lastIndexOf('/'))===this.col;
      const stop=listen('col=eq.'+this.col,(p,row,partial)=>{if(!mine(p))return;if(partial){later();return;}
          if(row)m.set(p,row);else m.delete(p);if(!row&&this._l)later();else emit();},
        p=>{if(!mine(p)||!m.has(p))return;m.delete(p);if(this._l)later();else emit();},load);
      return ()=>{off=true;clearTimeout(tm);stop();};}
  }

  // ---------- Auth ala Firebase ----------
  const toUser=u=>u&&{uid:u.id,email:u.email||'',emailVerified:!!(u.email_confirmed_at||u.confirmed_at),
    displayName:(u.user_metadata&&(u.user_metadata.full_name||u.user_metadata.name))||'',
    photoURL:(u.user_metadata&&(u.user_metadata.avatar_url||u.user_metadata.picture))||''};
  const auth={currentUser:null,_ready:false,_subs:new Set(),
    onAuthStateChanged(f){this._subs.add(f);if(this._ready)setTimeout(()=>f(this.currentUser));return ()=>this._subs.delete(f);},
    signInWithPopup(p){return this.signInWithRedirect(p);},
    async signInWithRedirect(p){const back=location.href.split('#')[0];
      const r=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:back,queryParams:(p&&p._q)||{}}});
      if(r.error)throw err(r.error);return new Promise(()=>{});},
    async signOut(){await sb.auth.signOut().catch(()=>{});}};
  let lastUid;
  sb.auth.onAuthStateChange((ev,ses)=>{const u=toUser(ses&&ses.user);auth.currentUser=u;
    // Perpanjangan token tidak dianggap login ulang, agar halaman tidak dimuat ulang tiap jam.
    const uid=u?u.uid:null;if(auth._ready&&uid===lastUid)return;auth._ready=true;lastUid=uid;
    setTimeout(()=>auth._subs.forEach(f=>{try{f(u);}catch(e){console.error(e);}}));});
  class GoogleAuthProvider{constructor(){this._q={};}setCustomParameters(q){this._q=Object.assign({},q);return this;}addScope(){return this;}}

  const db={doc:p=>new DocRef(p),collection:p=>new Query(p),enablePersistence:()=>Promise.resolve()};
  const authFn=()=>auth;authFn.GoogleAuthProvider=GoogleAuthProvider;
  const fsFn=()=>db;fsFn.FieldValue={serverTimestamp:()=>NOW};fsFn.Timestamp=Timestamp;
  window.firebase={initializeApp:()=>({}),apps:[{}],auth:authFn,firestore:fsFn};
})();

/* aochat local storage — IndexedDB only, no accounts, no network.
   Everything stays in this browser on this device. Exposes one global, AoStore.
   Every promise here settles from the real IndexedDB transaction result
   (oncomplete / onerror / onabort), so callers can report truthfully whether a
   write persisted.

   Stores
     projects  {id, name, created, updated, schema, data, assets}
               data   = the editor state object `st` (skin, w, h, name, status, msgs)
               assets = ids of rows in `assets` that this project uses
     assets    {id, projectId, name, type, blob}   local files; none are created yet
     meta      {key, value}                        last-opened project, notice dismissed
*/
const AoStore=(function(){
  const DB='aochat', VER=1, SCHEMA=1;
  let dbp=null;

  const uid=()=>(self.crypto&&crypto.randomUUID)?crypto.randomUUID()
    :'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);

  function open(){
    if(dbp) return dbp;
    dbp=new Promise((res,rej)=>{
      if(!self.indexedDB){ rej(new Error('IndexedDB is not available in this browser')); return; }
      let r; try{ r=indexedDB.open(DB,VER); }catch(e){ rej(e); return; }
      r.onupgradeneeded=()=>{
        const d=r.result;
        if(!d.objectStoreNames.contains('projects')) d.createObjectStore('projects',{keyPath:'id'});
        if(!d.objectStoreNames.contains('assets')) d.createObjectStore('assets',{keyPath:'id'})
          .createIndex('projectId','projectId');
        if(!d.objectStoreNames.contains('meta')) d.createObjectStore('meta',{keyPath:'key'});
      };
      r.onsuccess=()=>{
        const d=r.result;
        d.onversionchange=()=>{ d.close(); dbp=null; };   // let another tab upgrade
        res(d);
      };
      r.onerror=()=>rej(r.error||new Error('Could not open storage'));
      r.onblocked=()=>rej(new Error('Storage is blocked by another open tab'));
    }).catch(e=>{ dbp=null; throw e; });
    return dbp;
  }

  /* Run fn(stores) in one transaction. Resolves only when the transaction
     commits; rejects on error or abort (e.g. QuotaExceededError). */
  function tx(names,mode,fn){
    return open().then(d=>new Promise((res,rej)=>{
      let out, t;
      try{ t=d.transaction(names,mode); }catch(e){ rej(e); return; }
      t.oncomplete=()=>res(out);
      t.onerror=()=>rej(t.error||new Error('Storage error'));
      t.onabort=()=>rej(t.error||new Error('Storage write was aborted'));
      const s=names.map?names.map(n=>t.objectStore(n)):t.objectStore(names);
      try{ out=fn(s,t); }catch(e){ try{t.abort();}catch(_){} rej(e); }
    }));
  }
  const reqv=r=>new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
  const clone=o=>JSON.parse(JSON.stringify(o));

  async function list(){
    const d=await open();
    const all=await reqv(d.transaction('projects').objectStore('projects').getAll());
    return all.sort((a,b)=>b.updated-a.updated);
  }
  async function get(id){
    const d=await open();
    return reqv(d.transaction('projects').objectStore('projects').get(id));
  }
  /* Create a project from editor state. Resolves with the stored record. */
  async function create(name,data,assets){
    const now=Date.now();
    const rec={id:uid(),name:name,created:now,updated:now,schema:SCHEMA,data:clone(data),assets:assets||[]};
    await tx('projects','readwrite',s=>{ s.put(rec); });
    return rec;
  }
  /* Overwrite a project's data. Resolves with the new `updated` time once committed. */
  async function save(id,data){
    const d=await open();
    const cur=await reqv(d.transaction('projects').objectStore('projects').get(id));
    if(!cur) throw new Error('This project no longer exists');
    cur.data=clone(data); cur.updated=Date.now();
    await tx('projects','readwrite',s=>{ s.put(cur); });
    return cur.updated;
  }
  async function rename(id,name){
    const cur=await get(id); if(!cur) throw new Error('This project no longer exists');
    cur.name=name; cur.updated=Date.now();
    await tx('projects','readwrite',s=>{ s.put(cur); });
    return cur;
  }
  async function duplicate(id,name){
    const cur=await get(id); if(!cur) throw new Error('This project no longer exists');
    const now=Date.now();
    const rec={id:uid(),name:name,created:now,updated:now,schema:SCHEMA,data:clone(cur.data),assets:[]};
    // copy the project's local assets so the copy is independent
    await tx(['projects','assets'],'readwrite',(s)=>{
      s[0].put(rec);
      const idx=s[1].index('projectId').getAll(id);
      idx.onsuccess=()=>idx.result.forEach(a=>{
        const na=Object.assign({},a,{id:uid(),projectId:rec.id}); s[1].put(na); rec.assets.push(na.id); });
    });
    if(rec.assets.length) await tx('projects','readwrite',s=>{ s.put(rec); });
    return rec;
  }
  async function remove(id){
    await tx(['projects','assets'],'readwrite',s=>{
      s[0].delete(id);
      const c=s[1].index('projectId').openKeyCursor(IDBKeyRange.only(id));
      c.onsuccess=()=>{ const cur=c.result; if(cur){ s[1].delete(cur.primaryKey); cur.continue(); } };
    });
  }
  async function assetsOf(id){
    const d=await open();
    return reqv(d.transaction('assets').objectStore('assets').index('projectId').getAll(id));
  }
  async function getMeta(key){
    const d=await open();
    const r=await reqv(d.transaction('meta').objectStore('meta').get(key));
    return r?r.value:undefined;
  }
  function setMeta(key,value){ return tx('meta','readwrite',s=>{ s.put({key:key,value:value}); }); }

  /* Ask the browser not to evict this origin's data. Browsers may refuse or ask
     the user; the result is reported as-is and never assumed. */
  async function persistence(request){
    if(!(navigator.storage&&navigator.storage.persisted)) return 'unsupported';
    try{
      if(await navigator.storage.persisted()) return 'persistent';
      if(request&&navigator.storage.persist) return (await navigator.storage.persist())?'persistent':'best-effort';
      return 'best-effort';
    }catch(e){ return 'best-effort'; }
  }

  return {open,list,get,create,save,rename,duplicate,remove,assetsOf,getMeta,setMeta,persistence,uid,SCHEMA};
})();

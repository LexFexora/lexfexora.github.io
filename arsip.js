// Vital Test Record: satu arsip soal bersama untuk semua pengguna (tabel cat_arsip, lihat sb/supabase-update-11.sql).
// Dipakai index.html (semua mode latihan dan paket) dan tryout.html (Mock Exam).
// Soal yang direkam siapa pun terlihat oleh semua pengguna, urut menurut waktu direkam, dibagi per 50 soal.
// Hanya perekamnya atau pemilik yang bisa mengeluarkan soal dari arsip. Progres tiap pengguna tetap milik masing-masing.
// Rekaman pribadi versi sebelumnya (localStorage "tkbcakim-arsip-<uid>") dipindahkan sekali ke arsip bersama.
(function(){
  'use strict';
  const BAGIAN=50;
  let sb=null,uid='',owner=false,data=[],siap=false,galat='',muatP=null;const pend=new Set();
  const kabari=()=>pend.forEach(f=>{try{f();}catch(e){}});
  const urai=s=>{try{const o=typeof s==='string'?JSON.parse(s):s;return o&&typeof o==='object'&&!Array.isArray(o)?o:{};}catch(e){return {};}};
  async function muat(){if(!sb)return;if(muatP)return muatP;
    muatP=(async()=>{try{const {data:d,error}=await sb.from('cat_arsip').select('id,t,oleh').eq('aktif',true).order('t',{ascending:true}).order('id',{ascending:true});
        if(error){galat=/does not exist|schema cache|relation/i.test(error.message||'')?'belum':'gagal';}
        else{galat='';data=(d||[]).map(r=>({id:r.id,t:Date.parse(r.t)||0,oleh:r.oleh}));}}
      catch(e){galat='gagal';}
      siap=true;muatP=null;kabari();})();
    return muatP;}
  // Rekaman pribadi lama dipindahkan ke arsip bersama, sekali per akun, dengan urutan waktu aslinya.
  // Sumbernya: perangkat ini dan kolom "ar" di progres akun (rekaman dari HP/browser lain).
  async function pindahLama(lama,hapusLama){const k='tkbcakim-arsip-'+uid;let o={};try{o=urai(localStorage.getItem(k)||'{}');}catch(e){}
    const c=urai(lama);for(const id in c){const v=+c[id]||0;if(Math.abs(v)>Math.abs(+o[id]||0))o[id]=v;}
    const ids=Object.keys(o).filter(id=>+o[id]>0).sort((a,b)=>o[a]-o[b]);if(galat)return;
    for(const id of ids){if(!data.some(r=>r.id===id)){const {error}=await sb.rpc('cat_arsip_rekam',{p_id:id});if(error)return;}}
    try{localStorage.removeItem(k);}catch(e){}if(lama&&Object.keys(c).length&&hapusLama)try{await hapusLama();}catch(e){}if(ids.length)await muat();}
  const A={
    BAGIAN,
    get siap(){return siap;},get galat(){return galat;},
    // Dipanggil setelah login: client Supabase, uid akun, dan apakah akun ini pemilik.
    // lama: isi kolom "ar" progres akun (versi arsip pribadi), hapusLama: mengosongkannya setelah dipindahkan.
    async mulai(client,u,isOwner,lama,hapusLama){sb=client||window.__sb||null;uid=u||'';owner=!!isOwner;if(!sb)return;await muat();await pindahLama(lama,hapusLama);},
    segarkan:()=>muat(),
    ada:id=>data.some(r=>r.id===id),
    // Boleh dikeluarkan dari arsip: perekamnya sendiri atau pemilik.
    bolehHapus:id=>{const r=data.find(x=>x.id===id);return !!r&&(owner||r.oleh===uid);},
    daftar:()=>data.map(r=>r.id),
    // Bagian berisi 50 soal: soal ke-51 menjadi nomor 1 di Part 2, dan seterusnya.
    bagian(saring){const L=A.daftar().filter(saring||(()=>true)),P=[];for(let i=0;i<L.length;i+=BAGIAN)P.push(L.slice(i,i+BAGIAN));return P;},
    async ubah(id,rekam){if(!sb||!id)return false;if(rekam===undefined)rekam=!A.ada(id);
      if(rekam){if(A.ada(id))return true;data.push({id,t:Date.now(),oleh:uid});kabari();
        const {error}=await sb.rpc('cat_arsip_rekam',{p_id:id});if(error){data=data.filter(r=>r.id!==id||r.oleh!==uid);galat=/does not exist|schema cache|function/i.test(error.message||'')?'belum':'gagal';kabari();return false;}}
      else{if(!A.bolehHapus(id))return true;const lama=data;data=data.filter(r=>r.id!==id);kabari();
        const {error}=await sb.rpc('cat_arsip_hapus',{p_id:id});if(error){data=lama;kabari();return true;}}
      await muat();return A.ada(id);},
    pantau(f){pend.add(f);return ()=>pend.delete(f);}
  };
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)muat();});
  // Arsip bersama bisa bertambah dari pengguna lain: segarkan tiap 60 detik selama halaman terbuka.
  setInterval(()=>{if(!document.hidden&&sb)muat();},60000);
  window.Arsip=A;
})();

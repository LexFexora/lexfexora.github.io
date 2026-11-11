// Vital Test Record: satu arsip soal bersama untuk semua pengguna (tabel cat_arsip, lihat sb/supabase-update-11.sql).
// Dipakai index.html (semua mode latihan dan paket) dan tryout.html (Mock Exam).
// Soal yang direkam siapa pun terlihat oleh semua pengguna, urut menurut waktu direkam, dibagi per 50 soal.
// Hanya perekamnya atau pemilik yang bisa mengeluarkan soal dari arsip. Progres tiap pengguna tetap milik masing-masing.
// Rekaman pribadi versi sebelumnya (localStorage "tkbcakim-arsip-<uid>") dipindahkan sekali ke arsip bersama.
(function(){
  'use strict';
  const BAGIAN=50;
  let sb=null,uid='',owner=false,boleh=false,data=[],siap=false,galat='',muatP=null;const pend=new Set();
  const kabari=()=>pend.forEach(f=>{try{f();}catch(e){}});
  const urai=s=>{try{const o=typeof s==='string'?JSON.parse(s):s;return o&&typeof o==='object'&&!Array.isArray(o)?o:{};}catch(e){return {};}};
  async function muat(){if(!sb||!boleh)return;if(muatP)return muatP;
    // Kolom nama (pembaruan 13) dipakai bila sudah ada; bila belum, tetap jalan tanpa nama.
    const ambil=k=>sb.from('cat_arsip').select(k).eq('aktif',true).order('t',{ascending:true}).order('id',{ascending:true});
    muatP=(async()=>{try{let {data:d,error}=await ambil('id,t,oleh,nama');
        if(error&&/nama/i.test(error.message||''))({data:d,error}=await ambil('id,t,oleh'));
        if(error){galat=/does not exist|schema cache|relation/i.test(error.message||'')?'belum':'gagal';}
        else{galat='';data=(d||[]).map(r=>({id:r.id,t:Date.parse(r.t)||0,oleh:r.oleh,nama:r.nama||''}));}}
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
    // Hanya akun yang bisa membuka Simulation & Category Packages (pemilik dan pembeli aktif).
    get boleh(){return boleh;},
    async buka(){if(boleh||!sb)return;boleh=true;await muat();await pindahLama(A._lama,A._hapusLama);},
    // Dipanggil setelah login: client Supabase, uid akun, dan apakah akun ini pemilik.
    // lama: isi kolom "ar" progres akun (versi arsip pribadi), hapusLama: mengosongkannya setelah dipindahkan.
    async mulai(client,u,isOwner,lama,hapusLama){sb=client||window.__sb||null;uid=u||'';owner=!!isOwner;A._lama=lama;A._hapusLama=hapusLama;if(!sb)return;
      if(!owner){try{const {data,error}=await sb.rpc('cat_sudah_beli');boleh=!error&&data===true;}catch(e){boleh=false;}}else boleh=true;
      if(!boleh){siap=true;kabari();return;}await muat();await pindahLama(lama,hapusLama);},
    segarkan:()=>muat(),
    ada:id=>boleh&&data.some(r=>r.id===id),
    // Nama pengguna yang merekam soal ini (kosong bila belum tercatat).
    nama:id=>{const r=data.find(x=>x.id===id);return r?(r.nama||(r.oleh===uid?A._namaku||'':'')):'';},
    // Boleh dikeluarkan dari arsip: perekamnya sendiri atau pemilik.
    bolehHapus:id=>{const r=data.find(x=>x.id===id);return !!r&&(owner||r.oleh===uid);},
    daftar:()=>boleh?data.map(r=>r.id):[],
    // Bagian berisi 50 soal: soal ke-51 menjadi nomor 1 di Part 2, dan seterusnya.
    bagian(saring){const L=A.daftar().filter(saring||(()=>true)),P=[];for(let i=0;i<L.length;i+=BAGIAN)P.push(L.slice(i,i+BAGIAN));return P;},
    async ubah(id,rekam){if(!sb||!id||!boleh)return false;if(rekam===undefined)rekam=!A.ada(id);
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

// Arsip soal penting: dipakai index.html (semua mode latihan dan paket) dan tryout.html (Mock Exam).
// Data per akun: { idSoal: t } dengan t > 0 = diarsipkan pada waktu t (urutan arsip), t < 0 = dikeluarkan pada waktu |t|.
// Disimpan di perangkat (localStorage "tkbcakim-arsip-<uid>") dan di akun (progres/<uid>, kolom "ar" berupa teks JSON).
// Dua versi digabung per soal: catatan dengan waktu terbaru yang dipakai, jadi HP dan browser lain tidak saling menimpa.
(function(){
  'use strict';
  const BAGIAN=50;
  let uid='lokal',ref=null,data={},kirimT=null;const pend=new Set();
  const kunci=()=>'tkbcakim-arsip-'+uid;
  const urai=s=>{try{const o=typeof s==='string'?JSON.parse(s):s;return o&&typeof o==='object'&&!Array.isArray(o)?o:{};}catch(e){return {};}};
  // Gabungkan dua catatan: untuk setiap soal, ambil yang waktunya paling baru.
  function gabung(a,b){const r=Object.assign({},a);let ubah=false;
    for(const id in b){const v=+b[id];if(!v||!isFinite(v))continue;const w=+r[id]||0;if(Math.abs(v)>Math.abs(w)){r[id]=v;ubah=true;}}
    return {r,ubah};}
  function tulisLokal(){try{localStorage.setItem(kunci(),JSON.stringify(data));}catch(e){}}
  function bacaLokal(){try{return urai(localStorage.getItem(kunci())||'{}');}catch(e){return {};}}
  function kabari(){pend.forEach(f=>{try{f();}catch(e){}});}
  // Simpan ke akun: baca dulu versi akun, gabungkan, baru tulis.
  async function kirim(){kirimT=null;if(!ref)return;
    try{const s=await ref.get();const c=urai(s.exists&&s.data().ar);const g=gabung(data,c);if(g.ubah){data=g.r;tulisLokal();kabari();}
      if(gabung(c,data).ubah||!s.exists||!s.data().ar)await ref.set({ar:JSON.stringify(data)},{merge:true});}catch(e){}}
  function jadwal(segera){clearTimeout(kirimT);if(!ref)return;if(segera)kirim();else kirimT=setTimeout(kirim,800);}
  const A={
    BAGIAN,
    // Dipanggil setelah login: uid akun, dokumen progres/<uid>, dan isi kolom "ar" yang sudah terbaca (opsional).
    mulai(u,r,awal){uid=u||'lokal';ref=r||null;data=bacaLokal();const g=gabung(data,urai(awal));data=g.r;tulisLokal();
      if(ref&&(awal===undefined||gabung(urai(awal),data).ubah))jadwal(true);kabari();},
    // Ambil versi terbaru dari perangkat (tab lain) dan akun (HP lain).
    async segarkan(){const lama=JSON.stringify(data);data=gabung(data,bacaLokal()).r;
      if(ref){try{const s=await ref.get();data=gabung(data,urai(s.exists&&s.data().ar)).r;}catch(e){}}
      if(JSON.stringify(data)!==lama){tulisLokal();kabari();}},
    ada:id=>(+data[id]||0)>0,
    // Daftar soal yang diarsipkan, urut sesuai waktu diarsipkan (paling awal di depan).
    daftar(){return Object.keys(data).filter(id=>+data[id]>0).sort((a,b)=>data[a]-data[b]||(a<b?-1:1));},
    // Bagian berisi 50 soal: soal ke-51 menjadi nomor 1 di Bagian 2, dan seterusnya.
    bagian(saring){const L=A.daftar().filter(saring||(()=>true)),P=[];for(let i=0;i<L.length;i+=BAGIAN)P.push(L.slice(i,i+BAGIAN));return P;},
    ubah(id,arsip){if(!id)return false;const now=Math.max(Date.now(),...Object.values(data).map(v=>Math.abs(+v)||0).concat(0).map(v=>v+1));
      if(arsip===undefined)arsip=!A.ada(id);if(arsip===A.ada(id))return arsip;data[id]=arsip?now:-now;tulisLokal();jadwal();kabari();return arsip;},
    pantau(f){pend.add(f);return ()=>pend.delete(f);},
    kirimSekarang(){if(kirimT){clearTimeout(kirimT);kirim();}}
  };
  addEventListener('storage',e=>{if(e.key===kunci()&&e.newValue){const g=gabung(data,urai(e.newValue));if(g.ubah){data=g.r;kabari();}}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)A.kirimSekarang();else A.segarkan();});
  data=bacaLokal();
  window.Arsip=A;
})();

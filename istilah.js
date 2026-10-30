// Cari istilah di kolom Explanation: mencari di pembahasan dan dasar hukum seluruh bank soal,
// lalu menampilkan penjelasannya beserta dasar hukum persis seperti tertulis di bank (tidak dikarang).
(function(){
  'use strict';
  let ambil=null,bank=null,muat=null,hasil=[],tampil=0,tKetik=null,kataTerakhir='';
  const STOP=new Set('yang dan di ke dari dalam adalah apa apakah itu ini untuk dengan pada atau oleh sebagai bagi tentang serta jika bila maka tidak juga akan dapat sudah telah para suatu sebuah tersebut menurut berdasarkan arti maksud pengertian dimaksud'.split(' '));
  const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tandai=(t,ks)=>{let h=esc(t);ks.forEach(k=>{if(k.length<2)return;h=h.replace(new RegExp('('+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>');});return h;};

  const st=document.createElement('style');st.textContent='.cariist{display:flex;flex-direction:column;gap:8px;margin:2px 0 4px}\n.cariist-in{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:9px 12px 9px 34px;border:1px solid color-mix(in srgb,var(--brass,#a8843c) 30%,var(--line,#ccc));border-radius:10px;color:var(--ink,#111);\n  background:var(--bg,#fff) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2.2\' stroke-linecap=\'round\'%3E%3Ccircle cx=\'11\' cy=\'11\' r=\'7\'/%3E%3Cpath d=\'m20 20-3.5-3.5\'/%3E%3C/svg%3E") no-repeat 11px center/16px;outline:none}\n.cariist-in:focus{border-color:color-mix(in srgb,var(--brass,#a8843c) 65%,var(--line,#ccc))}\n@media (hover:none) and (pointer:coarse){.cariist-in{font-size:16px}}\n.cariist-out{display:flex;flex-direction:column;gap:8px;max-height:min(55vh,460px);overflow:auto;overscroll-behavior:contain}.cariist-out:empty{display:none}\n.cariist-ket,.cariist-nol{margin:0;font-size:12px;color:var(--muted,#777)}\n.cariist-it{padding:9px 11px;border:1px solid color-mix(in srgb,var(--brass,#a8843c) 22%,var(--line,#ddd));border-radius:10px;background:color-mix(in srgb,var(--brass,#a8843c) 5%,transparent)}\n.cariist-it p{margin:0;font-size:13.5px;line-height:1.55;text-align:left}.cariist-it p+p{margin-top:6px}\n.cariist-d{color:var(--ink,#111)}.cariist-d b{color:var(--brass,#a8843c);font-weight:650}\n.cariist-q{font-size:12px!important;color:var(--muted,#777)}\n.cariist mark{background:color-mix(in srgb,var(--brass,#d4a83c) 35%,transparent);color:inherit;border-radius:3px;padding:0 1px}\n.cariist-lagi{align-self:center;font:inherit;font-size:12.5px;padding:5px 12px;border:1px solid var(--line,#ccc);border-radius:999px;background:transparent;color:var(--ink,#111);cursor:pointer}';document.head.appendChild(st);
  const node=document.createElement('div');node.className='cariist';
  node.innerHTML='<input type="search" class="cariist-in" placeholder="Cari istilah, asas, atau pasal (mis. radha\'ah, verstek, hadhanah)…" autocomplete="off" aria-label="Cari istilah atau dasar hukum">'+
    '<div class="cariist-out" aria-live="polite"></div>';
  const inp=node.querySelector('input'),out=node.querySelector('.cariist-out');
  // Klik di dalam kotak cari tidak ikut menutup panel Explanation (details) atau memicu pintasan soal.
  ['click','keydown','keyup'].forEach(t=>node.addEventListener(t,e=>{if(t==='click'&&e.target.closest('summary'))return;e.stopPropagation();}));

  async function siapkan(){if(bank)return bank;if(!muat)muat=Promise.resolve().then(()=>ambil&&ambil()).then(a=>{
      const sudah=new Set();bank=[];(a||[]).forEach(q=>{if(!q||(!q.p&&!q.d))return;const kunci=norm(q.p)+'|'+norm(q.d);if(sudah.has(kunci))return;sudah.add(kunci);
        bank.push({q,np:norm(q.p),nd:norm(q.d),nq:norm(q.q+' '+((q.o||[])[q.a]||''))});});return bank;}).catch(()=>{muat=null;return [];});
    return muat;}

  function cari(teks){const semua=norm(teks).split(' ').filter(Boolean),ks=semua.filter(k=>!STOP.has(k));const kunci=ks.length?ks:semua;
    if(!kunci.length||norm(teks).length<2)return {ks:[],r:[]};const frasa=norm(teks);
    const r=[];bank.forEach(b=>{const gab=b.np+' '+b.nd+' '+b.nq;if(!kunci.every(k=>gab.includes(k)))return;
      let s=0;kunci.forEach(k=>{if(b.np.includes(k))s+=3;if(b.nd.includes(k))s+=2;if(b.nq.includes(k))s+=1;
        if(new RegExp('(^| )'+k+'( |$)').test(b.np+' '+b.nd))s+=2;});
      // Utamakan kalimat definisi ("X adalah ...") dan soal yang menanyakan pengertian.
      if(new RegExp('(^| )'+frasa+' (adalah|merupakan|yaitu|ialah|berarti)').test(b.np+' '+b.nd))s+=8;if(/(pengertian|yang dimaksud|dimaksud dengan|disebut|istilah)/.test(b.nq)&&b.nq.includes(frasa))s+=4;
      if(kunci.length>1&&(b.np.includes(frasa)||b.nd.includes(frasa)))s+=10;if(/pasal|undang|perma|sema|khi|khes|hir|rbg|kuhperdata|kepmen|kma/.test(b.nd))s+=1;
      r.push({b,s});});
    r.sort((x,y)=>y.s-x.s||x.b.np.length-y.b.np.length);return {ks:kunci,r};}

  function gambar(){const ks=hasil.ks||[],r=hasil.r||[];
    if(!kataTerakhir){out.innerHTML='';return;}
    if(!r.length){out.innerHTML='<p class="cariist-nol">Belum ada pembahasan di bank soal yang memuat "'+esc(kataTerakhir)+'". Coba kata lain atau istilah yang lebih umum.</p>';return;}
    const it=r.slice(0,tampil).map(({b})=>'<article class="cariist-it"><p class="cariist-p">'+tandai(b.q.p||'—',ks)+'</p>'+
      (b.q.d?'<p class="cariist-d"><b>Dasar hukum:</b> '+tandai(b.q.d,ks)+'</p>':'')+
      '<p class="cariist-q">Dari soal: '+tandai(String(b.q.q||'').slice(0,140)+(String(b.q.q||'').length>140?'…':''),ks)+'</p></article>').join('');
    out.innerHTML='<p class="cariist-ket">'+r.length+' penjelasan cocok, diambil apa adanya dari pembahasan dan dasar hukum bank soal.</p>'+it+
      (r.length>tampil?'<button type="button" class="cariist-lagi">Tampilkan '+Math.min(5,r.length-tampil)+' lagi</button>':'');
    const l=out.querySelector('.cariist-lagi');if(l)l.onclick=()=>{tampil+=5;gambar();};}

  async function jalan(){const t=inp.value.trim();kataTerakhir=t;if(t.length<2){hasil={};gambar();return;}
    if(!bank){out.innerHTML='<p class="cariist-ket">Memuat bank soal…</p>';await siapkan();if(inp.value.trim()!==t)return;}
    hasil=cari(t);tampil=5;gambar();}
  inp.addEventListener('input',()=>{clearTimeout(tKetik);tKetik=setTimeout(jalan,220);});
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(tKetik);jalan();}if(e.key==='Escape'){inp.value='';jalan();}});

  // Halaman yang memakai: tempatkan elemen .cariist-slot, kotak cari dipindah ke sana (tetap satu elemen agar isian tidak hilang).
  function tempel(root){const s=(root||document).querySelector('.cariist-slot');if(s&&s!==node)s.replaceWith(node);}
  new MutationObserver(()=>{if(document.querySelector('.cariist-slot'))tempel();}).observe(document.documentElement,{childList:true,subtree:true});
  window.IstilahCari={node,tempel,sumber(f){ambil=f;bank=null;muat=null;}};
})();

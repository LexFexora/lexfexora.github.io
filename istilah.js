// Cari istilah di kolom Explanation: mencari di pembahasan dan dasar hukum seluruh bank soal,
// lalu menampilkan penjelasannya beserta dasar hukum persis seperti tertulis di bank (tidak dikarang).
(function(){
  'use strict';
  let ambil=null,bank=null,muat=null,hasil=[],tampil=0,tKetik=null,kataTerakhir='';
  const STOP=new Set('yang dan di ke dari dalam adalah apa apakah itu ini untuk dengan pada atau oleh sebagai bagi tentang serta jika bila maka tidak juga akan dapat sudah telah para suatu sebuah tersebut menurut berdasarkan arti maksud pengertian dimaksud'.split(' '));
  const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/['’‘`ʼ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  // Ejaan yang berbeda untuk istilah yang sama (bank soal dan peraturan tidak selalu seragam).
  const VAR=[['hadhanah','hadanah','hadlanah','hadonah'],['itsbat','isbat','istbat','itsbath'],['syiqaq','syiqoq','syiqak'],['nusyuz','nusyus'],['madliyah','madhiyah','madiyah'],
    ['iddah','idah'],['talak','talaq','thalaq'],['khuluk','khulu'],['wakaf','waqaf'],['rujuk','ruju'],['mutah','muta'],['hibah','hibbah'],['shadaqah','sedekah','sadaqah'],['infaq','infak'],['syariah','syariah','syari'],['radhaah','radaah','rodhoah']];
  const alt=k=>VAR.find(g=>g.includes(k))||[k];const ada=(t,k)=>alt(k).some(a=>t.includes(a));
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tandai=(t,ks)=>{let h=esc(t);[].concat(...ks.map(alt)).forEach(k=>{if(k.length<2)return;h=h.replace(new RegExp('('+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>');});return h;};

  const st=document.createElement('style');st.textContent='.cariist{display:flex;flex-direction:column;gap:8px;margin:2px 0 4px}\n.cariist-in{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:9px 12px 9px 34px;border:1px solid color-mix(in srgb,var(--brass,#a8843c) 30%,var(--line,#ccc));border-radius:10px;color:var(--ink,#111);\n  background:var(--bg,#fff) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2.2\' stroke-linecap=\'round\'%3E%3Ccircle cx=\'11\' cy=\'11\' r=\'7\'/%3E%3Cpath d=\'m20 20-3.5-3.5\'/%3E%3C/svg%3E") no-repeat 11px center/16px;outline:none}\n.cariist-in:focus{border-color:color-mix(in srgb,var(--brass,#a8843c) 65%,var(--line,#ccc))}\n@media (hover:none) and (pointer:coarse){.cariist-in{font-size:16px}}\n.cariist-out{display:flex;flex-direction:column;gap:8px;max-height:min(55vh,460px);overflow:auto;overscroll-behavior:contain}.cariist-out:empty{display:none}\n.cariist-ket,.cariist-nol{margin:0;font-size:12px;color:var(--muted,#777)}\n.cariist-it{padding:9px 11px;border:1px solid color-mix(in srgb,var(--brass,#a8843c) 22%,var(--line,#ddd));border-radius:10px;background:color-mix(in srgb,var(--brass,#a8843c) 5%,transparent)}\n.cariist-it p{margin:0;font-size:13.5px;line-height:1.55;text-align:left}.cariist-it p+p{margin-top:6px}\n.cariist-d{color:var(--ink,#111)}.cariist-d b{color:var(--brass,#a8843c);font-weight:650}\n.cariist-q{font-size:12px!important;color:var(--muted,#777)}\n.cariist mark{background:color-mix(in srgb,var(--brass,#d4a83c) 35%,transparent);color:inherit;border-radius:3px;padding:0 1px}\n.cariist-row{display:flex;gap:6px}.cariist-row .cariist-in{flex:1;min-width:0}.cariist-go{flex:none;font:inherit;font-size:13.5px;font-weight:650;padding:0 14px;border-radius:10px;border:1px solid color-mix(in srgb,var(--brass,#a8843c) 55%,var(--line,#ccc));background:linear-gradient(180deg,color-mix(in srgb,var(--brass,#a8843c) 22%,var(--surface,#fff)),color-mix(in srgb,var(--brass,#a8843c) 10%,var(--surface,#fff)));color:var(--ink,#111);cursor:pointer}.cariist-sec{margin:4px 0 0;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--brass,#a8843c)}.cariist-h{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.cariist-h b{font-weight:700}.cariist-tag{font-size:10.5px;font-weight:650;padding:1px 7px;border-radius:999px;border:1px solid currentColor;white-space:nowrap}.cariist-tag.ok{color:var(--ok,#17733f)}.cariist-tag.u{color:var(--brass,#a8843c)}.cariist-tag.x{color:var(--bad,#b3261e)}.cariist-p.pj{display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical;overflow:hidden}.cariist-full{font:inherit;font-size:12px;padding:0;border:0;background:none;color:var(--brass,#a8843c);cursor:pointer;margin-top:4px}.cariist-it.hk{border-left:3px solid color-mix(in srgb,var(--brass,#a8843c) 60%,transparent)}.cariist-lagi{align-self:center;font:inherit;font-size:12.5px;padding:5px 12px;border:1px solid var(--line,#ccc);border-radius:999px;background:transparent;color:var(--ink,#111);cursor:pointer}';document.head.appendChild(st);
  const node=document.createElement('div');node.className='cariist';
  node.innerHTML='<div class="cariist-row"><input type="search" class="cariist-in" placeholder="Cari istilah, asas, atau pasal (mis. hadhanah, pasal 49 uu pa)…" autocomplete="off" enterkeyhint="search" aria-label="Cari istilah atau dasar hukum">'+
    '<button type="button" class="cariist-go">Search</button></div><div class="cariist-out" aria-live="polite"></div>';
  const inp=node.querySelector('input'),out=node.querySelector('.cariist-out');
  // Klik di dalam kotak cari tidak ikut menutup panel Explanation (details) atau memicu pintasan soal.
  ['click','keydown','keyup'].forEach(t=>node.addEventListener(t,e=>{if(t==='click'&&e.target.closest('summary'))return;e.stopPropagation();}));

  async function siapkan(){if(bank)return bank;if(!muat)muat=Promise.resolve().then(()=>ambil&&ambil()).then(a=>{
      const sudah=new Set();bank=[];(a||[]).forEach(q=>{if(!q||(!q.p&&!q.d))return;const kunci=norm(q.p)+'|'+norm(q.d);if(sudah.has(kunci))return;sudah.add(kunci);
        bank.push({q,np:norm(q.p),nd:norm(q.d),nq:norm(q.q+' '+((q.o||[])[q.a]||''))});});return bank;}).catch(()=>{muat=null;return [];});
    return muat;}

  // Hukum positif: hukum.json berisi bunyi pasal (perubahan undang-undang sudah digabung), KEPPH, dan rumusan SEMA pleno Kamar Agama.
  let HK=null,hkMuat=null;
  function siapkanHukum(){if(HK)return Promise.resolve(HK);if(!hkMuat){const src=(document.currentScript&&document.currentScript.src)||'';
      hkMuat=fetch(new URL('/hukum.json',location.href)).then(r=>{if(!r.ok)throw 0;return r.json();}).then(j=>{
        HK={docs:j.docs,e:j.e.map(([d,l,t,s])=>({d,l,t,s,nl:norm(l),nt:norm(l+' '+t)}))};return HK;}).catch(()=>{hkMuat=null;return null;});}
    return hkMuat;}
  // Kata yang menunjuk peraturan tertentu: dipakai sebagai saringan, bukan sebagai kata yang dicari di bunyi pasal.
  const ALIAS=[[/\b(uu ?pa|peradilan agama|1989|uu 7)\b/,[0]],[/\b(uu ?ma|mahkamah agung|1985|uu 14)\b/,[1]],[/\b(uu ?perkawinan|uup|1974|uu 1|2019)\b/,[2]],[/\bkhi\b|kompilasi hukum islam/,[3]],
    [/\b(kuhperdata|kuh perdata|kuhpdt|bw|burgerlijk wetboek)\b/,[4]],[/\b(kepph|kode etik)\b/,[5]],[/\b(sema|rumusan kamar|rumusan hukum|pleno)\b/,[6]]];
  function cariHukum(teks){if(!HK)return [];let q=norm(teks),dok=null;
    ALIAS.forEach(([re,ds])=>{if(re.test(q)){dok=(dok||[]).concat(ds);q=q.replace(re,' ');}});
    const pm=q.match(/\bpasal (\d+[a-z]?)\b/);let no=null;if(pm){no=pm[1];q=q.replace(pm[0],' ');}
    const ks=q.split(' ').filter(k=>k&&!STOP.has(k)&&k!=='ayat'&&k!=='huruf'),fr=ks.join(' ');
    if(!ks.length&&!no)return [];const r=[];
    HK.e.forEach(e=>{if(dok&&!dok.includes(e.d))return;let s=0;
      if(no){if(e.nl!=='pasal '+no)return;s+=100;}
      if(ks.length){if(!ks.every(k=>ada(e.nt,k)))return;
        ks.forEach(k=>{if(new RegExp('(^| )'+k+'( |$)').test(e.nt))s+=3;else s+=1;if(e.nl.includes(k))s+=4;});
        if(ks.length>1&&e.nt.includes(fr))s+=12;if(new RegExp('(^| )'+fr+' (adalah|ialah|yaitu|merupakan)').test(e.nt))s+=10;}
      if(e.s==='x')s-=5;s-=Math.min(4,e.t.length/1500);r.push({e,s});});
    r.sort((a,b)=>b.s-a.s);return r;}

  function cari(teks){const semua=norm(teks).split(' ').filter(Boolean),ks=semua.filter(k=>!STOP.has(k));const kunci=ks.length?ks:semua;
    if(!kunci.length||norm(teks).length<2)return {ks:[],r:[]};const frasa=norm(teks);
    const r=[];(bank||[]).forEach(b=>{const gab=b.np+' '+b.nd+' '+b.nq;if(!kunci.every(k=>ada(gab,k)))return;
      let s=0;kunci.forEach(k=>{if(ada(b.np,k))s+=3;if(ada(b.nd,k))s+=2;if(ada(b.nq,k))s+=1;
        if(new RegExp('(^| )'+k+'( |$)').test(b.np+' '+b.nd))s+=2;});
      // Utamakan kalimat definisi ("X adalah ...") dan soal yang menanyakan pengertian.
      if(new RegExp('(^| )'+frasa+' (adalah|merupakan|yaitu|ialah|berarti)').test(b.np+' '+b.nd))s+=8;if(/(pengertian|yang dimaksud|dimaksud dengan|disebut|istilah)/.test(b.nq)&&b.nq.includes(frasa))s+=4;
      if(kunci.length>1&&(b.np.includes(frasa)||b.nd.includes(frasa)))s+=10;if(/pasal|undang|perma|sema|khi|khes|hir|rbg|kuhperdata|kepmen|kma/.test(b.nd))s+=1;
      r.push({b,s});});
    r.sort((x,y)=>y.s-x.s||x.b.np.length-y.b.np.length);return {ks:kunci,r};}

  let tampilH=0,hasilH=[];
  function kartuHukum({e},ks){const dn=HK.docs[e.d],pj=e.t.length>900;
    const tag=e.s==='x'?'<span class="cariist-tag x">Tidak berlaku (dihapus/dibatalkan)</span>':e.s.startsWith('u:')?'<span class="cariist-tag u">Bunyi setelah diubah '+esc(e.s.slice(2))+'</span>':dn.n.startsWith('Rumusan Hukum Kamar')?'<span class="cariist-tag u" title="'+esc(dn.s)+'">Rumusan SEMA</span>':'<span class="cariist-tag ok" title="'+esc(dn.s)+'">Berlaku</span>';
    return '<article class="cariist-it hk"><p class="cariist-h"><b>'+tandai(e.l,ks)+'</b> '+tag+'</p><p class="cariist-p'+(pj?' pj':'')+'">'+tandai(e.t,ks)+'</p>'+
      (pj?'<button type="button" class="cariist-full">Baca selengkapnya</button>':'')+'<p class="cariist-q">'+esc(dn.n)+'</p></article>';}
  function gambar(){const ks=hasil.ks||[],r=hasil.r||[],kh=hasil.kh||ks;
    if(!kataTerakhir){out.innerHTML='';return;}
    let h='';
    h+='<p class="cariist-sec">Hukum positif'+(hasilH.length?' · '+hasilH.length+' cocok':'')+'</p>';
    h+=HK?(hasilH.length?hasilH.slice(0,tampilH).map(x=>kartuHukum(x,kh)).join('')+(hasilH.length>tampilH?'<button type="button" class="cariist-lagi" data-k="h">Tampilkan '+Math.min(4,hasilH.length-tampilH)+' pasal lagi</button>':''):'<p class="cariist-nol">Tidak ada pasal atau rumusan yang memuat "'+esc(kataTerakhir)+'" di peraturan yang sudah tersedia.</p>')
      :'<p class="cariist-nol">Teks peraturan belum bisa dimuat. Periksa koneksi lalu tekan Search lagi.</p>';
    h+='<p class="cariist-sec">Dari pembahasan bank soal'+(r.length?' · '+r.length+' cocok':'')+'</p>';
    h+=r.length?r.slice(0,tampil).map(({b})=>'<article class="cariist-it"><p class="cariist-p">'+tandai(b.q.p||'—',ks)+'</p>'+
      (b.q.d?'<p class="cariist-d"><b>Dasar hukum:</b> '+tandai(b.q.d,ks)+'</p>':'')+
      '<p class="cariist-q">Dari soal: '+tandai(String(b.q.q||'').slice(0,140)+(String(b.q.q||'').length>140?'…':''),ks)+'</p></article>').join('')+
      (r.length>tampil?'<button type="button" class="cariist-lagi" data-k="b">Tampilkan '+Math.min(5,r.length-tampil)+' lagi</button>':'')
      :'<p class="cariist-nol">Belum ada pembahasan di bank soal yang memuat "'+esc(kataTerakhir)+'".</p>';
    out.innerHTML=h;
    out.querySelectorAll('.cariist-lagi').forEach(l=>l.onclick=()=>{if(l.dataset.k==='h')tampilH+=4;else tampil+=5;gambar();});
    out.querySelectorAll('.cariist-full').forEach(b=>b.onclick=()=>{b.previousElementSibling.classList.remove('pj');b.remove();});}

  async function jalan(){const t=inp.value.trim();kataTerakhir=t;if(t.length<2){hasil={};hasilH=[];gambar();return;}
    if(!bank||!HK){out.innerHTML='<p class="cariist-ket">Memuat teks peraturan dan bank soal…</p>';await Promise.all([siapkan(),siapkanHukum()]);if(inp.value.trim()!==t)return;}
    hasil=cari(t);tampil=3;hasilH=cariHukum(t);tampilH=4;
    const nq=norm(t);let kh=hasil.ks.slice();ALIAS.forEach(([re])=>{kh=kh.filter(k=>!re.test(k));});hasil.kh=kh.filter(k=>k!=='pasal');gambar();}
  inp.addEventListener('input',()=>{clearTimeout(tKetik);tKetik=setTimeout(jalan,260);});
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(tKetik);jalan();inp.blur&&matchMedia('(pointer:coarse)').matches&&inp.blur();}if(e.key==='Escape'){inp.value='';jalan();}});
  node.querySelector('.cariist-go').onclick=()=>{clearTimeout(tKetik);jalan();};

  // Halaman yang memakai: tempatkan elemen .cariist-slot, kotak cari dipindah ke sana (tetap satu elemen agar isian tidak hilang).
  function tempel(root){const s=(root||document).querySelector('.cariist-slot');if(s&&s!==node)s.replaceWith(node);}
  new MutationObserver(()=>{if(document.querySelector('.cariist-slot'))tempel();}).observe(document.documentElement,{childList:true,subtree:true});
  window.IstilahCari={node,tempel,sumber(f){ambil=f;bank=null;muat=null;}};
})();

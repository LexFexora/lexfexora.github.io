// Cari istilah di kolom Explanation: mencari di pembahasan dan dasar hukum seluruh bank soal,
// lalu menampilkan penjelasannya beserta dasar hukum persis seperti tertulis di bank (tidak dikarang).
(function(){
  'use strict';
  let ambil=null,bank=null,muat=null,hasil=[],tampil=0,tKetik=null,kataTerakhir='';
  const STOP=new Set('yang dan di ke dari dalam adalah apa apakah itu ini untuk dengan pada atau oleh sebagai bagi tentang serta jika bila maka tidak juga akan dapat sudah telah para suatu sebuah tersebut menurut berdasarkan arti maksud pengertian dimaksud kalau kalo boleh bolehkah ga gak nggak ngga enggak tak bisa bisakah gimana bagaimana bagaimanakah kenapa mengapa kapan berapa siapa dimana mana kah dong sih ya yah deh kok lah nya saja aja harus apabila ketika saat agar supaya tolong mohon jelaskan sebutkan maksudnya artinya hukumnya kah pak bu saya aku kita kami mau ingin'.split(' '));
  const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/['’‘`ʼ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  // Ejaan yang berbeda untuk istilah yang sama (bank soal dan peraturan tidak selalu seragam).
  const VAR=[['hadhanah','hadanah','hadlanah','hadonah'],['itsbat','isbat','istbat','itsbath'],['syiqaq','syiqoq','syiqak'],['nusyuz','nusyus'],['madliyah','madhiyah','madiyah'],
    ['iddah','idah','waktu tunggu'],['talak','talaq','thalaq'],['khuluk','khulu'],['wakaf','waqaf'],['rujuk','ruju'],['mutah','muta'],['hibah','hibbah'],['shadaqah','sedekah','sadaqah'],['infaq','infak'],['syariah','syariah','syari'],['radhaah','radaah','rodhoah'],['usia','umur'],['istri','isteri'],['ijab','ijaab'],['nafkah','nafaqah']];
  // Kalimat bebas: cukup sebagian besar kata kunci yang cocok (1–2 kata: semua; lebih: 60%), lalu diurutkan menurut relevansi.
  const perlu=n=>n<=2?n:Math.ceil(n*.6);
  const alt=k=>VAR.find(g=>g.includes(k))||[k];const ada=(t,k)=>alt(k).some(a=>t.includes(a));
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tandai=(t,ks)=>{let h=esc(t);[].concat(...ks.map(alt)).forEach(k=>{if(k.length<2)return;h=h.replace(new RegExp('('+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>');});return h;};

  const st=document.createElement('style');st.textContent='.cariist{display:flex;flex-direction:column;gap:8px;margin:2px 0 4px}\n.cariist-in{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:9px 12px 9px 34px;border:1px solid color-mix(in srgb,var(--brass,#a8843c) 30%,var(--line,#ccc));border-radius:10px;color:var(--ink,#111);\n  background:var(--bg,#fff) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2.2\' stroke-linecap=\'round\'%3E%3Ccircle cx=\'11\' cy=\'11\' r=\'7\'/%3E%3Cpath d=\'m20 20-3.5-3.5\'/%3E%3C/svg%3E") no-repeat 11px center/16px;outline:none}\n.cariist-in:focus{border-color:color-mix(in srgb,var(--brass,#a8843c) 65%,var(--line,#ccc))}\n@media (hover:none) and (pointer:coarse){.cariist-in{font-size:16px}}\n.cariist-out{display:flex;flex-direction:column;gap:8px;max-height:min(55vh,460px);overflow:auto;overscroll-behavior:contain}.cariist-out:empty{display:none}\n.cariist-ket,.cariist-nol{margin:0;font-size:12px;color:var(--muted,#777)}\n.cariist-it{padding:9px 11px;border:1px solid color-mix(in srgb,var(--brass,#a8843c) 22%,var(--line,#ddd));border-radius:10px;background:color-mix(in srgb,var(--brass,#a8843c) 5%,transparent)}\n.cariist-it p{margin:0;font-size:13.5px;line-height:1.55;text-align:left}.cariist-it p+p{margin-top:6px}\n.cariist-d{color:var(--ink,#111)}.cariist-d b{color:var(--brass,#a8843c);font-weight:650}\n.cariist-q{font-size:12px!important;color:var(--muted,#777)}\n.cariist mark{background:color-mix(in srgb,var(--brass,#d4a83c) 35%,transparent);color:inherit;border-radius:3px;padding:0 1px}\n.cariist-row{display:flex;flex-wrap:wrap;gap:6px}.cariist-row .cariist-in{flex:1 1 220px;min-width:0}.cariist-ai{flex:none;font:inherit;font-size:13.5px;font-weight:650;padding:9px 14px;border-radius:10px;border:1px solid color-mix(in srgb,var(--ink,#111) 25%,var(--line,#ccc));background:var(--ink,#111);color:var(--surface,#fff);cursor:pointer}.cariist-ai:disabled{opacity:.55;cursor:wait}.cariist-aiout:empty{display:none}.cariist-it.ai{border-left:3px solid var(--ink,#111)}.cariist-aitext p{margin:0 0 6px;font-size:13.5px;line-height:1.6;text-align:left}.cariist-q a{color:inherit}.cariist-go{flex:none;font:inherit;font-size:13.5px;font-weight:650;padding:0 14px;border-radius:10px;border:1px solid color-mix(in srgb,var(--brass,#a8843c) 55%,var(--line,#ccc));background:linear-gradient(180deg,color-mix(in srgb,var(--brass,#a8843c) 22%,var(--surface,#fff)),color-mix(in srgb,var(--brass,#a8843c) 10%,var(--surface,#fff)));color:var(--ink,#111);cursor:pointer}.cariist-sec{margin:4px 0 0;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--brass,#a8843c)}.cariist-h{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.cariist-h b{font-weight:700}.cariist-kut{margin:2px 0 0;padding:6px 10px;border-left:3px solid var(--brass,#a8843c);background:color-mix(in srgb,var(--brass,#a8843c) 8%,transparent);border-radius:0 8px 8px 0;font-size:13px;line-height:1.5}\n.cariist-hit{background:color-mix(in srgb,var(--brass,#a8843c) 16%,transparent);border-radius:4px;padding:0 2px}\n.cariist-hf{display:inline-block;min-width:1.4em;padding-left:1em;font-weight:600}\n.cariist-pt{display:flex;flex-direction:column;gap:2px}\n.cariist-cek{display:flex;flex-direction:column;gap:4px;margin-top:6px;padding-top:6px;border-top:1px dashed var(--line,#ccc)}\n.cariist-cekit{margin:0;font-size:12.5px}\n.cariist-cekit summary{cursor:pointer}\n.cariist-cekit.ok b{color:var(--ok,#17733f)}\n.cariist-cekit.x b,.cariist-cekit.x summary{color:var(--bad,#b3261e)}\n.cariist-cekit.q b{color:var(--brass,#a8843c)}\n.cariist-tag{font-size:10.5px;font-weight:650;padding:1px 7px;border-radius:999px;border:1px solid currentColor;white-space:nowrap}.cariist-tag.ok{color:var(--ok,#17733f)}.cariist-tag.u{color:var(--brass,#a8843c)}.cariist-tag.x{color:var(--bad,#b3261e)}.cariist-p.pj{display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical;overflow:hidden}.cariist-full{font:inherit;font-size:12px;padding:0;border:0;background:none;color:var(--brass,#a8843c);cursor:pointer;margin-top:4px}.cariist-it.hk{border-left:3px solid color-mix(in srgb,var(--brass,#a8843c) 60%,transparent)}.cariist-web{display:flex;flex-wrap:wrap;gap:6px}.cariist-web a{font-size:12.5px;padding:5px 10px;border-radius:999px;border:1px solid color-mix(in srgb,var(--brass,#a8843c) 45%,var(--line,#ccc));color:var(--ink,#111);text-decoration:none;background:color-mix(in srgb,var(--brass,#a8843c) 7%,transparent)}.cariist-web a:hover{border-color:var(--brass,#a8843c)}.cariist-lagi{align-self:center;font:inherit;font-size:12.5px;padding:5px 12px;border:1px solid var(--line,#ccc);border-radius:999px;background:transparent;color:var(--ink,#111);cursor:pointer}';document.head.appendChild(st);
  const node=document.createElement('div');node.className='cariist';
  node.innerHTML='<div class="cariist-row"><input type="search" class="cariist-in" placeholder="Cari istilah, asas, atau pasal (mis. hadhanah, pasal 49 uu pa)…" autocomplete="off" enterkeyhint="search" aria-label="Cari istilah atau dasar hukum">'+
    '<button type="button" class="cariist-go">Search</button><button type="button" class="cariist-ai" title="Asisten AI menelusuri hukum positif dan menjawab pertanyaan Anda">✦ Tanya AI</button></div><div class="cariist-aiout" aria-live="polite"></div><div class="cariist-out" aria-live="polite"></div>';
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
  // Frasa utuh dari pertanyaan (2–4 kata berurutan, boleh memuat kata sambung): "pihak yang berkepentingan".
  function frasa(q){const w=q.split(' ').filter(Boolean),out=[];for(let n=4;n>=2;n--)for(let i=0;i+n<=w.length;i++){const f=w.slice(i,i+n);
      if(STOP.has(f[0])||STOP.has(f[n-1]))continue;if(f.filter(k=>!STOP.has(k)).length<2)continue;out.push(f.join(' '));}return out;}
  // ctx (opsional): soal yang sedang tampil. Pasal yang dirujuk soal dan pasal yang memuat kata-kata soal diutamakan.
  function cariHukum(teks,ctx){if(!HK)return [];let q=norm(teks),dok=null;
    ALIAS.forEach(([re,ds])=>{if(re.test(q)){dok=(dok||[]).concat(ds);q=q.replace(re,' ');}});
    const pm=q.match(/\bpasal (\d+[a-z]?)\b/);let no=null;if(pm){no=pm[1];q=q.replace(pm[0],' ');}
    const ks=q.split(' ').filter(k=>k&&!STOP.has(k)&&k!=='ayat'&&k!=='huruf'),fr=ks.join(' ');
    if(!ks.length&&!no)return [];const r=[],fs=frasa(q);
    HK.e.forEach(e=>{if(dok&&!dok.includes(e.d))return;let s=0;
      if(no){if(e.nl!=='pasal '+no)return;s+=100;}
      if(ks.length){const m=ks.filter(k=>ada(e.nt,k)).length;if(m<perlu(ks.length))return;s+=m*6;
        ks.forEach(k=>{if(!ada(e.nt,k))return;if(new RegExp('(^| )'+k+'( |$)').test(e.nt))s+=3;else s+=1;if(e.nl.includes(k))s+=4;});
        if(ks.length>1&&e.nt.includes(fr))s+=12;if(new RegExp('(^| )'+fr+' (adalah|ialah|yaitu|merupakan)').test(e.nt))s+=10;}
      fs.forEach(f=>{if((' '+e.nt+' ').includes(' '+f+' '))s+=4*f.split(' ').length;});
      if(ctx){if(ctx.kut.has(e))s+=25;let m2=0;ctx.ks.forEach(k=>{if((' '+e.nt+' ').includes(' '+k+' '))m2++;});s+=Math.min(14,m2*1.5);}
      if(e.s==='x')s-=5;s-=Math.min(4,e.t.length/1500);r.push({e,s});});
    r.sort((a,b)=>b.s-a.s);return r;}

  function cari(teks){const semua=norm(teks).split(' ').filter(Boolean),ks=semua.filter(k=>!STOP.has(k));const kunci=ks.length?ks:semua;
    if(!kunci.length||norm(teks).length<2)return {ks:[],r:[]};const frasa=norm(teks);
    const r=[];(bank||[]).forEach(b=>{let s=0;const gab=b.np+' '+b.nd+' '+b.nq;const m=kunci.filter(k=>ada(gab,k)).length;if(m<perlu(kunci.length))return;s+=m*6;
      kunci.forEach(k=>{if(ada(b.np,k))s+=3;if(ada(b.nd,k))s+=2;if(ada(b.nq,k))s+=1;
        if(new RegExp('(^| )'+k+'( |$)').test(b.np+' '+b.nd))s+=2;});
      // Utamakan kalimat definisi ("X adalah ...") dan soal yang menanyakan pengertian.
      if(new RegExp('(^| )'+frasa+' (adalah|merupakan|yaitu|ialah|berarti)').test(b.np+' '+b.nd))s+=8;if(/(pengertian|yang dimaksud|dimaksud dengan|disebut|istilah)/.test(b.nq)&&b.nq.includes(frasa))s+=4;
      if(kunci.length>1&&(b.np.includes(frasa)||b.nd.includes(frasa)))s+=10;if(/pasal|undang|perma|sema|khi|khes|hir|rbg|kuhperdata|kepmen|kma/.test(b.nd))s+=1;
      r.push({b,s});});
    r.sort((x,y)=>y.s-x.s||x.b.np.length-y.b.np.length);return {ks:kunci,r};}

  // Pecah bunyi pasal menjadi ayat dan huruf. Penanda harus berurutan ((1),(1a),(2)…; a.,b.,c.…) dan bukan rujukan "ayat (1)"/"huruf a".
  function bagian(t){const out=[],ay=[],idx=[],re=/(?:^|\s)\((\d+[a-z]?)\)\s/g;let m,kunci=-1;const nilai=n=>parseInt(n)*100+(/[a-z]$/.test(n)?n.slice(-1).charCodeAt(0)-96:0);
    while((m=re.exec(t))){if(/ayat\s*$/i.test(t.slice(Math.max(0,m.index-6),m.index+1)))continue;const v=nilai(m[1]);if(v<=kunci)continue;kunci=v;idx.push({no:m[1],i:m.index,j:m.index+m[0].length});}
    if(!idx.length||idx[0].i>3)ay.push({ay:null,t:idx.length?t.slice(0,idx[0].i):t});
    idx.forEach((x,k)=>ay.push({ay:x.no,t:t.slice(x.j,k+1<idx.length?idx[k+1].i:t.length)}));
    ay.forEach(a=>{const hs=[],rh=/(^|[\s:;])([a-z])\.\s/g;let h,mau=97;
      while((h=rh.exec(a.t))){if(h[2].charCodeAt(0)!==mau||/huruf\s*$/i.test(a.t.slice(Math.max(0,h.index-6),h.index+1)))continue;hs.push({hf:h[2],i:h.index+h[1].length,j:h.index+h[0].length});mau++;}
      if(hs.length<2){out.push({ay:a.ay,hf:null,t:a.t.trim()});return;}
      out.push({ay:a.ay,hf:null,t:a.t.slice(0,hs[0].i).trim(),kepala:1});
      hs.forEach((x,k)=>out.push({ay:a.ay,hf:x.hf,t:a.t.slice(x.j,k+1<hs.length?hs[k+1].i:a.t.length).trim()}));});
    return out;}
  function segs(e){if(!e.sg){const b=bagian(e.t),kep={};b.forEach(x=>{if(!x.hf)kep[x.ay]=x.t;});e.sg=b.map(x=>({...x,nt:' '+norm((x.hf?kep[x.ay]||'':'')+' '+x.t)+' '}));}return e.sg;}
  const labelSeg=x=>x?[x.ay?'ayat ('+x.ay+')':'',x.hf?'huruf '+x.hf:''].filter(Boolean).join(' '):'';
  // Ayat/huruf tempat kata kunci paling banyak muncul; null bila pasal tidak beruas atau hasilnya seri.
  function lokasi(e,ks){const sg=segs(e);if(sg.length<2||!ks.length)return null;let a=null,s1=0,s2=0;
    sg.forEach(x=>{const m=ks.filter(k=>alt(k).some(v=>x.nt.includes(' '+v))).length;if(m>s1){s2=s1;s1=m;a=x;}else if(m>s2)s2=m;});
    return a&&s1>s2?a:null;}
  // Dasar hukum bank yang menyebut peraturan terindeks tanpa nomor pasal: cari ayat/huruf yang bunyinya paling sesuai dengan soal dan kunci jawabannya.
  // Hanya ditampilkan bila kecocokannya kuat; selain itu tidak ada yang ditebak.
  // Peraturan yang dirujuk = sebutan peraturan PERTAMA setelah posisi itu (agar "Pasal 44 PP 9/1975 tentang Pelaksanaan UU 1/1974" tidak terbaca sebagai UU Perkawinan).
  // Undang-undang perubahan dihitung sebagai undang-undang induknya karena indeks memuat bunyi setelah diubah.
  const NOMOR={'7 1989':0,'3 2006':0,'50 2009':0,'14 1985':1,'5 2004':1,'3 2009':1,'1 1974':2,'16 2019':2};
  const SEBUT=/\b(?:(?:undang undang|uu|peraturan pemerintah(?: pengganti undang undang)?|perppu|pp|peraturan mahkamah agung|perma|peraturan menteri [a-z]+|peraturan [a-z]+|keputusan [a-z ]{0,40}?|instruksi presiden|inpres|surat edaran [a-z ]{0,30}?|sema)(?: republik indonesia)? (?:nomor|no) ([0-9]+[a-z]?)(?: [a-z]+)* tahun ([0-9]{4})|(kompilasi hukum islam)|(kitab undang undang hukum perdata|burgerlijk wetboek|kuh ?perdata)|(047 kma skb|kode etik dan pedoman perilaku hakim)|(kompilasi hukum ekonomi syariah|khes|herzien|hir|rbg|rechtsreglement|reglement|rv|kitab undang undang hukum acara|kuhap|kuhp))\b/;
  function dokDi(nb,dari){const m=SEBUT.exec(nb.slice(dari||0));if(!m)return -1;if(m[3])return 3;if(m[4])return 4;if(m[5])return 5;if(m[6])return -1;
    const k=m[1]+' '+m[2];return k in NOMOR?NOMOR[k]:-1;}
  const ADAPASAL=/\b(pasal|butir|angka \d)/;
  const UMUM=new Set('hakim pengadilan agama perkara undang nomor tahun pihak hukum orang dapat harus wajib tepat jawaban karena sebagaimana diubah'.split(' '));
  function kunciSoal(b){const jw=norm((b.q.o||[])[b.q.a]),w=(b.nq+' '+jw).split(' ');
    const ks=[...new Set(w.filter(k=>(k.length>3||/^\d+$/.test(k))&&!STOP.has(k)&&!UMUM.has(k)))];
    const fr=new Set();for(let i=0;i<w.length-1;i++)if(!STOP.has(w[i])&&!STOP.has(w[i+1]))fr.add(w[i]+' '+w[i+1]);return {ks,fr};}
  const nilaiRuas=(x,{ks,fr})=>{let m=0,f=0;ks.forEach(k=>{if(x.nt.includes(' '+k+' '))m++;});fr.forEach(z=>{if(x.nt.includes(' '+z+' '))f++;});return {m,f,sc:m+f*1.5};};
  // Bank menyebut "Pasal N" tanpa ayat/huruf: tunjukkan ayat/huruf yang jelas paling sesuai dengan soal (pasal dan peraturannya tetap dari bank).
  // Syarat ketat: kunci jawaban harus memuat kata yang ada di ruas itu, dan ruas itu jelas unggul dari ruas lain.
  function rincian(b){const out=[],k=kunciSoal(b),jw=norm((b.q.o||[])[b.q.a]).split(' ').filter(w=>(w.length>3||/^\d+$/.test(w))&&!STOP.has(w)&&!UMUM.has(w)&&w!=='pasal'&&!/^(khi|ayat|huruf)$/.test(w));
    if(!jw.length)return null;
    String(b.q.d||'').split(';').forEach(bg=>{const nb=norm(bg),re=/\bpasal (\d+[a-z]?)\b(?! (ayat|huruf|angka))/g;let m;
      while((m=re.exec(nb))){const dk=dokDi(nb,m.index+m[0].length);if(dk<0)continue;const e=HK.e.find(z=>z.d===dk&&z.nl==='pasal '+m[1]);if(!e||e.s==='x')continue;
        const sg=segs(e);if(sg.length<2)continue;const r=sg.map(x=>({x,...nilaiRuas(x,k),j:jw.filter(w=>x.nt.includes(' '+w+' ')).length})).sort((p,q)=>q.sc-p.sc);
        if(r[0].m>=2&&r[0].j>=Math.max(1,Math.ceil(jw.length*.5))&&!r[0].x.kepala&&r[0].sc-r[1].sc>=2.5&&r[0].j>=r[1].j)out.push({e,x:r[0].x,rinci:1});}});
    return out.length?{a:out}:null;}
  function pasalTerkait(b){if(b.pt!==undefined)return b.pt;b.pt=null;if(!HK)return null;if(ADAPASAL.test(b.nd))return b.pt=rincian(b);
    // SEMA pleno yang dikutip tanpa butir: dicocokkan hanya ke rumusan Kamar Agama dari SEMA bernomor sama.
    const ds=[...new Set(String(b.q.d||'').split(';').map(bg=>dokDi(norm(bg))).filter(i=>i>=0))],sema=[];
    b.nd.replace(/surat edaran mahkamah agung (?:nomor|no) (\d+) tahun (\d{4})/g,(_,n,t)=>{sema.push('sema no '+n+' tahun '+t+' ');});
    const pakai=e=>ds.includes(e.d)||(e.d===6&&sema.some(x=>(e.nl+' ').includes(x)));
    const tak=()=>{const m=SEBUT.exec(b.nd);if(m&&(m[1]||m[6]))b.pt={tak:1,sema:sema.length>0};return b.pt;};
    if(!ds.length&&!sema.length)return tak();
    const k=kunciSoal(b),ks=k.ks;if(ks.length<3)return tak();
    const r=[];HK.e.forEach(e=>{if(!pakai(e)||e.s==='x')return;segs(e).forEach(x=>r.push({e,x,...nilaiRuas(x,k)}));});
    r.sort((p,q)=>q.sc-p.sc);const kuat=y=>y&&y.m>=Math.max(3,Math.ceil(ks.length*.35))&&y.f>=2;const t=r[0];if(!kuat(t))return tak();
    const r2=r.find(y=>y.e!==t.e);if(r2&&t.sc-r2.sc<1.5&&!(kuat(r2)&&t.sc-r2.sc<=3))return tak();
    b.pt={a:[t].concat(r2&&kuat(r2)&&t.sc-r2.sc<=3?[r2]:[])};return b.pt;}
  function htmlPasalTerkait(b){const pt=pasalTerkait(b);if(!pt)return '';
    if(pt.tak)return '<p class="cariist-ket">'+(pt.sema?'Bank soal belum mencantumkan butir rumusannya, dan tidak ada rumusan Kamar Agama di indeks situs yang cocok dengan pasti, jadi butirnya tidak ditampilkan agar tidak menebak.':'Bank soal belum mencantumkan nomor pasal untuk dasar hukum ini, dan tidak ada pasal di indeks situs yang cocok dengan pasti, jadi pasalnya tidak ditampilkan agar tidak menebak.')+'</p>';
    return pt.a.map(({e,x,rinci})=>'<div class="cariist-pt"><p class="cariist-d"><b>'+(rinci?'Ayat/huruf yang relevan':e.d===6?'Rumusan SEMA yang cocok':e.d===5?'Butir KEPPH yang cocok':'Pasal di naskah resmi')+':</b> '+esc(e.l+(labelSeg(x)?' '+labelSeg(x):''))+' '+esc(HK.docs[e.d].n)+
      ' <span class="cariist-tag u" title="Dicocokkan otomatis antara soal dan bunyi pasal. Periksa bunyinya.">dicocokkan otomatis</span></p><p class="cariist-kut">'+esc(x.hf?(segs(e).find(z=>z.ay===x.ay&&!z.hf)||{t:''}).t+' … '+x.hf+'. '+x.t:x.t)+'</p></div>').join('');}
  // Bunyi pasal disusun per ayat dan huruf; ruas yang paling cocok dengan pencarian diberi latar.
  function bunyi(e,ks,hit){const sg=segs(e);if(sg.length<2)return tandai(e.t,ks);let h='',ayLalu;
    sg.forEach((x,i)=>{const isi=tandai(x.t,ks);let pre='';
      if(x.ay!==ayLalu){if(i)pre='<br>';if(x.ay)pre+='('+esc(x.ay)+') ';ayLalu=x.ay;}
      if(x.hf)pre='<br><span class="cariist-hf">'+x.hf+'.</span> ';
      h+=pre+(x===hit?'<span class="cariist-hit">'+isi+'</span>':isi)+' ';});
    return h;}

  // Salah ketik dan imbuhan: kata yang tidak dikenal diganti kata terdekat dari kosakata peraturan dan bank soal ("dasadr" → "dasar", "hukumnya" → "hukum").
  let KAMUS=null;
  function kamus(){if(KAMUS&&KAMUS.hk===!!HK&&KAMUS.bk===!!bank)return KAMUS.m;const m=new Map(),tambah=t=>String(t).split(' ').forEach(w=>{if(w.length>=3&&!/^\d+$/.test(w))m.set(w,(m.get(w)||0)+1);});
    if(HK)HK.e.forEach(e=>tambah(e.nt));(bank||[]).forEach(b=>{tambah(b.np);tambah(b.nd);tambah(b.nq);});KAMUS={m,hk:!!HK,bk:!!bank};return m;}
  function jarak(a,b,maks){if(Math.abs(a.length-b.length)>maks)return maks+1;let p=Array.from({length:b.length+1},(_,j)=>j),pp=null;
    for(let i=1;i<=a.length;i++){const c=[i];let min=i;for(let j=1;j<=b.length;j++){let v=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));
        if(pp&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,pp[j-2]+1);c[j]=v;if(v<min)min=v;}if(min>maks)return maks+1;pp=p;p=c;}
    return p[b.length];}
  function perbaiki(teks){const m=kamus();let ubah=false;
    const w=norm(teks).split(' ').filter(Boolean).map(k=>{if(k.length<4||/\d/.test(k)||STOP.has(k)||m.has(k)||alt(k).some(a=>m.has(a)))return k;
      for(const sf of ['nya','kah','lah','pun','ku','mu']){const r=k.slice(0,-sf.length);if(k.endsWith(sf)&&r.length>=3&&(m.has(r)||STOP.has(r))){ubah=true;return r;}}
      const maks=k.length<=5?1:2;let best=null,bj=maks+1,bf=0;
      m.forEach((f,x)=>{if(Math.abs(x.length-k.length)>maks)return;const j=jarak(k,x,maks);if(j<bj||(j===bj&&f>bf)){best=x;bj=j;bf=f;}});
      if(best&&bj<=maks){ubah=true;return best;}return k;});
    return {teks:w.join(' '),ubah};}

  // Pertanyaan tentang soal yang sedang tampil ("dasar hukumnya apa", "kenapa jawabannya B", "jelaskan").
  const NIAT=/\b(dasar|dasar hukum|landasan|sumber|pasal berapa|pasalnya|aturan|aturannya|kenapa|mengapa|jelaskan|jelasin|penjelasan|pembahasan|bahas|maksud|maksudnya|jawaban|jawabannya|kunci|alasan|alasannya|kok|benar|salah|soal ini|soalnya)\b/;
  const KATANIAT=new Set('dasar hukum landasan sumber pasal berapa aturan kenapa mengapa jelaskan jelasin penjelasan pembahasan bahas maksud jawaban kunci alasan kok benar salah soal opsi pilihan bisa tolong mohon dong sih ya'.split(' '));
  function soalAktif(){try{const q=window.__soalKini&&window.__soalKini();return q&&q.q?q:null;}catch(e){return null;}}
  function tanyaSoal(t,q){if(!q||!NIAT.test(t))return false;const sisa=t.split(' ').filter(k=>k&&!STOP.has(k)&&!KATANIAT.has(k)&&!KATANIAT.has(k.replace(/(nya|kah|lah)$/,''))&&!/^[a-e]$/.test(k));
    if(!sisa.length)return true;const isi=norm(q.q+' '+(q.o||[]).join(' ')+' '+q.p+' '+q.d);return sisa.every(k=>isi.includes(k));}
  // Pasal yang disebut di dasar hukum soal (beserta ayat/hurufnya bila disebut) → bunyi resminya dari indeks.
  function kutipan(d){const out=[];String(d||'').split(';').forEach(bg=>{const nb=norm(bg),re=/\bpasal (\d+[a-z]?)(?: ayat (\d+[a-z]?))?(?: huruf ([a-z]))?\b/g;let m;
      while((m=re.exec(nb))){const dk=dokDi(nb,m.index+m[0].length);if(dk<0)continue;const e=HK.e.find(z=>z.d===dk&&z.nl==='pasal '+m[1]);if(!e||out.some(o=>o.e===e&&o.ay==m[2]&&o.hf==m[3]))continue;
        const x=(m[2]||m[3])?segs(e).find(z=>(!m[2]||z.ay===m[2])&&(m[3]?z.hf===m[3]:!z.hf)):null;out.push({e,x,ay:m[2],hf:m[3]});}});
    return out;}
  function kartuSoal(q){const huruf='ABCDE',jw=(q.o||[])[q.a],b={q,np:norm(q.p),nd:norm(q.d),nq:norm(q.q+' '+(jw||''))};
    const kt=HK?kutipan(q.d):[];
    let h='<article class="cariist-it soal"><p class="cariist-sec">Tentang soal ini</p>';
    if(jw!=null)h+='<p class="cariist-d"><b>Jawaban:</b> '+(typeof q.a==='number'?huruf[q.a]+'. ':'')+esc(jw)+'</p>';
    if(q.p)h+='<p class="cariist-p"><b class="cariist-lbl">Alasannya:</b> '+esc(q.p)+'</p>';
    if(q.d)h+='<p class="cariist-d"><b>Dasar hukum:</b> '+esc(q.d)+'</p>';
    kt.forEach(({e,x})=>{const lb=labelSeg(x);h+='<div class="cariist-pt"><p class="cariist-d"><b>Bunyi '+esc(e.l+(lb?' '+lb:''))+'</b> '+esc(HK.docs[e.d].n)+'</p>'+
      (x?'<p class="cariist-kut">'+esc(x.t)+'</p>':'')+'<p class="cariist-p'+(e.t.length>700?' pj':'')+'">'+bunyi(e,[],x)+'</p>'+(e.t.length>700?'<button type="button" class="cariist-full">Baca selengkapnya</button>':'')+'</div>';});
    if(!kt.length)h+=htmlPasalTerkait(b);
    if(!q.d&&!kt.length)h+='<p class="cariist-ket">Soal ini belum mencantumkan dasar hukum.</p>';
    return h+'</article>';}

  function konteksSoal(q){if(!q||!HK)return null;const jw=norm((q.o||[])[q.a]),w=norm(q.q+' '+jw+' '+q.p).split(' ');
    return {kut:new Set(kutipan(q.d).map(k=>k.e)),ks:[...new Set(w.filter(k=>k.length>3&&!STOP.has(k)&&!UMUM.has(k)))]};}
  // Kartu "Jawaban": ayat/huruf yang paling menjawab pertanyaan, dikutip apa adanya dari naskah (bukan dikarang), lalu penjelasan bank soal yang paling cocok.
  function kartuJawab(tq,ctx){if(!hasilH.length&&!(hasil.r||[]).length)return '';const q=norm(tq),ks=q.split(' ').filter(k=>k&&!STOP.has(k)&&!KATANIAT.has(k)),fs=frasa(q);if(!ks.length)return '';
    // Dicari per ayat/huruf di seluruh naskah (bukan hanya pasal teratas): ruas pendek yang memuat semua kata kunci, frasa utuh, atau definisi ("X adalah") diutamakan.
    const atas=new Map(hasilH.slice(0,10).map(({e},i)=>[e,10-i]));let best=null;
    HK.e.forEach(e=>{if(!atas.has(e)&&!ks.every(k=>ada(e.nt,k)))return;const sg=segs(e),kep={};sg.forEach(x=>{if(!x.hf)kep[x.ay]=x;});
      sg.forEach(x=>{const nt=' '+norm(x.t)+' ',nk=x.nt;let sc=(atas.get(e)||0)*1.2;const m=ks.filter(k=>alt(k).some(a=>nk.includes(' '+a))).length;if(!m)return;sc+=m*4+(m===ks.length?6:0);
        let df=0;ks.forEach(k=>{if(alt(k).some(a=>new RegExp(' '+a+' (adalah|ialah|yaitu|merupakan) ').test(nt))){sc+=10;df=1;}});sc-=Math.min(5,x.t.length/250);
        fs.forEach(f=>{if(nk.includes(' '+f+' '))sc+=5*f.split(' ').length;});ks.forEach(k=>{if(nt.includes(' '+k))sc+=1;});
        if(ctx){if(ctx.kut.has(e))sc+=10;ctx.ks.forEach(k=>{if(nk.includes(' '+k+' '))sc+=.8;});}
        if(!best||sc>best.sc)best={e,x,sc,m,df,kep:x.hf?kep[x.ay]:null,daftar:x.kepala?sg.filter(z=>z.ay===x.ay&&z.hf):null};});});
    let b=((hasil.r||[])[0]||{}).b;const definisi=/\b(apa itu|apakah itu|pengertian|yang dimaksud|dimaksud dengan|arti|artinya|definisi|maksud)\b/.test(q);
    const bdef=definisi&&(hasil.r||[]).slice(0,40).map(r=>r.b).find(z=>ks.some(k=>alt(k).some(a=>new RegExp('(^| )'+a+' (adalah|ialah|yaitu|merupakan|berarti) ').test(z.np))));if(bdef)b=bdef;
    // Pertanyaan definisi tanpa rumusan "X adalah" di naskah terindeks, atau naskah tidak memuat semua kata kunci: pembahasan bank soal yang paling cocok dipakai sebagai jawaban.
    if(b&&b.q.p&&(!best||(definisi&&!best.df)||best.m<ks.length)&&ks.every(k=>ada(b.np+' '+b.nd,k)))
      return '<article class="cariist-it jawab"><p class="cariist-sec">Jawaban</p><p class="cariist-kut">'+tandai(b.q.p,ks)+'</p>'+(b.q.d?'<p class="cariist-d"><b>Dasar:</b> '+esc(b.q.d)+'</p>':'')+htmlPasalTerkait(b)+
        '<p class="cariist-ket">Diambil dari pembahasan bank soal yang paling sesuai. Untuk jawaban yang dirumuskan, gunakan ✦ Tanya AI.</p></article>';
    if(!best||best.m<Math.min(2,ks.length))return '';const {e,x,kep,daftar}=best,lb=labelSeg(x);
    return '<article class="cariist-it jawab"><p class="cariist-sec">Jawaban</p>'+
      '<p class="cariist-kut">'+(kep?tandai(kep.t,ks)+' … ':'')+(x.hf?'<b>'+x.hf+'.</b> ':'')+tandai(x.t,ks)+(daftar&&daftar.length?daftar.map(z=>'<br><span class="cariist-hf">'+z.hf+'.</span> '+tandai(z.t,ks)).join(''):'')+'</p>'+
      '<p class="cariist-d"><b>Dasar:</b> '+esc(e.l+(lb?' '+lb:''))+' '+esc(HK.docs[e.d].n)+(e.s==='x'?' <span class="cariist-tag x">Tidak berlaku</span>':'')+'</p>'+
      (b&&b.q.p&&ks.every(k=>ada(b.np,k))?'<p class="cariist-p"><b class="cariist-lbl">Penjelasan bank soal:</b> '+tandai(b.q.p,ks)+'</p>':'')+
      '<p class="cariist-ket">Kutipan bunyi peraturan yang paling sesuai dengan pertanyaan Anda. Untuk jawaban yang dirumuskan, gunakan ✦ Tanya AI.</p></article>';}

  let tampilH=0,hasilH=[];
  function kartuHukum({e},ks){const dn=HK.docs[e.d],pj=e.t.length>900,hit=lokasi(e,ks),lb=labelSeg(hit);
    const tag=e.s==='x'?'<span class="cariist-tag x">Tidak berlaku (dihapus/dibatalkan)</span>':e.s.startsWith('u:')?'<span class="cariist-tag u">Bunyi setelah diubah '+esc(e.s.slice(2))+'</span>':dn.n.startsWith('Rumusan Hukum Kamar')?'<span class="cariist-tag u" title="'+esc(dn.s)+'">Rumusan SEMA</span>':'<span class="cariist-tag ok" title="'+esc(dn.s)+'">Berlaku</span>';
    return '<article class="cariist-it hk"><p class="cariist-h"><b>'+tandai(e.l,ks)+(lb?' '+lb:'')+'</b> '+tag+'</p>'+(pj&&hit?'<p class="cariist-kut">'+tandai(hit.t,ks)+'</p>':'')+'<p class="cariist-p'+(pj?' pj':'')+'">'+bunyi(e,ks,hit)+'</p>'+
      (pj?'<button type="button" class="cariist-full">Baca selengkapnya</button>':'')+'<p class="cariist-q">'+esc(dn.n)+'</p></article>';}
  function gambar(){const ks=hasil.ks||[],r=hasil.r||[],kh=hasil.kh||ks;
    if(!kataTerakhir){out.innerHTML='';return;}
    let h=(hasil.koreksi?'<p class="cariist-ket">Menampilkan hasil untuk <b>'+esc(hasil.koreksi)+'</b></p>':'')+(hasil.soal||'')+(hasil.jawab||'');
    if(!hasil.murni){h+='<p class="cariist-sec">Hukum positif'+(hasilH.length?' · '+hasilH.length+' cocok':'')+'</p>';
    h+=HK?(hasilH.length?hasilH.slice(0,tampilH).map(x=>kartuHukum(x,kh)).join('')+(hasilH.length>tampilH?'<button type="button" class="cariist-lagi" data-k="h">Tampilkan '+Math.min(4,hasilH.length-tampilH)+' pasal lagi</button>':''):'<p class="cariist-nol">Tidak ada pasal atau rumusan yang memuat "'+esc(kataTerakhir)+'" di peraturan yang sudah tersedia.</p>')
      :'<p class="cariist-nol">Teks peraturan belum bisa dimuat. Periksa koneksi lalu tekan Search lagi.</p>';
    h+='<p class="cariist-sec">Dari pembahasan bank soal'+(r.length?' · '+r.length+' cocok':'')+'</p>';
    h+=r.length?r.slice(0,tampil).map(({b})=>'<article class="cariist-it"><p class="cariist-p">'+tandai(b.q.p||'—',ks)+'</p>'+
      (b.q.d?'<p class="cariist-d"><b>Dasar hukum:</b> '+tandai(b.q.d,ks)+'</p>':'')+htmlPasalTerkait(b)+
      '<p class="cariist-q">Dari soal: '+tandai(String(b.q.q||'').slice(0,140)+(String(b.q.q||'').length>140?'…':''),ks)+'</p></article>').join('')+
      (r.length>tampil?'<button type="button" class="cariist-lagi" data-k="b">Tampilkan '+Math.min(5,r.length-tampil)+' lagi</button>':'')
      :'<p class="cariist-nol">Belum ada pembahasan di bank soal yang memuat "'+esc(kataTerakhir)+'".</p>';}
    // Penelusuran lanjutan di situs resmi (membuka tab baru): kata tanya dibuang agar hasilnya tepat sasaran.
    const kw=(hasil.ks&&hasil.ks.length?hasil.ks.join(' '):kataTerakhir),g=x=>'https://www.google.com/search?q='+encodeURIComponent(kw+' '+x);
    const L=[['Semua situs hukum resmi',g('(site:peraturan.go.id OR site:jdih.mahkamahagung.go.id OR site:peraturan.bpk.go.id OR site:badilag.mahkamahagung.go.id OR site:mahkamahagung.go.id)')],
      ['JDIH Mahkamah Agung',g('site:jdih.mahkamahagung.go.id')],['Peraturan BPK',g('site:peraturan.bpk.go.id')],['peraturan.go.id',g('site:peraturan.go.id')],
      ['Badilag',g('site:badilag.mahkamahagung.go.id')],['Putusan MA','https://putusan3.mahkamahagung.go.id/search.html?q='+encodeURIComponent(kw)]];
    const web='<p class="cariist-sec">Telusuri sumber resmi di internet</p><div class="cariist-web">'+L.map(([t,u])=>'<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(t)+' ↗</a>').join('')+'</div>';
    h=(!hasilH.length&&!r.length&&!hasil.soal?web+h:h+web);
    out.innerHTML=h;
    out.querySelectorAll('.cariist-lagi').forEach(l=>l.onclick=()=>{if(l.dataset.k==='h')tampilH+=4;else tampil+=5;gambar();});
    out.querySelectorAll('.cariist-full').forEach(b=>b.onclick=()=>{b.previousElementSibling.classList.remove('pj');b.remove();});}

  async function jalan(){const t=inp.value.trim();kataTerakhir=t;if(t.length<2){hasil={};hasilH=[];gambar();return;}
    if(!bank||!HK){out.innerHTML='<p class="cariist-ket">Memuat teks peraturan dan bank soal…</p>';await Promise.all([siapkan(),siapkanHukum()]);if(inp.value.trim()!==t)return;}
    const pb=perbaiki(t),tq=pb.teks,q=soalAktif();
    const ctx=konteksSoal(q);hasil=cari(tq);tampil=2;hasilH=cariHukum(tq,ctx);tampilH=2;hasil.koreksi=pb.ubah?tq:'';hasil.soal=tanyaSoal(tq,q)?kartuSoal(q):'';
    // Pertanyaan tentang soal: hasil pencarian umum dibatasi agar jawaban soal tetap paling atas.
    if(hasil.soal&&!tq.split(' ').some(k=>k&&!STOP.has(k)&&!KATANIAT.has(k)&&!KATANIAT.has(k.replace(/(nya|kah|lah)$/,'')))){hasil.r=[];hasilH=[];hasil.murni=1;}
    hasil.jawab=hasil.murni?'':kartuJawab(tq,ctx);
    const nq=norm(t);let kh=hasil.ks.slice();ALIAS.forEach(([re])=>{kh=kh.filter(k=>!re.test(k));});hasil.kh=kh.filter(k=>k!=='pasal');gambar();}
  inp.addEventListener('input',()=>{clearTimeout(tKetik);tKetik=setTimeout(jalan,260);if(!aiJalan&&!aiOut.querySelector('.cariist-aitext'))aiOut.innerHTML='';});
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(tKetik);jalan();inp.blur&&matchMedia('(pointer:coarse)').matches&&inp.blur();}if(e.key==='Escape'){inp.value='';jalan();}});
  // Asisten AI (fungsi Edge Supabase "tanya-hukum"): pasal terkait dari indeks dikirim sebagai pijakan, kunci API tetap di server.
  const aiOut=node.querySelector('.cariist-aiout'),aiBtn=node.querySelector('.cariist-ai');let aiJalan=false;
  const rapi=t=>esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').split(/\n{2,}/).map(p=>'<p>'+p.replace(/\n/g,'<br>')+'</p>').join('');
  async function tanyaAI(){const t=inp.value.trim();if(t.length<3){aiOut.innerHTML='<p class="cariist-nol">Tulis pertanyaan Anda dulu di kolom cari.</p>';inp.focus();return;}
    if(aiJalan)return;const sb=window.__sb;if(!sb||!sb.functions){aiOut.innerHTML='<p class="cariist-nol">Asisten AI belum tersedia di halaman ini.</p>';return;}
    aiJalan=true;aiBtn.disabled=true;aiOut.innerHTML='<div class="cariist-it ai"><p class="cariist-sec">Jawaban asisten AI</p><p class="cariist-ket">Asisten sedang menelusuri peraturan yang berlaku… (biasanya 20–60 detik)</p></div>';
    try{await Promise.all([siapkan(),siapkanHukum()]);const tq=perbaiki(t).teks,sq=soalAktif();
      // Pijakan: pasal yang dirujuk soal aktif lebih dulu, lalu pasal hasil pencarian atas pertanyaan.
      const pj=(sq?kutipan(sq.d).map(k=>k.e):[]).concat(cariHukum(tq).slice(0,8).map(r=>r.e)).filter((e,i,a)=>a.indexOf(e)===i).slice(0,8);
      const kh=pj.map(e=>({l:e.l,n:HK.docs[e.d].n+(e.s==='x'?' [TIDAK BERLAKU]':e.s.startsWith('u:')?' [bunyi setelah diubah '+e.s.slice(2)+']':''),t:e.t}));
      const jw=sq&&(sq.o||[])[sq.a];
      const {data,error}=await sb.functions.invoke('tanya-hukum',{body:{q:t,konteks:kh,soal:sq?{q:sq.q+((sq.o||[]).length?'\nPilihan: '+sq.o.map((o,i)=>'ABCDE'[i]+'. '+o).join(' | '):''),p:sq.p,d:sq.d,jw:jw!=null?(typeof sq.a==='number'?'ABCDE'[sq.a]+'. ':'')+jw:''}:null}});
      if(error){let m='';try{const j=await error.context.json();m=j.error||'';}catch(e){}
        const st=error.context&&error.context.status;if(st===404||!st){await belumPasang();return;}throw new Error(m||'Asisten AI tidak dapat dihubungi.');}
      aiOut.innerHTML='<div class="cariist-it ai"><p class="cariist-sec">Jawaban asisten AI</p><div class="cariist-aitext">'+rapi(data.jawab||'')+'</div>'+htmlPeriksa(data.jawab||'')+
        ((data.sumber||[]).length?'<p class="cariist-q">Sumber web resmi: '+data.sumber.map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title||s.url)+'</a>').join(' · ')+'</p>':'')+
        '<p class="cariist-q">Jawaban AI dapat keliru. Cocokkan dengan bunyi pasal di bawah atau sumber resmi.'+(data.sisa!=null?' Sisa jatah hari ini: '+data.sisa+'.':'')+'</p></div>';
    }catch(e){aiOut.innerHTML='<div class="cariist-it ai"><p class="cariist-sec">Jawaban asisten AI</p><p class="cariist-nol">'+esc(e.message||String(e))+'</p></div>';}
    finally{aiJalan=false;aiBtn.disabled=false;}}
  // Pemeriksaan otomatis jawaban AI: setiap pasal yang disebut dan setiap kutipan dicocokkan ke naskah resmi di indeks situs.
  const SINGKAT=[[/\b(khi|kompilasi hukum islam)\b/,3],[/\b(uu ?pa|uu peradilan agama|undang undang peradilan agama)\b/,0],[/\b(uu ?ma|uu mahkamah agung)\b/,1],[/\b(uup|uu perkawinan|undang undang perkawinan)\b/,2],[/\b(kuhperdata|kuh perdata|bw)\b/,4]];
  function periksaAI(t){const hasilP=[],sudah=new Set(),re=/Pasal\s+(\d+[A-Z]?)(?:\s+ayat\s*\((\d+[a-z]?)\))?(?:\s+huruf\s+([a-z])\b)?((?:(?!Pasal\s)[^;\n]){0,170})/g;let m;
    while((m=re.exec(t))){const ekor=norm(m[4]);let dk=dokDi(ekor);if(dk<0){const a=SINGKAT.find(([r])=>r.test(ekor.slice(0,60)));dk=a?a[1]:-1;}
      const lb='Pasal '+m[1]+(m[2]?' ayat ('+m[2]+')':'')+(m[3]?' huruf '+m[3]:''),kunci=lb+'|'+dk;if(sudah.has(kunci))continue;sudah.add(kunci);
      if(dk<0){const nb=SEBUT.exec(ekor);if(nb&&(nb[1]||nb[6]))hasilP.push({lb:lb+' '+m[4].replace(/^[\s,:]+/,'').split(/,|\(| dan | serta |\.\s+(?=[A-Z"“])/)[0].slice(0,70).trim().replace(/\.$/,''),st:'?',ket:'peraturannya belum ada di indeks situs, cek di sumber resmi'});continue;}
      const e=HK.e.find(z=>z.d===dk&&z.nl==='pasal '+m[1].toLowerCase());
      if(!e){hasilP.push({lb:lb+' '+HK.docs[dk].n,st:'x',ket:'pasal ini tidak ditemukan di naskah resmi'});continue;}
      const x=(m[2]||m[3])?segs(e).find(z=>(!m[2]||z.ay===m[2])&&(m[3]?z.hf===m[3]:true)):null;
      if((m[2]||m[3])&&!x){hasilP.push({lb:lb+' '+HK.docs[dk].n,st:'x',ket:'ayat/huruf ini tidak ada pada pasal tersebut di naskah resmi',e});continue;}
      hasilP.push({lb:lb+' '+HK.docs[dk].n,st:e.s==='x'?'x':'ok',ket:e.s==='x'?'ketentuan ini sudah tidak berlaku':'ada di naskah resmi',e,x});}
    // Kutipan langsung (≥ 6 kata) harus muncul persis di naskah terindeks.
    const kut=[];(t.match(/[“"]([^”"]{30,600})[”"]/g)||[]).forEach(q=>{const nq=norm(q);if(nq.split(' ').length<6)return;
      const e=HK.e.find(z=>z.nt.includes(nq));kut.push({q:q.slice(1,-1),e});});
    return {p:hasilP,k:kut};}
  function htmlPeriksa(t){const r=periksaAI(t);if(!r.p.length&&!r.k.length)return '';const ik={ok:'✓',x:'✕','?':'?'};
    return '<div class="cariist-cek"><p class="cariist-sec">Pemeriksaan otomatis terhadap naskah resmi</p>'+
      r.p.map(c=>'<details class="cariist-cekit '+(c.st==='ok'?'ok':c.st==='x'?'x':'q')+'"><summary><b>'+ik[c.st]+'</b> '+esc(c.lb)+': '+esc(c.ket)+'</summary>'+
        (c.e?'<p class="cariist-kut">'+esc(c.x?(c.x.hf?(segs(c.e).find(z=>z.ay===c.x.ay&&!z.hf)||{t:''}).t+' … '+c.x.hf+'. ':'')+c.x.t:c.e.t.slice(0,1200))+'</p>':'')+'</details>').join('')+
      r.k.map(k=>'<p class="cariist-cekit '+(k.e?'ok':'q')+'"><b>'+(k.e?'✓':'?')+'</b> Kutipan “'+esc(k.q.slice(0,90))+(k.q.length>90?'…':'')+'” '+(k.e?'cocok dengan bunyi '+esc(k.e.l)+' '+esc(HK.docs[k.e.d].n):'tidak ditemukan persis di naskah terindeks, cek di sumber resmi')+'</p>').join('')+'</div>';}

  // Fungsi AI belum dipasang: jawaban lokal (Tentang soal ini + pasal) tetap tampil di bawah; pemilik diberi langkah pemasangannya.
  async function belumPasang(){let pemilik=!!window.__isOwner||document.body.classList.contains('bebas');
    if(!pemilik&&window.__sb&&window.__sb.rpc){try{const {data}=await window.__sb.rpc('cat_is_owner');pemilik=data===true;}catch(e){}}
    aiOut.innerHTML='<div class="cariist-it ai"><p class="cariist-sec">Asisten AI belum aktif</p><p class="cariist-ket">'+
      (pemilik?'Fungsi AI belum dipasang di Supabase. Tiga langkahnya (rinciannya di CARA-PASANG.md): 1) buat API key di console.anthropic.com, 2) jalankan ai-jatah.sql di SQL Editor, 3) simpan ANTHROPIC_API_KEY di Edge Function Secrets lalu deploy fungsi tanya-hukum.':
        'Asisten AI belum diaktifkan oleh admin.')+' Sementara itu, jawaban dari soal ini dan naskah peraturan ditampilkan di bawah.</p></div>';}
  aiBtn.onclick=()=>{tanyaAI();if(inp.value.trim().length>=2&&kataTerakhir!==inp.value.trim()){clearTimeout(tKetik);jalan();}};
  node.querySelector('.cariist-go').onclick=()=>{clearTimeout(tKetik);jalan();};

  // Halaman yang memakai: tempatkan elemen .cariist-slot, kotak cari dipindah ke sana (tetap satu elemen agar isian tidak hilang).
  function tempel(root){const s=(root||document).querySelector('.cariist-slot');if(s&&s!==node)s.replaceWith(node);}
  new MutationObserver(()=>{if(document.querySelector('.cariist-slot'))tempel();}).observe(document.documentElement,{childList:true,subtree:true});
  window.IstilahCari={node,tempel,sumber(f){ambil=f;bank=null;muat=null;}};
})();

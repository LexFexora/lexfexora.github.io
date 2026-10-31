// Edit soal khusus pemilik, dibuka dari tombol ✎ di kartu akun. Suntingan disimpan di dokumen bank/edit dan dikunci:
// selalu menang atas isi bank yang diunggah ulang dan atas perbaikan otomatis bank soal (termasuk aturan isi pertanyaan).
(function(){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const L='ABCDEFGH';
  const st=document.createElement('style');st.textContent=`
.eds-bg{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px 16px;overflow:auto}
.eds{text-align:left;width:min(680px,100%);background:var(--surface,#fff);color:var(--ink,#111);border:1px solid var(--line,#ddd);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.25);padding:16px;display:flex;flex-direction:column;gap:10px;font-size:14px}
.eds h3{margin:0;font-size:17px;display:flex;align-items:center;gap:8px}.eds h3 .x{margin-left:auto;background:none;border:0;font-size:22px;line-height:1;cursor:pointer;color:inherit;padding:2px 6px}
.eds label{font-weight:600;font-size:12px;color:var(--muted,#777)}
.eds textarea,.eds input[type=search]{font:inherit;font-size:14px;padding:8px 10px;border:1px solid var(--line,#ccc);border-radius:8px;background:var(--bg,#fff);color:inherit;width:100%;box-sizing:border-box;resize:vertical}
.eds .eo{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;align-items:start}
.eds .eo .pk{display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 8px;border:1px solid var(--line,#ccc);border-radius:8px;cursor:pointer;font-weight:700;color:inherit;font-size:14px;user-select:none}
.eds .eo .pk input{width:18px;height:18px;margin:0;accent-color:var(--ok,#17733f);cursor:pointer}
.eds .eo .pk small{display:none;font-size:11px;font-weight:700;color:var(--ok,#17733f)}
.eds .eo:has(input:checked) .pk{border-color:var(--ok,#17733f);background:color-mix(in srgb,var(--ok,#17733f) 14%,transparent)}.eds .eo:has(input:checked) .pk small{display:inline}
.eds .eo:has(input:checked) textarea{border-color:var(--ok,#17733f);box-shadow:0 0 0 1px var(--ok,#17733f)}
.eds .row{display:flex;gap:8px;flex-wrap:wrap}.eds .note{margin:0;font-size:12px;color:var(--muted,#777)}
.eds .kunci{text-align:left;margin:0;font-size:12px;padding:6px 10px;border-radius:8px;background:color-mix(in srgb,var(--brass,#a8843c) 12%,transparent);border-left:3px solid var(--brass,#a8843c)}
.eds-list{display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow:auto}
.eds-it{text-align:left;font:inherit;font-size:13.5px;padding:8px 10px;border:1px solid var(--line,#ddd);border-radius:8px;background:var(--bg,#fff);color:inherit;cursor:pointer}
.eds-it:hover{border-color:var(--brass,#a8843c)}.eds-it small{display:block;color:var(--muted,#777);font-size:11.5px;margin-top:2px}
.eds-it.kini{border-color:var(--brass,#a8843c);border-width:2px}`;
  document.head.appendChild(st);
  let bg=null;
  function tutup(){if(bg){bg.remove();bg=null;document.removeEventListener('keydown',esc_);}}
  function esc_(e){if(e.key==='Escape')tutup();}
  function wadah(h){tutup();bg=document.createElement('div');bg.className='eds-bg';bg.innerHTML='<div class="eds" role="dialog" aria-modal="true">'+h+'</div>';
    bg.addEventListener('click',e=>{if(e.target===bg)tutup();});document.body.appendChild(bg);document.addEventListener('keydown',esc_);
    bg.querySelector('.x').onclick=tutup;return bg.querySelector('.eds');}

  // Formulir satu soal. simpan(rec) mengembalikan Promise; rec = {q,o,a,p,d,kunci:true,t}.
  function buka(q,simpan,opsi){opsi=opsi||{};
    const el=wadah('<h3>✎ Edit soal '+esc(q.id)+(opsi.terkunci?' <span title="Sudah pernah diedit pemilik">🔒</span>':'')+'<button class="x" type="button" aria-label="Tutup">×</button></h3>'+
      (opsi.kembali?'<button type="button" class="eds-it" data-k>← Kembali ke daftar soal</button>':'')+
      '<label for="eds-q">Teks soal</label><textarea id="eds-q" rows="3">'+esc(q.q)+'</textarea><label>Pilihan jawaban: klik huruf untuk menjadikannya jawaban benar (hijau = jawaban benar)</label>'+
      q.o.map((o,i)=>'<div class="eo"><label class="pk"><input type="radio" name="eds-a" value="'+i+'" aria-label="Jadikan '+L[i]+' jawaban benar"'+(i===q.a?' checked':'')+'>'+L[i]+' <small>Benar</small></label><textarea data-o="'+i+'" rows="2">'+esc(o)+'</textarea></div>').join('')+
      '<label for="eds-p">Pembahasan</label><textarea id="eds-p" rows="4">'+esc(q.p)+'</textarea><label for="eds-d">Sumber</label><textarea id="eds-d" rows="2">'+esc(q.d)+'</textarea>'+
      '<p class="kunci">🔒 Suntingan Anda dikunci: isinya dipakai apa adanya dan tidak ditimpa unggahan ulang bank soal maupun perbaikan otomatis, termasuk aturan "dasar hukum tidak boleh di teks soal". Soal lain yang tidak Anda edit tetap mengikuti aturan itu.</p>'+
      (opsi.ket?'<p class="note">'+esc(opsi.ket)+'</p>':'')+
      '<div class="row"><button class="btn primary" id="eds-ok" type="button">Simpan</button><button class="btn" id="eds-no" type="button">Batal</button></div><p class="note" id="eds-msg"></p>');
    el.querySelector('#eds-no').onclick=tutup;if(opsi.kembali)el.querySelector('[data-k]').onclick=opsi.kembali;
    el.querySelector('#eds-q').focus();
    el.querySelector('#eds-ok').onclick=()=>{const o=q.o.map((_,i)=>el.querySelector('textarea[data-o="'+i+'"]').value.trim()),ch=el.querySelector('input[name=eds-a]:checked');
      const rec={q:el.querySelector('#eds-q').value.trim(),o,a:ch?+ch.value:q.a,p:el.querySelector('#eds-p').value.trim(),d:el.querySelector('#eds-d').value.trim(),kunci:true,t:Date.now()};
      const m=el.querySelector('#eds-msg');if(!rec.q||o.some(x=>!x)){m.textContent='Teks soal dan semua pilihan wajib diisi.';return;}
      const b=el.querySelector('#eds-ok');b.disabled=true;m.textContent='Menyimpan…';
      Promise.resolve().then(()=>simpan(rec,q)).then(()=>{tutup();if(opsi.selesai)opsi.selesai(q.id);}).catch(e=>{b.disabled=false;m.textContent='Gagal menyimpan: '+(e&&(e.code||e.message)||e);try{console.error(e);}catch(_){}});};}

  // Cari soal (ID, teks soal, pilihan, pembahasan, sumber), lalu buka formulirnya. kini = soal yang sedang tampil (ditaruh paling atas).
  function cari(o){const daftar=()=>o.ambil()||[],ed=o.terkunci||(()=>false);
    const el=wadah('<h3>✎ Edit soal<button class="x" type="button" aria-label="Tutup">×</button></h3><input type="search" placeholder="Cari nomor ID (mis. Q1558) atau kata di soal…" aria-label="Cari soal"><p class="note">Hanya Anda yang melihat menu ini.</p><div class="eds-list"></div>');
    const inp=el.querySelector('input'),lst=el.querySelector('.eds-list');
    const item=(q,kini)=>'<button type="button" class="eds-it'+(kini?' kini':'')+'" data-id="'+esc(q.id)+'">'+(kini?'<b>Soal yang sedang tampil</b><br>':'')+esc(String(q.q).slice(0,160))+'<small>'+esc(q.id)+(ed(q.id)?' · 🔒 sudah diedit':'')+'</small></button>';
    function isi(){const t=norm(inp.value),k=t.split(' ').filter(Boolean),kini=o.kini&&o.kini();let r;
      if(!k.length)r=[];else{const id=inp.value.trim().toUpperCase();r=daftar().filter(q=>q.id===id||(k.every(w=>norm(q.id+' '+q.q+' '+q.o.join(' ')+' '+q.p+' '+q.d).includes(w)))).slice(0,30);}
      lst.innerHTML=(kini&&!r.includes(kini)?item(kini,true):'')+r.map(q=>item(q,q===kini)).join('')+(k.length&&!r.length?'<p class="note">Tidak ada soal yang cocok.</p>':'')+(!k.length&&!kini?'<p class="note">Ketik untuk mencari soal.</p>':'');
      lst.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{const q=daftar().find(x=>x.id===b.dataset.id)||(kini&&kini.id===b.dataset.id?kini:null);if(!q)return;
        const kata=inp.value;buka(q,o.simpan,{terkunci:ed(q.id),ket:o.ket,selesai:o.selesai,kembali:()=>{cari(o);const i2=bg.querySelector('input');i2.value=kata;i2.dispatchEvent(new Event('input'));}});});}
    inp.addEventListener('input',isi);isi();inp.focus();}
  window.EditSoal={buka,cari,tutup};
})();

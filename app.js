(() => {
  const cfg = window.APP_CONFIG;
  const form = document.getElementById("rsvpForm");
  const nameEl = document.getElementById("name");
  const unitEl = document.getElementById("unit");
  const statusEl = document.getElementById("status");
  const suggestions = document.getElementById("suggestions");
  const submitBtn = document.getElementById("submitBtn");
  const successPanel = document.getElementById("successPanel");
  const closedNotice = document.getElementById("closedNotice");
  const toast = document.getElementById("toast");

  let timer = null;
  let localInvitees = [];

  function esc(v=""){
    return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function showToast(msg,type="ok"){
    toast.textContent=msg;
    toast.className=`toast show ${type==="error"?"error":""}`;
    clearTimeout(showToast.t);
    showToast.t=setTimeout(()=>toast.className="toast",3500);
  }

  function setLoading(on){
    submitBtn.disabled=on;
    submitBtn.querySelector(".btn-text").textContent=on?"Menghantar...":"Hantar Maklum Balas";
    submitBtn.querySelector(".spinner").classList.toggle("hidden",!on);
  }

  function scriptReady(){
    return cfg.googleScriptUrl && !cfg.googleScriptUrl.includes("PASTE_GOOGLE");
  }

  function checkClosed(){
    const closed=Date.now()>new Date(cfg.rsvpClose).getTime();
    if(closed){
      closedNotice.classList.remove("hidden");
      [...form.elements].forEach(el=>el.disabled=true);
    }
    return closed;
  }
  checkClosed();

  function jsonp(params, timeoutMs=12000){
    return new Promise((resolve,reject)=>{
      if(!scriptReady()) return reject(new Error("Google Apps Script belum disambungkan."));

      const cb="jsonp_"+Date.now()+"_"+Math.random().toString(36).slice(2);
      const script=document.createElement("script");
      const timer=setTimeout(()=>{
        cleanup();
        reject(new Error("Tiada respons daripada Google Sheet."));
      },timeoutMs);

      function cleanup(){
        clearTimeout(timer);
        delete window[cb];
        if(script.parentNode) script.parentNode.removeChild(script);
      }

      window[cb]=(data)=>{
        cleanup();
        resolve(data);
      };

      const url=new URL(cfg.googleScriptUrl);
      Object.entries({...params,callback:cb,t:Date.now()}).forEach(([k,v])=>{
        url.searchParams.set(k,String(v??""));
      });

      script.src=url.toString();
      script.onerror=()=>{
        cleanup();
        reject(new Error("Gagal berhubung dengan Google Apps Script."));
      };

      document.head.appendChild(script);
    });
  }

  async function loadMasterlist(){
    try{
      const res=await fetch(`masterlist_pegawai_jpbd_selangor.csv?v=${Date.now()}`,{cache:"no-store"});
      if(!res.ok) throw new Error("Masterlist gagal dimuatkan.");

      const text=(await res.text()).replace(/^\uFEFF/,"");
      const lines=text.split(/\r?\n/).filter(Boolean);

      localInvitees=lines.slice(1).map(line=>{
        const p=line.split(",");
        return {
          name:(p[0]||"").trim(),
          bahagian:(p.slice(1).join(",")||"").trim()
        };
      }).filter(x=>x.name);
    }catch(err){
      showToast("Senarai nama tidak dapat dimuatkan.","error");
    }
  }
  loadMasterlist();

  document.querySelectorAll(".status-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".status-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      statusEl.value=btn.dataset.status;
    });
  });

  function renderSuggestions(rows){
    if(!rows.length){
      suggestions.innerHTML=`<div class="suggestion no-result"><strong>Tiada nama dijumpai</strong><small>Semak ejaan atau pilihan bahagian.</small></div>`;
      suggestions.classList.remove("hidden");
      return;
    }

    suggestions.innerHTML=rows.map(r=>`
      <div class="suggestion" data-name="${esc(r.name)}" data-bahagian="${esc(r.bahagian)}">
        <strong>${esc(r.name)}</strong>
        <small>${esc(r.bahagian)}</small>
      </div>`).join("");

    suggestions.classList.remove("hidden");

    suggestions.querySelectorAll(".suggestion:not(.no-result)").forEach(item=>{
      item.addEventListener("click",()=>{
        nameEl.value=item.dataset.name;
        unitEl.value=item.dataset.bahagian;
        nameEl.classList.add("name-confirmed");
        suggestions.classList.add("hidden");
      });
    });
  }

  function performSearch(){
    nameEl.classList.remove("name-confirmed");
    const q=nameEl.value.trim().toLowerCase();

    if(q.length<2){
      suggestions.classList.add("hidden");
      suggestions.innerHTML="";
      return;
    }

    const selected=unitEl.value;
    const rows=localInvitees
      .filter(r=>r.name.toLowerCase().includes(q))
      .filter(r=>!selected || r.bahagian===selected)
      .slice(0,12);

    renderSuggestions(rows);
  }

  nameEl.addEventListener("input",()=>{
    clearTimeout(timer);
    timer=setTimeout(performSearch,120);
  });

  nameEl.addEventListener("focus",()=>{
    if(nameEl.value.trim().length>=2) performSearch();
  });

  unitEl.addEventListener("change",()=>{
    if(nameEl.value.trim().length>=2) performSearch();
  });

  document.addEventListener("click",e=>{
    if(!e.target.closest(".autocomplete-wrap")) suggestions.classList.add("hidden");
  });

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    if(checkClosed()) return;

    const name=nameEl.value.trim();
    const bahagian=unitEl.value;
    const status=statusEl.value==="hadir" ? "Hadir" :
                 statusEl.value==="tidak_hadir" ? "Tidak Hadir" : "";

    if(name.length<2) return showToast("Sila masukkan nama penuh.","error");
    if(!bahagian) return showToast("Sila pilih bahagian.","error");
    if(!status) return showToast("Sila pilih Hadir atau Tidak Hadir.","error");
    if(!scriptReady()) return showToast("Google Apps Script belum disambungkan.","error");

    // Pastikan nama benar-benar dari masterlist
    const exact=localInvitees.find(x=>x.name.toLowerCase()===name.toLowerCase());
    if(!exact) return showToast("Sila pilih nama daripada senarai cadangan.","error");

    setLoading(true);
    try{
      const data=await jsonp({
        action:"submit",
        name:exact.name,
        bahagian:exact.bahagian,
        status:status
      });

      if(!data || !data.ok) throw new Error(data?.error||"Gagal menyimpan RSVP.");

      form.classList.add("hidden");
      successPanel.classList.remove("hidden");
      showToast("Maklum balas berjaya direkodkan.");
    }catch(err){
      showToast(err.message||"Gagal menyimpan RSVP. Cuba lagi.","error");
    }finally{
      setLoading(false);
    }
  });

  document.getElementById("editBtn").addEventListener("click",()=>{
    successPanel.classList.add("hidden");
    form.classList.remove("hidden");
  });
})();
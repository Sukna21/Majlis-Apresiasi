(() => {
  const cfg = window.APP_CONFIG;
  const form = document.getElementById("rsvpForm");
  const nameEl = document.getElementById("name");
  const unitEl = document.getElementById("unit");
  const statusEl = document.getElementById("status");
  const inviteeIdEl = document.getElementById("inviteeId");
  const suggestions = document.getElementById("suggestions");
  const submitBtn = document.getElementById("submitBtn");
  const successPanel = document.getElementById("successPanel");
  const closedNotice = document.getElementById("closedNotice");
  const toast = document.getElementById("toast");

  let timer = null;
  let localInvitees = [];

  const headers = {
    "apikey": cfg.supabaseKey,
    "Authorization": `Bearer ${cfg.supabaseKey}`,
    "Content-Type": "application/json"
  };

  function esc(v=""){
    return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function showToast(msg,type="ok"){
    toast.textContent=msg;
    toast.className=`toast show ${type==="error"?"error":""}`;
    clearTimeout(showToast.t);
    showToast.t=setTimeout(()=>toast.className="toast",3000);
  }

  function setLoading(on){
    submitBtn.disabled=on;
    submitBtn.querySelector(".btn-text").textContent=on?"Menghantar...":"Hantar Maklum Balas";
    submitBtn.querySelector(".spinner").classList.toggle("hidden",!on);
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

  // Load the 99-name masterlist directly from this GitHub Pages repo.
  // This makes name suggestions work even if the Supabase lookup is temporarily unavailable.
  async function loadLocalMasterlist(){
    try{
      const res=await fetch(`masterlist_pegawai_jpbd_selangor.csv?v=${Date.now()}`,{cache:"no-store"});
      if(!res.ok) throw new Error("masterlist fetch failed");
      const text=(await res.text()).replace(/^\uFEFF/,"");
      const lines=text.split(/\r?\n/).filter(Boolean);
      localInvitees=lines.slice(1).map((line,idx)=>{
        const parts=line.split(",");
        return {
          id:null,
          name:(parts[0]||"").trim(),
          unit:(parts.slice(1).join(",")||"").trim()
        };
      }).filter(r=>r.name);
    }catch(e){
      localInvitees=[];
    }
  }
  loadLocalMasterlist();

  document.querySelectorAll(".status-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".status-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      statusEl.value=btn.dataset.status;
    });
  });

  async function searchInviteesSupabase(q){
    const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/search_sukna21_invitees`,{
      method:"POST",
      headers,
      body:JSON.stringify({p_q:q})
    });
    if(!res.ok) throw new Error("Supabase lookup failed");
    return await res.json();
  }

  function searchInviteesLocal(q){
    const needle=q.toLowerCase();
    const selectedBahagian=unitEl.value;
    return localInvitees
      .filter(r=>r.name.toLowerCase().includes(needle))
      .filter(r=>!selectedBahagian || r.unit===selectedBahagian)
      .slice(0,12);
  }

  function renderSuggestions(rows){
    if(!rows?.length){
      suggestions.innerHTML=`
        <div class="suggestion no-result">
          <strong>Tiada nama dijumpai</strong>
          <small>Semak ejaan atau pilihan bahagian.</small>
        </div>`;
      suggestions.classList.remove("hidden");
      return;
    }

    suggestions.innerHTML=rows.map(r=>`
      <div class="suggestion"
           data-id="${r.id||""}"
           data-name="${esc(r.name)}"
           data-unit="${esc(r.unit||"")}">
        <strong>${esc(r.name)}</strong>
        <small>${esc(r.unit||"—")}</small>
      </div>`).join("");

    suggestions.classList.remove("hidden");

    suggestions.querySelectorAll(".suggestion:not(.no-result)").forEach(item=>{
      item.addEventListener("click",async()=>{
        inviteeIdEl.value=item.dataset.id||"";
        nameEl.value=item.dataset.name;
        unitEl.value=item.dataset.unit;
        suggestions.classList.add("hidden");
        nameEl.classList.add("name-confirmed");

        // If local CSV result has no DB id, resolve exact name in Supabase in the background.
        if(!inviteeIdEl.value){
          try{
            const rows=await searchInviteesSupabase(item.dataset.name);
            const exact=rows.find(r=>r.name===item.dataset.name && r.unit===item.dataset.unit);
            if(exact) inviteeIdEl.value=exact.id;
          }catch(e){}
        }
      });
    });
  }

  async function performSearch(){
    inviteeIdEl.value="";
    nameEl.classList.remove("name-confirmed");

    const q=nameEl.value.trim();
    if(q.length<2){
      suggestions.classList.add("hidden");
      suggestions.innerHTML="";
      return;
    }

    // Prefer local bundled masterlist.
    let rows=searchInviteesLocal(q);

    if(rows.length){
      renderSuggestions(rows);
      return;
    }

    // Fallback to Supabase if local list is not loaded or no local match.
    try{
      rows=await searchInviteesSupabase(q);
      const selectedBahagian=unitEl.value;
      if(selectedBahagian) rows=rows.filter(r=>r.unit===selectedBahagian);
      renderSuggestions(rows);
    }catch(err){
      suggestions.innerHTML=`
        <div class="suggestion no-result">
          <strong>Senarai nama tidak dapat dimuatkan</strong>
          <small>Refresh halaman dan cuba semula.</small>
        </div>`;
      suggestions.classList.remove("hidden");
    }
  }

  nameEl.addEventListener("input",()=>{
    clearTimeout(timer);
    timer=setTimeout(performSearch,150);
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
    const unit=unitEl.value;
    const status=statusEl.value;

    if(name.length<2) return showToast("Sila masukkan nama penuh.","error");
    if(!unit) return showToast("Sila pilih bahagian.","error");
    if(!["hadir","tidak_hadir"].includes(status)) return showToast("Sila pilih Hadir atau Tidak Hadir.","error");

    setLoading(true);
    try{
      // Resolve invitee id just before submit if user typed/picked a local CSV result.
      if(!inviteeIdEl.value){
        try{
          const rows=await searchInviteesSupabase(name);
          const exact=rows.find(r=>r.name.toLowerCase()===name.toLowerCase() && r.unit===unit);
          if(exact) inviteeIdEl.value=exact.id;
        }catch(e){}
      }

      const payload={
        p_invitee_id:inviteeIdEl.value||null,
        p_name:name,
        p_unit:unit,
        p_phone:"",
        p_status:status,
        p_note:""
      };

      let res=null;
      let data=null;
      let lastError=null;

      for(let attempt=1; attempt<=5; attempt++){
        try{
          res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/submit_sukna21_rsvp`,{
            method:"POST",
            headers,
            body:JSON.stringify(payload),
            cache:"no-store"
          });

          data=await res.json();

          if(res.ok) break;

          const retryable=res.status===503 || data?.code==="PGRST002" || data?.code==="PGRST003";
          if(!retryable) throw new Error(data?.message||data?.error||"Gagal merekodkan RSVP.");

          lastError=new Error("Sambungan pangkalan data sedang sibuk.");
        }catch(err){
          lastError=err;
        }

        if(attempt<5){
          await new Promise(r=>setTimeout(r,1000*attempt));
        }
      }

      if(!res?.ok) throw lastError || new Error("Gagal merekodkan RSVP.");

      form.classList.add("hidden");
      successPanel.classList.remove("hidden");
      showToast("Maklum balas berjaya direkodkan.");
    }catch(err){
      showToast(err.message||"Ralat sambungan. Cuba lagi.","error");
    }finally{
      setLoading(false);
    }
  });

  document.getElementById("editBtn").addEventListener("click",()=>{
    successPanel.classList.add("hidden");
    form.classList.remove("hidden");
    window.scrollTo({top:document.querySelector(".rsvp-panel").offsetTop-20,behavior:"smooth"});
  });
})();
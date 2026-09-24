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
  let lastResults = [];

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

  document.querySelectorAll(".status-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".status-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      statusEl.value=btn.dataset.status;
    });
  });

  async function searchInvitees(q){
    const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/search_sukna21_invitees`,{
      method:"POST",
      headers,
      body:JSON.stringify({p_q:q})
    });
    if(!res.ok){
      throw new Error("Senarai nama tidak dapat dimuatkan.");
    }
    return await res.json();
  }

  function renderSuggestions(rows){
    const selectedBahagian=unitEl.value;
    const filtered=selectedBahagian
      ? rows.filter(r=>r.unit===selectedBahagian)
      : rows;

    lastResults=filtered;

    if(!filtered.length){
      suggestions.innerHTML=`
        <div class="suggestion no-result">
          <strong>Tiada nama dijumpai</strong>
          <small>Semak ejaan atau pilihan bahagian.</small>
        </div>`;
      suggestions.classList.remove("hidden");
      return;
    }

    suggestions.innerHTML=filtered.map(r=>`
      <div class="suggestion"
           data-id="${r.id}"
           data-name="${esc(r.name)}"
           data-unit="${esc(r.unit||"")}">
        <strong>${esc(r.name)}</strong>
        <small>${esc(r.unit||"—")}</small>
      </div>`).join("");

    suggestions.classList.remove("hidden");

    suggestions.querySelectorAll(".suggestion:not(.no-result)").forEach(item=>{
      item.addEventListener("click",()=>{
        inviteeIdEl.value=item.dataset.id;
        nameEl.value=item.dataset.name;
        unitEl.value=item.dataset.unit;
        suggestions.classList.add("hidden");
        nameEl.classList.add("name-confirmed");
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

    try{
      const rows=await searchInvitees(q);
      renderSuggestions(rows);
    }catch(err){
      suggestions.innerHTML=`
        <div class="suggestion no-result">
          <strong>Senarai nama tidak dapat dimuatkan</strong>
          <small>Cuba refresh halaman.</small>
        </div>`;
      suggestions.classList.remove("hidden");
    }
  }

  nameEl.addEventListener("input",()=>{
    clearTimeout(timer);
    timer=setTimeout(performSearch,180);
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
    if(checkClosed())return;

    const name=nameEl.value.trim();
    const unit=unitEl.value;
    const status=statusEl.value;

    if(name.length<2) return showToast("Sila masukkan nama penuh.","error");
    if(!unit) return showToast("Sila pilih bahagian.","error");
    if(!["hadir","tidak_hadir"].includes(status)) return showToast("Sila pilih Hadir atau Tidak Hadir.","error");

    setLoading(true);
    try{
      const payload={
        p_invitee_id:inviteeIdEl.value||null,
        p_name:name,
        p_unit:unit,
        p_phone:"",
        p_status:status,
        p_note:""
      };

      const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/submit_sukna21_rsvp`,{
        method:"POST",
        headers,
        body:JSON.stringify(payload)
      });

      const data=await res.json();
      if(!res.ok) throw new Error(data?.message||data?.error||"Gagal merekodkan RSVP.");

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
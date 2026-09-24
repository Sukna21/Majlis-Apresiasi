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
      method:"POST",headers,body:JSON.stringify({p_q:q})
    });
    if(!res.ok)return [];
    return await res.json();
  }

  function renderSuggestions(rows){
    if(!rows?.length){
      suggestions.classList.add("hidden");
      suggestions.innerHTML="";
      return;
    }
    suggestions.innerHTML=rows.map(r=>`
      <div class="suggestion" data-id="${r.id}" data-name="${esc(r.name)}" data-unit="${esc(r.unit||"")}">
        <strong>${esc(r.name)}</strong>
        <small>${esc(r.unit||"—")}</small>
      </div>`).join("");
    suggestions.classList.remove("hidden");
    suggestions.querySelectorAll(".suggestion").forEach(item=>{
      item.addEventListener("click",()=>{
        inviteeIdEl.value=item.dataset.id;
        nameEl.value=item.dataset.name;
        unitEl.value=item.dataset.unit;
        suggestions.classList.add("hidden");
      });
    });
  }

  nameEl.addEventListener("input",()=>{
    inviteeIdEl.value="";
    clearTimeout(timer);
    const q=nameEl.value.trim();
    if(q.length<2)return renderSuggestions([]);
    timer=setTimeout(async()=>{
      try{renderSuggestions(await searchInvitees(q));}
      catch{renderSuggestions([]);}
    },230);
  });

  document.addEventListener("click",e=>{
    if(!e.target.closest(".autocomplete-wrap"))suggestions.classList.add("hidden");
  });

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    if(checkClosed())return;

    const name=nameEl.value.trim();
    const status=statusEl.value;
    if(name.length<2)return showToast("Sila masukkan nama penuh.","error");
    if(!["hadir","tidak_hadir"].includes(status))return showToast("Sila pilih Hadir atau Tidak Hadir.","error");

    setLoading(true);
    try{
      const payload={
        p_invitee_id:inviteeIdEl.value||null,
        p_name:name,
        p_unit:unitEl.value.trim(),
        p_phone:"",
        p_status:status,
        p_note:""
      };
      const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/submit_sukna21_rsvp`,{
        method:"POST",headers,body:JSON.stringify(payload)
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data?.message||data?.error||"Gagal merekodkan RSVP.");
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
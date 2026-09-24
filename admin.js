(() => {
  if(sessionStorage.getItem("sukna21_admin_login")!=="1"){
    location.replace("urusetia.html");
    return;
  }

  const loginAt=Number(sessionStorage.getItem("sukna21_admin_time")||0);
  if(!loginAt || Date.now()-loginAt>8*60*60*1000){
    sessionStorage.clear();
    location.replace("urusetia.html");
    return;
  }

  const cfg=window.APP_CONFIG;
  const toast=document.getElementById("toast");
  const tableBody=document.getElementById("tableBody");
  const searchBox=document.getElementById("searchBox");
  const filterTabs=document.getElementById("filterTabs");

  let rows=[];
  let invitees=[];
  let responses=[];
  let currentFilter="all";
  let retryTimer=null;

  const headers={
    "apikey":cfg.supabaseKey,
    "Authorization":`Bearer ${cfg.supabaseKey}`,
    "Content-Type":"application/json"
  };

  function showToast(msg,type="ok",ms=3200){
    toast.textContent=msg;
    toast.className=`toast show ${type==="error"?"error":""}`;
    clearTimeout(showToast.t);
    showToast.t=setTimeout(()=>toast.className="toast",ms);
  }

  function esc(v=""){
    return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function statusLabel(s){
    return ({
      hadir:"Hadir",
      tidak_hadir:"Tidak Hadir",
      belum_jawab:"Belum Menjawab"
    })[s]||s;
  }

  function fmtDate(v){
    if(!v)return "—";
    try{
      return new Intl.DateTimeFormat("ms-MY",{dateStyle:"short",timeStyle:"short"}).format(new Date(v));
    }catch{
      return v;
    }
  }

  async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

  async function loadLocalInvitees(){
    const res=await fetch(`masterlist_pegawai_jpbd_selangor.csv?v=${Date.now()}`,{cache:"no-store"});
    if(!res.ok) throw new Error("Masterlist tempatan gagal dimuatkan.");
    const text=(await res.text()).replace(/^\uFEFF/,"");
    const lines=text.split(/\r?\n/).filter(Boolean);

    return lines.slice(1).map((line,idx)=>{
      const p=line.split(",");
      return {
        id:`local-${idx}`,
        name:(p[0]||"").trim(),
        unit:(p.slice(1).join(",")||"").trim()
      };
    }).filter(r=>r.name);
  }

  async function getDashboardDataWithRetry(maxAttempts=6){
    let lastErr=null;

    for(let attempt=1;attempt<=maxAttempts;attempt++){
      try{
        const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/get_sukna21_dashboard`,{
          method:"POST",
          headers,
          body:"{}",
          cache:"no-store"
        });

        if(res.ok) return await res.json();

        const body=await res.text();
        const retryable=res.status===503 || body.includes("PGRST002") || body.includes("PGRST003");
        if(!retryable){
          throw new Error(`Ralat backend (${res.status}).`);
        }

        lastErr=new Error(`Backend sibuk (${res.status}).`);
      }catch(err){
        lastErr=err;
      }

      if(attempt<maxAttempts){
        const delay=Math.min(12000, 1200 * Math.pow(1.7,attempt-1));
        if(attempt===1) showToast("Sambungan Supabase sibuk. Sistem sedang cuba semula…","error",4500);
        await sleep(delay);
      }
    }
    throw lastErr || new Error("Gagal mendapatkan data.");
  }

  function mergeRows(){
    const responseMap=new Map();

    responses.forEach(r=>{
      if(r.invitee_id) responseMap.set(r.invitee_id,r);
      responseMap.set(`${(r.name||"").toLowerCase()}|${r.unit||""}`,r);
    });

    const unmatchedResponses=[...responses];

    const merged=invitees.map(i=>{
      const r=responseMap.get(i.id) || responseMap.get(`${(i.name||"").toLowerCase()}|${i.unit||""}`);
      if(r){
        const pos=unmatchedResponses.findIndex(x=>x.id===r.id);
        if(pos>=0) unmatchedResponses.splice(pos,1);
        return r;
      }
      return {
        id:`pending-${i.id}`,
        invitee_id:i.id,
        name:i.name,
        unit:i.unit,
        status:"belum_jawab",
        updated_at:null
      };
    });

    rows=[...merged,...unmatchedResponses];
  }

  function updateStats(){
    document.getElementById("statTotal").textContent=invitees.length || responses.length;
    document.getElementById("statHadir").textContent=rows.filter(r=>r.status==="hadir").length;
    document.getElementById("statTidak").textContent=rows.filter(r=>r.status==="tidak_hadir").length;
    document.getElementById("statPending").textContent=rows.filter(r=>r.status==="belum_jawab").length;
  }

  async function load(){
    clearTimeout(retryTimer);
    document.getElementById("refreshBtn").disabled=true;

    // 1) Always load local masterlist first so dashboard never misleadingly shows zero invitees.
    try{
      invitees=await loadLocalInvitees();
      responses=[];
      mergeRows();
      updateStats();
      render();
    }catch(e){
      console.warn(e);
    }

    // 2) Then fetch live responses from Supabase with automatic retry.
    try{
      const data=await getDashboardDataWithRetry();
      if(Array.isArray(data?.invitees) && data.invitees.length) invitees=data.invitees;
      responses=Array.isArray(data?.responses)?data.responses:[];
      mergeRows();
      updateStats();
      render();
      showToast("Dashboard berjaya disegerakkan.");
    }catch(err){
      console.error(err);
      // Keep local 99-name masterlist visible instead of resetting to zero.
      updateStats();
      render();
      showToast("Supabase masih sibuk. Paparan masterlist dikekalkan dan sistem akan cuba semula.","error",6000);

      retryTimer=setTimeout(()=>{
        load();
      },15000);
    }finally{
      document.getElementById("refreshBtn").disabled=false;
    }
  }

  function render(){
    const q=searchBox.value.trim().toLowerCase();

    const filtered=rows.filter(r=>{
      const filterOk=currentFilter==="all"||r.status===currentFilter;
      const text=`${r.name||""} ${r.unit||""}`.toLowerCase();
      return filterOk&&(!q||text.includes(q));
    });

    tableBody.innerHTML=filtered.length
      ? filtered.map(r=>`
          <tr>
            <td><strong>${esc(r.name)}</strong></td>
            <td>${esc(r.unit||"—")}</td>
            <td><span class="status-chip ${esc(r.status)}">${esc(statusLabel(r.status))}</span></td>
            <td>${esc(fmtDate(r.updated_at))}</td>
          </tr>`).join("")
      : `<tr><td colspan="4" class="empty-row">Tiada rekod untuk paparan ini.</td></tr>`;

    document.getElementById("rowCount").textContent=`${filtered.length} rekod`;
  }

  filterTabs.addEventListener("click",e=>{
    const btn=e.target.closest(".filter-tab");
    if(!btn)return;

    filterTabs.querySelectorAll(".filter-tab").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    currentFilter=btn.dataset.filter;
    render();
  });

  searchBox.addEventListener("input",render);
  document.getElementById("refreshBtn").addEventListener("click",load);

  document.getElementById("logoutBtn").addEventListener("click",()=>{
    clearTimeout(retryTimer);
    sessionStorage.removeItem("sukna21_admin_login");
    sessionStorage.removeItem("sukna21_admin_time");
    location.replace("urusetia.html");
  });

  document.getElementById("exportBtn").addEventListener("click",()=>{
    const csvRows=[["Nama","Bahagian","Status","Dikemas Kini"]];
    rows.forEach(r=>{
      csvRows.push([
        r.name||"",
        r.unit||"",
        statusLabel(r.status),
        r.updated_at||""
      ]);
    });

    const csv=csvRows
      .map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(","))
      .join("\n");

    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="Kehadiran_Majlis_Apresiasi_SUKNA21.csv";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  });

  load();
})();
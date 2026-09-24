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
  let currentFilter="all";

  const headers={
    "apikey":cfg.supabaseKey,
    "Authorization":`Bearer ${cfg.supabaseKey}`,
    "Content-Type":"application/json"
  };

  function showToast(msg,type="ok"){
    toast.textContent=msg;
    toast.className=`toast show ${type==="error"?"error":""}`;
    clearTimeout(showToast.t);
    showToast.t=setTimeout(()=>toast.className="toast",2600);
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

  async function getDashboardData(){
    const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/get_sukna21_dashboard`,{
      method:"POST",
      headers,
      body:"{}"
    });

    if(!res.ok){
      const text=await res.text();
      throw new Error(`Gagal mendapatkan data (${res.status}). ${text.slice(0,120)}`);
    }

    return await res.json();
  }

  async function load(){
    document.getElementById("refreshBtn").disabled=true;
    tableBody.innerHTML=`<tr><td colspan="4" class="empty-row">Memuatkan data...</td></tr>`;

    try{
      const data=await getDashboardData();
      const invitees=Array.isArray(data?.invitees)?data.invitees:[];
      const responses=Array.isArray(data?.responses)?data.responses:[];

      const respondedIds=new Set(
        responses.filter(r=>r.invitee_id).map(r=>r.invitee_id)
      );

      const unanswered=invitees
        .filter(i=>!respondedIds.has(i.id))
        .map(i=>({
          id:`pending-${i.id}`,
          invitee_id:i.id,
          name:i.name,
          unit:i.unit,
          status:"belum_jawab",
          updated_at:null
        }));

      rows=[...responses,...unanswered];

      document.getElementById("statTotal").textContent=invitees.length;
      document.getElementById("statHadir").textContent=
        responses.filter(r=>r.status==="hadir").length;
      document.getElementById("statTidak").textContent=
        responses.filter(r=>r.status==="tidak_hadir").length;
      document.getElementById("statPending").textContent=unanswered.length;

      render();
    }catch(err){
      console.error(err);
      tableBody.innerHTML=`
        <tr>
          <td colspan="4" class="empty-row">
            ${esc(err.message||"Gagal mendapatkan data.")}
          </td>
        </tr>`;
      showToast("Gagal mendapatkan data. Cuba refresh semula.","error");
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
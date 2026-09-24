(() => {
  if(sessionStorage.getItem("sukna21_admin_login")!=="1"){
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

  function showToast(msg,type="ok"){
    toast.textContent=msg;
    toast.className=`toast show ${type==="error"?"error":""}`;
    clearTimeout(showToast.t);
    showToast.t=setTimeout(()=>toast.className="toast",3500);
  }

  function esc(v=""){
    return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function statusClass(s){
    if(s==="Hadir") return "hadir";
    if(s==="Tidak Hadir") return "tidak_hadir";
    return "belum_jawab";
  }

  function fmtDate(v){
    if(!v)return "—";
    try{return new Intl.DateTimeFormat("ms-MY",{dateStyle:"short",timeStyle:"short"}).format(new Date(v));}
    catch{return v;}
  }

  function scriptReady(){
    return cfg.googleScriptUrl && !cfg.googleScriptUrl.includes("PASTE_GOOGLE");
  }

  function jsonp(params, timeoutMs=15000){
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

  async function load(){
    document.getElementById("refreshBtn").disabled=true;
    tableBody.innerHTML=`<tr><td colspan="4" class="empty-row">Memuatkan data...</td></tr>`;

    try{
      const data=await jsonp({action:"dashboard"});
      if(!data || !data.ok) throw new Error(data?.error||"Gagal mendapatkan data.");

      rows=Array.isArray(data.rows)?data.rows:[];
      document.getElementById("statTotal").textContent=data.counts?.total ?? 0;
      document.getElementById("statHadir").textContent=data.counts?.hadir ?? 0;
      document.getElementById("statTidak").textContent=data.counts?.tidakHadir ?? 0;
      document.getElementById("statPending").textContent=data.counts?.belumMenjawab ?? 0;
      render();
    }catch(err){
      tableBody.innerHTML=`<tr><td colspan="4" class="empty-row">${esc(err.message||"Gagal mendapatkan data.")}</td></tr>`;
      showToast(err.message||"Gagal mendapatkan data dari Google Sheet.","error");
    }finally{
      document.getElementById("refreshBtn").disabled=false;
    }
  }

  function render(){
    const q=searchBox.value.trim().toLowerCase();
    const filtered=rows.filter(r=>{
      const cls=statusClass(r.status);
      const filterOk=currentFilter==="all"||cls===currentFilter;
      const text=`${r.name||""} ${r.bahagian||""}`.toLowerCase();
      return filterOk&&(!q||text.includes(q));
    });

    tableBody.innerHTML=filtered.length?filtered.map(r=>`
      <tr>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${esc(r.bahagian||"—")}</td>
        <td><span class="status-chip ${statusClass(r.status)}">${esc(r.status)}</span></td>
        <td>${esc(fmtDate(r.timestamp))}</td>
      </tr>`).join(""):`<tr><td colspan="4" class="empty-row">Tiada rekod.</td></tr>`;

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
    sessionStorage.clear();
    location.replace("urusetia.html");
  });

  document.getElementById("exportBtn").addEventListener("click",()=>{
    const csvRows=[["Nama","Bahagian","Status","Dikemas Kini"]];
    rows.forEach(r=>csvRows.push([r.name||"",r.bahagian||"",r.status||"",r.timestamp||""]));
    const csv=csvRows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="Kehadiran_Majlis_Apresiasi_SUKNA21.csv";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  });

  load();
})();
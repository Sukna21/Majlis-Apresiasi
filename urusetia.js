(() => {
  const form=document.getElementById("loginForm");
  const error=document.getElementById("loginError");
  const EXPECTED="4a5afc6a96b43901088eafb3487073444ab492ed53df37ccfa938e25ed0eb279";

  async function sha256(text){
    const data=new TextEncoder().encode(text);
    const hash=await crypto.subtle.digest("SHA-256",data);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  if(sessionStorage.getItem("sukna21_admin_login")==="1"){
    location.replace("admin.html");
    return;
  }

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const username=document.getElementById("username").value.trim();
    const password=document.getElementById("password").value;
    const digest=await sha256(`${username}:${password}`);
    if(digest===EXPECTED){
      sessionStorage.setItem("sukna21_admin_login","1");
      sessionStorage.setItem("sukna21_admin_time",String(Date.now()));
      location.replace("admin.html");
    }else{
      error.classList.remove("hidden");
      document.getElementById("password").value="";
    }
  });
})();
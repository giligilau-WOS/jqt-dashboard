window.ROSTER_STORE={err:'',
 async get(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}},
 async set(k,v){try{localStorage.setItem(k,JSON.stringify(v));this.err='';return true}catch(e){this.err=String(e&&e.message||e);return false}}};

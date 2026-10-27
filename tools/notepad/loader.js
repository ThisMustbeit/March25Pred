document.addEventListener('DOMContentLoaded',async()=>{
  if(!document.getElementById('notepad'))return;
  try{await import('./notepad.js');}
  catch(error){document.getElementById('account-state').textContent='Unable to connect to the notebook. Check your connection and reload. No notes have been changed.';}
});

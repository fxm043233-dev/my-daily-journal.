(() => {
  "use strict";
  const STORAGE_KEY = "myDailyJournal_v1";
  const $ = (id) => document.getElementById(id);
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const safeDate = (value) => value || todayISO();
  const fmtDate = (iso, opts={weekday:"short", day:"numeric", month:"short", year:"numeric"}) => {
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, opts);
  };
  const defaultHabits = [
    {id:"h1",name:"Fajr prayer",category:"Faith"},
    {id:"h2",name:"Quran revision",category:"Faith"},
    {id:"h3",name:"Workout / movement",category:"Health"},
    {id:"h4",name:"Trading analysis before entry",category:"Trading"},
    {id:"h5",name:"Follow trading risk rules",category:"Trading"},
    {id:"h6",name:"Web development / learning",category:"Learning"},
    {id:"h7",name:"Review the day",category:"Personal"}
  ];
  let data = loadData();
  let selectedDate = todayISO();
  let editingHabitId = null;
  let toastTimer;

  function loadData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && Array.isArray(parsed.habits)) {
        parsed.journals ||= {}; parsed.habitChecks ||= {}; parsed.trades ||= [];
        return parsed;
      }
    } catch (e) { console.warn("Could not read saved journal", e); }
    return {habits:defaultHabits, journals:{}, habitChecks:{}, trades:[]};
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
    catch (e) { toast("Could not save. Your browser storage may be full."); return false; }
  }
  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function money(n) { const value = Number(n) || 0; return value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function journalForDate() { return data.journals[selectedDate] || {}; }
  function checksForDate() { return data.habitChecks[selectedDate] || {}; }
  function tradesForDate() { return data.trades.filter(t => t.date === selectedDate); }
  function showView(name) {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === `${name}View`));
    document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.view === name));
    const titles = {dashboard:"Dashboard",journal:"Daily journal",habits:"Habit tracker",trading:"Trading tracker",history:"History & backup"};
    $("pageTitle").textContent = titles[name] || "Dashboard";
    if (name === "journal") fillJournal();
    renderAll();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function updateDateHeader() {
    const d = new Date(`${selectedDate}T12:00:00`);
    $("todayLabel").textContent = fmtDate(selectedDate,{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase();
    $("welcomeDay").textContent = d.toLocaleDateString(undefined,{weekday:"short"}).toUpperCase();
    $("welcomeDate").textContent = String(d.getDate()).padStart(2,"0");
    $("welcomeMonth").textContent = d.toLocaleDateString(undefined,{month:"long"}).toUpperCase();
    $("tradeDateLabel").textContent = fmtDate(selectedDate);
  }
  function renderAll() {
    updateDateHeader(); renderDashboard(); renderHabits(); renderTrades(); renderHistory();
  }
  function renderDashboard() {
    const checks = checksForDate(), total = data.habits.length;
    const done = data.habits.filter(h => checks[h.id]).length;
    $("dashHabits").textContent = `${done}/${total}`;
    $("dashHabitPercent").textContent = `${total ? Math.round(done/total*100) : 0}% completed today`;
    const j = journalForDate();
    const started = Object.values(j).some(v => String(v || "").trim());
    $("dashJournal").textContent = started ? "In progress" : "Not started";
    const trades = tradesForDate(), wins = trades.filter(t=>t.result==="win").length;
    $("dashTrades").textContent = trades.length;
    $("dashWinRate").textContent = trades.length ? `${Math.round(wins/trades.length*100)}% win rate` : "No results yet";
    const pl = trades.reduce((s,t)=>s+(Number(t.pl)||0),0);
    $("dashPL").textContent = money(pl);
    $("dashPL").className = pl > 0 ? "positive" : pl < 0 ? "negative" : "";
    const list = $("dashboardHabitList");
    if (!data.habits.length) { list.innerHTML = '<div class="empty-state">Add a habit to start tracking your routine.</div>'; return; }
    list.innerHTML = data.habits.slice(0,5).map(h => `<div class="habit-mini"><button class="habit-check ${checks[h.id]?"done":""}" data-check="${esc(h.id)}" aria-label="Toggle ${esc(h.name)}">${checks[h.id]?"✓":""}</button><div class="habit-mini-info"><strong>${esc(h.name)}</strong><small>${esc(h.category)}</small></div><span class="category-tag">${checks[h.id]?"Done":"Pending"}</span></div>`).join("");
  }
  function renderHabits() {
    const checks = checksForDate(), total = data.habits.length, done = data.habits.filter(h=>checks[h.id]).length;
    const pct = total ? Math.round(done/total*100) : 0;
    $("habitBigPercent").textContent = `${pct}%`; $("habitProgress").style.width = `${pct}%`;
    $("habitFraction").textContent = `${done} of ${total} habits`; $("habitSummaryText").textContent = pct===100 && total ? "Excellent. You showed up for yourself today." : pct ? "Keep going. Every completed habit counts." : "Start with one small win.";
    const list = $("habitList");
    if (!total) { list.innerHTML = '<div class="panel empty-state"><strong>No habits yet</strong>Add a habit you want to build into your routine.</div>'; return; }
    list.innerHTML = data.habits.map(h=>`<article class="habit-card"><button class="habit-check ${checks[h.id]?"done":""}" data-check="${esc(h.id)}" aria-label="Toggle ${esc(h.name)}">${checks[h.id]?"✓":""}</button><div class="habit-card-main"><strong>${esc(h.name)}</strong><small>${esc(h.category)} · ${checks[h.id]?"Completed today":"Not completed yet"}</small></div><div class="habit-card-actions"><button class="mini-action" data-edit-habit="${esc(h.id)}" title="Edit habit">Edit</button><button class="mini-action" data-delete-habit="${esc(h.id)}" title="Delete habit">×</button></div></article>`).join("");
  }
  function renderTrades() {
    const trades = tradesForDate(), wins = trades.filter(t=>t.result==="win").length, losses = trades.filter(t=>t.result==="loss").length;
    const net = trades.reduce((s,t)=>s+(Number(t.pl)||0),0);
    const followed = trades.filter(t=>t.followed==="yes").length;
    $("tradeCount").textContent = trades.length; $("tradeWinRate").textContent = `${trades.length?Math.round(wins/trades.length*100):0}%`;
    $("tradeRecord").textContent = `${wins} wins · ${losses} losses`;
    $("tradeNet").textContent = money(net); $("tradeNet").className = net>0?"positive":net<0?"negative":"";
    $("tradeDiscipline").textContent = `${trades.length?Math.round(followed/trades.length*100):0}%`;
    const list = $("tradeList");
    if (!trades.length) { list.innerHTML = '<div class="empty-state"><strong>No trades recorded for this date</strong>When you finish a trade, log the result and whether you followed your plan.</div>'; return; }
    list.innerHTML = trades.slice().reverse().map(t=>`<div class="trade-row"><div class="trade-instrument"><strong>${esc(t.pair)}</strong><small>${esc(t.session)} · ${esc(t.direction)}${t.entry?` · Entry ${esc(t.entry)}`:""}</small></div><span class="pill ${t.direction.toLowerCase()}">${esc(t.direction)}</span><span class="pill ${t.result}">${t.result==="breakeven"?"Breakeven":t.result==="win"?"Win":"Loss"}</span><div><span class="pl-value ${Number(t.pl)>0?"positive":Number(t.pl)<0?"negative":""}">${Number(t.pl)>0?"+":""}${money(t.pl)}</span><small class="trade-risk" style="display:block;color:#9aa1b0;font-size:10px;margin-top:4px">Plan: ${t.followed==="yes"?"Followed":"Broken"}</small></div><button class="trade-delete" data-delete-trade="${esc(t.id)}" title="Delete trade">×</button></div>`).join("");
  }
  function renderHistory() {
    const list = $("historyList");
    const dates = new Set([...Object.keys(data.journals),...Object.keys(data.habitChecks),...data.trades.map(t=>t.date)]);
    const sorted = [...dates].sort((a,b)=>b.localeCompare(a));
    if (!sorted.length) { list.innerHTML = '<div class="empty-state"><strong>Your history will appear here</strong>Save a journal, check a habit or log a trade to create a record.</div>'; return; }
    list.innerHTML = sorted.map(date=>{
      const j=data.journals[date]||{}, hasJournal=Object.values(j).some(v=>String(v||"").trim());
      const done=data.habits.filter(h=>(data.habitChecks[date]||{})[h.id]).length;
      const count=data.trades.filter(t=>t.date===date).length;
      return `<div class="history-row"><div><strong>${esc(fmtDate(date,{weekday:"short",day:"numeric",month:"long",year:"numeric"}))}</strong><small>${hasJournal?"Journal saved":"No journal text"} · ${done} habits completed · ${count} trades</small></div><button data-open-date="${esc(date)}">Open day</button></div>`;
    }).join("");
  }
  function fillJournal() {
    const j=journalForDate();
    const fields={jGoals:"goals",jWake:"wake",jBed:"bed",jWins:"wins",jImprove:"improve",jMood:"mood",jLesson:"lesson",jTomorrow:"tomorrow"};
    Object.entries(fields).forEach(([id,key])=>$(id).value=j[key]||"");
    $("journalSaveStatus").textContent = data.journals[selectedDate] ? "Saved on this device. You can update it anytime." : "Your journal saves on this device.";
  }
  function saveJournal(e) {
    if(e)e.preventDefault();
    const fields={jGoals:"goals",jWake:"wake",jBed:"bed",jWins:"wins",jImprove:"improve",jMood:"mood",jLesson:"lesson",jTomorrow:"tomorrow"};
    const entry={}; Object.entries(fields).forEach(([id,key])=>entry[key]=$(id).value.trim());
    entry.updatedAt=new Date().toISOString(); data.journals[selectedDate]=entry;
    if(persist()){ $("journalSaveStatus").textContent="Saved just now ✓"; toast("Journal saved."); renderAll(); }
  }
  function openHabitDialog(id=null) {
    editingHabitId=id;
    const habit=id?data.habits.find(h=>h.id===id):null;
    $("habitModalTitle").textContent=habit?"Edit habit":"Add a habit";
    $("habitNameInput").value=habit?.name||""; $("habitCategoryInput").value=habit?.category||"Personal";
    $("habitDialog").showModal(); $("habitNameInput").focus();
  }
  function saveHabit(e) {
    e.preventDefault();
    const name=$("habitNameInput").value.trim(), category=$("habitCategoryInput").value;
    if(!name)return;
    if(editingHabitId){const h=data.habits.find(h=>h.id===editingHabitId);if(h){h.name=name;h.category=category;}}
    else data.habits.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,category});
    persist(); $("habitDialog").close(); renderAll(); toast(editingHabitId?"Habit updated.":"Habit added.");
  }
  function toggleHabit(id) {
    data.habitChecks[selectedDate] ||= {};
    data.habitChecks[selectedDate][id] = !data.habitChecks[selectedDate][id];
    persist(); renderAll();
  }
  function deleteHabit(id) {
    const h=data.habits.find(h=>h.id===id); if(!h)return;
    if(!confirm(`Delete "${h.name}" from your habit list? Past checkmarks for this habit will remain in stored history.`))return;
    data.habits=data.habits.filter(h=>h.id!==id); persist(); renderAll(); toast("Habit deleted.");
  }
  function openTradeDialog() {
    $("tradeModalForm").reset(); $("tPL").value="0"; $("tradeDialog").showModal(); $("tPair").focus();
  }
  function saveTrade(e) {
    e.preventDefault();
    const pair=$("tPair").value.trim().toUpperCase(); if(!pair)return;
    data.trades.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),date:selectedDate,pair,session:$("tSession").value,direction:$("tDirection").value,result:$("tResult").value,entry:$("tEntry").value.trim(),sl:$("tSL").value.trim(),tp:$("tTP").value.trim(),pl:Number($("tPL").value)||0,risk:Number($("tRisk").value)||0,followed:$("tFollowed").value,emotion:$("tEmotion").value.trim(),lesson:$("tLesson").value.trim(),createdAt:new Date().toISOString()});
    persist(); $("tradeDialog").close(); renderAll(); toast("Trade recorded.");
  }
  function deleteTrade(id) {
    if(!confirm("Delete this trade record?"))return;
    data.trades=data.trades.filter(t=>t.id!==id);persist();renderAll();toast("Trade deleted.");
  }
  function exportData() {
    const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`my-daily-journal-backup-${todayISO()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast("Backup exported.");
  }
  function importData(file) {
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const imported=JSON.parse(reader.result);
        if(!imported||!Array.isArray(imported.habits)||typeof imported.journals!=="object"||!Array.isArray(imported.trades))throw new Error("Invalid backup format");
        if(!confirm("Importing replaces all current journal data in this browser. Have you exported a backup of your current data? Continue?"))return;
        data={habits:imported.habits,journals:imported.journals||{},habitChecks:imported.habitChecks||{},trades:imported.trades||[]};
        persist();renderAll();fillJournal();toast("Backup imported.");
      }catch(err){alert("That file could not be imported. Please choose a valid My Daily Journal JSON backup.");}
      $("importFile").value="";
    };
    reader.readAsText(file);
  }

  document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.goto)));
  $("selectedDate").value=selectedDate;
  $("selectedDate").addEventListener("change",e=>{selectedDate=safeDate(e.target.value);if($("journalView").classList.contains("active"))fillJournal();renderAll();});
  $("journalForm").addEventListener("submit",saveJournal); $("saveJournalBtn").addEventListener("click",saveJournal);
  $("addHabitBtn").addEventListener("click",()=>openHabitDialog()); $("habitModalForm").addEventListener("submit",saveHabit);
  $("addTradeBtn").addEventListener("click",openTradeDialog); $("tradeModalForm").addEventListener("submit",saveTrade);
  ["exportBtn","exportBtn2","exportBtn3"].forEach(id=>$(id).addEventListener("click",exportData));
  $("importFile").addEventListener("change",e=>importData(e.target.files[0]));
  document.addEventListener("click",e=>{
    const check=e.target.closest("[data-check]"); if(check){toggleHabit(check.dataset.check);return;}
    const edit=e.target.closest("[data-edit-habit]");if(edit){openHabitDialog(edit.dataset.editHabit);return;}
    const del=e.target.closest("[data-delete-habit]");if(del){deleteHabit(del.dataset.deleteHabit);return;}
    const td=e.target.closest("[data-delete-trade]");if(td){deleteTrade(td.dataset.deleteTrade);return;}
    const od=e.target.closest("[data-open-date]");if(od){selectedDate=od.dataset.openDate;$("selectedDate").value=selectedDate;showView("journal");}
  });
  renderAll(); fillJournal();
})();
// HealthyChange — All features (pure JS)
// Data structures:
// localStorage keys: HC_HABITS (object: { habitName: { logs: { 'YYYY-MM-DD': 'done'|'not' }, created }})

const STORAGE_KEY = "HC_HABITS_V1";

let allHabits = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
let reminderTimer = null;

// ---------- Helpers ----------
const $ = id => document.getElementById(id);
const todayKey = (d = new Date()) => d.toISOString().split("T")[0];

// Save
function saveAll() { localStorage.setItem(STORAGE_KEY, JSON.stringify(allHabits)); }

// ---------- UI Rendering ----------
function renderHabitList() {
  const ul = $("habitList"); ul.innerHTML = "";
  const keys = Object.keys(allHabits);
  if (!keys.length) ul.innerHTML = "<p class='hint'>No habits yet. Add one to start.</p>";
  keys.forEach(name => {
    const li = document.createElement("li"); li.className = "habit-item";
    const left = document.createElement("div"); left.innerHTML = `<div class="habit-name">${name}</div><div class="hint">Created: ${allHabits[name].created}</div>`;
    const right = document.createElement("div"); right.className = "habit-actions";
    const selectBtn = document.createElement("button"); selectBtn.textContent = "Select"; selectBtn.onclick = ()=> setActiveHabit(name);
    const delBtn = document.createElement("button"); delBtn.textContent = "Delete"; delBtn.onclick = ()=> { if(confirm("Delete habit?")){ delete allHabits[name]; saveAll(); renderAll(); } };
    right.appendChild(selectBtn); right.appendChild(delBtn);
    li.appendChild(left); li.appendChild(right);
    ul.appendChild(li);
  });
  renderActiveOptions();
}

function renderActiveOptions(){
  const sel = $("activeHabitSelect"); sel.innerHTML = "";
  const keys = Object.keys(allHabits);
  if (!keys.length) { sel.innerHTML = `<option value="">— No habits —</option>`; return; }
  sel.innerHTML = `<option value="">— Select habit —</option>` + keys.map(k=>`<option value="${k}">${k}</option>`).join("");
  // keep selected if stored
  const active = localStorage.getItem("HC_ACTIVE");
  if (active) sel.value = active;
  sel.onchange = ()=> localStorage.setItem("HC_ACTIVE", sel.value);
}

function setActiveHabit(name){
  localStorage.setItem("HC_ACTIVE", name);
  renderActiveOptions();
  renderDashboard();
  renderCalendar();
  renderHistory();
}

function getActiveHabit(){
  return localStorage.getItem("HC_ACTIVE") || "";
}

// ---------- Add habits ----------
$("addPresetBtn").onclick = addPreset;
$("addCustomBtn").onclick = addCustom;
$("addDemoBtn").onclick = addDemo;

function addPreset(){
  const sel = $("presetSelect").value.trim();
  if(!sel){ alert("Choose a preset."); return; }
  addHabitInternal(sel);
}
function addCustom(){
  const name = $("newHabitInput").value.trim();
  if(!name){ alert("Enter habit name"); return; }
  addHabitInternal(name);
  $("newHabitInput").value = "";
}
function addDemo(){
  ["Drink 8 glasses of water","Eat one fruit daily","Avoid junk food"].forEach(h=> addHabitInternal(h));
}

function addHabitInternal(name){
  if(allHabits[name]){ alert("Habit already exists"); return; }
  allHabits[name] = { created: new Date().toLocaleDateString(), logs: {} };
  saveAll(); renderAll();
}

// ---------- Mark today ----------
$("markDone").onclick = ()=> markToday("done");
$("markNotDone").onclick = ()=> markToday("not");

function markToday(status){
  const active = getActiveHabit();
  if(!active){ alert("Select an active habit first."); return; }
  const note = $("note").value.trim();
  const key = todayKey();
  allHabits[active].logs[key] = { status, note };
  saveAll(); renderAll();
  $("note").value = "";
}

// ---------- Calendar (last 30 days) ----------
function renderCalendar(){
  const cal = $("calendar"); cal.innerHTML = "";
  const active = getActiveHabit();
  if(!active){ cal.innerHTML = "<div class='hint'>Select a habit to view calendar.</div>"; return; }
  const logs = allHabits[active].logs || {};
  // last 30 days
  for(let i=29;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const key = todayKey(d);
    const div = document.createElement("div"); div.className = "day";
    if(logs[key]) div.className = logs[key].status === "done" ? "day done" : "day not";
    div.textContent = d.getDate();
    div.title = key + (logs[key] ? ` - ${logs[key].status.toUpperCase()}${logs[key].note?(' • '+logs[key].note):''}` : '');
    cal.appendChild(div);
  }
}

// ---------- Dashboard ----------
function renderDashboard(){
  const active = getActiveHabit();
  $("daysLogged").textContent = "0";
  $("daysDone").textContent = "0";
  $("streak").textContent = "0";
  $("successRate").textContent = "0%";
  drawPie(0,0);
  if(!active) return;
  const logsObj = allHabits[active].logs || {};
  const dates = Object.keys(logsObj).sort().reverse();
  const daysLogged = dates.length;
  const daysDone = dates.filter(d => logsObj[d].status === "done").length;
  $("daysLogged").textContent = daysLogged;
  $("daysDone").textContent = daysDone;
  const rate = daysLogged ? Math.round((daysDone/daysLogged)*100) : 0;
  $("successRate").textContent = rate + "%";
  // streak (consecutive done from most recent day)
  let streak = 0; for(let d of dates){ if(logsObj[d].status==='done') streak++; else break; }
  $("streak").textContent = streak;
  drawPie(daysDone, daysLogged - daysDone);
}

// ---------- History ----------
function renderHistory(){
  const active = getActiveHabit();
  const container = $("logHistory"); container.innerHTML = "";
  if(!active){ container.innerHTML = "<div class='hint'>Select a habit to see history.</div>"; return; }
  const logsArr = Object.entries(allHabits[active].logs || {}).sort((a,b)=> b[0].localeCompare(a[0]));
  if(!logsArr.length){ container.innerHTML = "<div class='hint'>No logs yet.</div>"; return; }
  logsArr.forEach(([date, obj])=>{
    const div = document.createElement("div"); div.className = "log-entry";
    div.innerHTML = `<div><strong>${date}</strong><div class="note">${obj.note || ""}</div></div>
                     <div><span style="font-weight:700">${obj.status==='done'?'Done':'Not'}</span><div style="margin-top:6px"><button onclick="editEntry('${date}')">Edit</button> <button onclick="deleteEntry('${date}')">Delete</button></div></div>`;
    container.appendChild(div);
  });
}

// ---------- Edit / Delete entry ----------
function editEntry(date){
  const active = getActiveHabit();
  if(!active) return;
  const rec = allHabits[active].logs[date];
  const newStatus = prompt("Change status (done / not):", rec.status) || rec.status;
  const newNote = prompt("Change note (leave blank to keep):", rec.note || "") || rec.note;
  allHabits[active].logs[date] = { status: newStatus==='done' ? 'done' : 'not', note: newNote };
  saveAll(); renderAll();
}
function deleteEntry(date){
  const active = getActiveHabit();
  if(!active) return;
  if(!confirm("Delete this entry?")) return;
  delete allHabits[active].logs[date];
  saveAll(); renderAll();
}

// ---------- Export CSV / Backup ----------
$("exportCsvBtn").onclick = exportCSV;
$("backupBtn").onclick = backupJSON;

function exportCSV(){
  const active = getActiveHabit();
  if(!active){ alert("Select a habit"); return; }
  const logs = allHabits[active].logs || {};
  let csv = "Date,Status,Note\n";
  Object.keys(logs).sort().reverse().forEach(d => {
    csv += `${d},${logs[d].status},${(logs[d].note||"").replace(/,/g,' ')}\n`;
  });
  downloadBlob(csv, `${active.replace(/\s+/g,'_')}_logs.csv`);
}
function backupJSON(){
  const json = JSON.stringify(allHabits, null, 2);
  downloadBlob(json, `healthy_backup_${new Date().toISOString().split('T')[0]}.json`);
}
function downloadBlob(text, filename){
  const blob = new Blob([text], {type:'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// ---------- Reminder ----------
$("setReminderBtn").onclick = setReminder;
function setReminder(){
  const t = $("reminderTime").value;
  if(!t){ alert("Choose a time"); return; }
  localStorage.setItem("HC_REMINDER", t);
  alert("Reminder set at " + t + ". Keep the page open to receive notifications.");
  scheduleReminder();
}
function scheduleReminder(){
  if(reminderTimer) clearTimeout(reminderTimer);
  const t = localStorage.getItem("HC_REMINDER");
  if(!t) return;
  const now = new Date();
  const [hh,mm] = t.split(':').map(Number);
  const next = new Date();
  next.setHours(hh,mm,0,0);
  if(next <= now) next.setDate(next.getDate()+1);
  const ms = next - now;
  reminderTimer = setTimeout(()=> {
    notify("HealthyChange Reminder", "Don't forget to track your habit today!");
    scheduleReminder();
  }, ms);
}
function notify(title, body){
  if(!("Notification" in window)){ alert(body); return; }
  if(Notification.permission === "granted") new Notification(title, {body});
  else Notification.requestPermission().then(p=>{ if(p==='granted') new Notification(title, {body}); else alert(body); });
}

// ---------- Pie Chart (canvas) ----------
function drawPie(done, notdone){
  const canvas = $("pieChart"); if(!canvas) return;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  const total = done + notdone; if(total===0){
    // draw gray circle
    ctx.fillStyle = "#f0f0f0"; ctx.beginPath(); ctx.arc(100,100,80,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#333"; ctx.font="14px Arial"; ctx.textAlign="center"; ctx.fillText("No data",100,105); return;
  }
  let start = -Math.PI/2;
  const doneAngle = (done/total) * Math.PI*2;
  // done
  ctx.beginPath(); ctx.moveTo(100,100); ctx.fillStyle = "#78c679"; ctx.arc(100,100,80,start,start+doneAngle); ctx.fill();
  start += doneAngle;
  // not
  ctx.beginPath(); ctx.moveTo(100,100); ctx.fillStyle = "#d0d7da"; ctx.arc(100,100,80,start,start + (Math.PI*2 - doneAngle)); ctx.fill();
  // legend
  ctx.fillStyle="#113"; ctx.font="13px Arial"; ctx.fillText(`Done: ${done}`,100,190);
  ctx.fillText(`Not: ${notdone}`,100,205);
}

// ---------- Render all ----------
function renderAll(){
  renderHabitList();
  renderActiveOptions();
  renderDashboard();
  renderCalendar();
  renderHistory();
}

// ---------- Init ----------
(function init(){
  renderAll();
  scheduleReminder();
})();

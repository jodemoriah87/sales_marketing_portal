import { Client, Account, TablesDB, ID, Query, Permission, Role } from "appwrite";
import "./style.css";
const env = import.meta.env, DB = env.VITE_APPWRITE_DATABASE_ID;
const client = new Client().setEndpoint(env.VITE_APPWRITE_ENDPOINT).setProject(env.VITE_APPWRITE_PROJECT);
const account = new Account(client), db = new TablesDB(client);
const CATS = ["Insurance","NGOs","Entertainment","Tours","Embassies","Mining","Banks","Individual","Hotels","Flight","Government","Corporate"];
const TABS = ["Dashboard","Daily Route","Visitors","Appointments","Blizz","Users"];
const TABLES = ["visitors","route_stops","appointments"];
let me = null, admin = false, tab = "Dashboard", filter = "All", D = { visitors: [], route_stops: [], appointments: [] };
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);
function toast(m) { const t = $("#toast"); t.textContent = m; t.style.display = "block"; setTimeout(() => t.style.display = "none", 2500); }
const fail = e => toast(e?.message || "Something went wrong");

async function load() {
  await Promise.all(TABLES.map(async t => {
    const r = await db.listRows({ databaseId: DB, tableId: t, queries: [Query.orderDesc("$createdAt"), Query.limit(500)] });
    D[t] = r.rows;
  }));
}
async function refresh() { try { await load(); render(); } catch (e) { fail(e); } }
async function add(t, data) {
  const u = Role.user(me.$id), a = Role.label("admin");
  return db.createRow({ databaseId: DB, tableId: t, rowId: ID.unique(), data: { ...data, created_by: me.email },
    permissions: [Permission.read(u), Permission.update(u), Permission.delete(u), Permission.read(a), Permission.update(a), Permission.delete(a)] });
}
async function del(t, id) { try { await db.deleteRow({ databaseId: DB, tableId: t, rowId: id }); await refresh(); toast("Deleted"); } catch (e) { fail(e); } }

async function login() {
  const email = $("#em").value.trim().toLowerCase(), password = $("#pw").value;
  if (!email || !password) return toast("Enter email and password");
  try { await account.createEmailPasswordSession({ email, password }); } catch (e) { return fail(e); }
  start();
}
async function start() {
  try { me = await account.get(); } catch { return; }
  admin = (me.labels || []).includes("admin");
  $("#login").style.display = "none"; $("#app").style.display = "block";
  buildNav(); refresh();
}
function buildNav() {
  const n = $("#nav"); n.querySelectorAll("button,.who").forEach(x => x.remove());
  TABS.filter(t => t !== "Users" || admin).forEach(t => {
    const b = document.createElement("button"); b.textContent = t; if (t === tab) b.className = "on";
    b.onclick = () => { tab = t; buildNav(); render(); }; n.appendChild(b);
  });
  const w = document.createElement("div"); w.className = "who"; w.textContent = me.email; n.appendChild(w);
  const o = document.createElement("button"); o.textContent = "Sign out";
  o.onclick = () => account.deleteSession({ sessionId: "current" }).finally(() => location.reload()); n.appendChild(o);
}
function table(cols, rows, delT) {
  if (!rows.length) return '<p class="empty">Nothing here yet. Add the first entry above.</p>';
  return '<div class="wrap"><table><tr>' + cols.map(c => `<th>${c[0]}</th>`).join("") + (delT ? "<th></th>" : "") + "</tr>" +
    rows.map(r => "<tr>" + cols.map(c => `<td>${esc(r[c[1]])}</td>`).join("") +
      (delT ? `<td><button class="del" onclick="del('${delT}','${r.$id}')">Delete</button></td>` : "") + "</tr>").join("") + "</table></div>";
}
function render() { ({ Dashboard: dash, "Daily Route": route, Visitors: visitors, Appointments: () => appts("appointment", "Appointments"), Blizz: () => appts("blizz", "Blizz"), Users: users })[tab]($("#view")); }

function dash(v) {
  const t = today(), by = {}; D.visitors.forEach(x => by[x.category] = (by[x.category] || 0) + 1);
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 7), mx = Math.max(1, ...top.map(x => x[1]));
  v.innerHTML = `<h1>Dashboard</h1><div class="grid">
  <div class="card kpi"><b>${D.visitors.filter(x => x.date === t).length}</b><span>Visitors today</span></div>
  <div class="card kpi"><b>${D.visitors.length}</b><span>Total visitors</span></div>
  <div class="card kpi"><b>${D.appointments.filter(x => x.type === "appointment").length}</b><span>Appointments</span></div>
  <div class="card kpi"><b>${D.route_stops.filter(x => x.date === t).length}</b><span>Route stops today</span></div></div>
  <div class="card"><h3>Visitors by category</h3>${top.length ? `<div class="bars">${top.map(([c, n]) => `<div><i style="height:${n / mx * 130}px"></i>${n}<br>${esc(c)}</div>`).join("")}</div>` : '<p class="empty">No visitors recorded yet.</p>'}</div>`;
}
function route(v) {
  const d = D.route_stops.filter(x => x.date === today());
  v.innerHTML = `<h1>Daily Route</h1><div class="card"><div class="row">
  <div><label>Company / place</label><input id="r1"></div><div><label>Area</label><input id="r2"></div><div><label>Planned time</label><input id="r3" type="time"></div>
  <button onclick="addRoute()">Add stop</button></div></div><div class="card">${table([["Time","time"],["Place","company"],["Area","area"],["Status","status"]], d, "route_stops")}</div>`;
}
async function addRoute() {
  const c = $("#r1").value.trim(); if (!c) return toast("Enter the company or place");
  try { await add("route_stops", { date: today(), company: c, area: $("#r2").value, time: $("#r3").value, status: "Planned" }); await refresh(); toast("Stop added"); } catch (e) { fail(e); }
}
function visitors(v) {
  const rows = D.visitors.filter(x => filter === "All" || x.category === filter);
  v.innerHTML = `<h1>Visitors</h1><div class="card"><div class="row">
  <div><label>Company</label><input id="v1"></div><div><label>Contact person</label><input id="v2"></div><div><label>Phone</label><input id="v3"></div>
  <div><label>Category</label><select id="v4">${CATS.map(c => `<option>${c}</option>`).join("")}</select></div><button onclick="addVis()">Save visitor</button></div></div>
  <div class="card"><div class="row"><div><label>Filter by category</label><select onchange="setFilter(this.value)"><option>All</option>${CATS.map(c => `<option ${c === filter ? "selected" : ""}>${c}</option>`).join("")}</select></div>
  <button class="ghost" onclick="csvOut()">Download CSV</button><button class="ghost" onclick="$('#up').click()">Upload CSV</button><input id="up" type="file" accept=".csv" hidden onchange="csvIn(this)"></div>
  ${table([["Date","date"],["Company","company"],["Contact","contact"],["Phone","phone"],["Category","category"]], rows, "visitors")}</div>`;
}
async function addVis() {
  const c = $("#v1").value.trim(); if (!c) return toast("Enter the company name");
  try { await add("visitors", { date: today(), company: c, contact: $("#v2").value, phone: $("#v3").value, category: $("#v4").value }); await refresh(); toast("Visitor saved"); } catch (e) { fail(e); }
}
function csvOut() {
  const rows = D.visitors.filter(x => filter === "All" || x.category === filter), h = ["date","company","contact","phone","category"];
  const q = s => '"' + String(s ?? "").replace(/"/g, '""') + '"';
  const b = new Blob([[h.join(",")].concat(rows.map(r => h.map(k => q(r[k])).join(","))).join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "visitors-" + filter.toLowerCase() + ".csv"; a.click();
}
function csvIn(i) {
  const f = i.files[0]; if (!f) return; const r = new FileReader();
  r.onload = async () => {
    const lines = r.result.split(/\r?\n/).slice(1).map(l => l.split(",").map(x => x.replace(/^"|"$/g, "").trim())).filter(c => c[0]);
    try {
      for (const c of lines) await add("visitors", { date: today(), company: c[0], contact: c[1] || "", phone: c[2] || "", category: CATS.includes(c[3]) ? c[3] : "Corporate" });
      await refresh(); toast(lines.length + " customers imported");
    } catch (e) { fail(e); }
  };
  r.readAsText(f);
}
function appts(type, title) {
  const note = type === "appointment" ? "Confirmation goes to reservations@, fnb@ and fb@tiffanydiamondhotels.com" : "Confirmation goes to you only";
  $("#view").innerHTML = `<h1>${title}</h1><p class="hint">${note} (email sending is added in the next step).</p>
  <div class="card"><div class="row"><div><label>Date</label><input id="a1" type="date" value="${today()}"></div><div><label>Time</label><input id="a2" type="time"></div>
  <div><label>Accompanied by</label><input id="a3"></div><div><label>Reminder</label><select id="a4"><option value="">None</option><option>30 minutes before</option><option>1 hour before</option><option>1 day before</option></select></div></div>
  <label>Companies (one per line)</label><textarea id="a5" rows="3" placeholder="Company A&#10;Company B"></textarea>
  <p><button onclick="addAp('${type}')">Save ${title.toLowerCase()}</button></p></div>
  <div class="card">${table([["Date","date"],["Time","time"],["Company","company"],["Accompanied by","accompanied_by"],["Reminder","reminder"]], D.appointments.filter(x => x.type === type), "appointments")}</div>`;
}
async function addAp(type) {
  const cs = $("#a5").value.split("\n").map(s => s.trim()).filter(Boolean); if (!cs.length) return toast("Add at least one company");
  try {
    for (const c of cs) await add("appointments", { type, date: $("#a1").value, time: $("#a2").value, company: c, accompanied_by: $("#a3").value, reminder: $("#a4").value || "-" });
    await refresh(); toast(cs.length + " saved");
  } catch (e) { fail(e); }
}
function users(v) {
  const m = {}, get = e => m[e] ||= { email: e, v: 0, a: 0, r: 0 };
  D.visitors.forEach(x => get(x.created_by).v++); D.appointments.forEach(x => get(x.created_by).a++); D.route_stops.forEach(x => get(x.created_by).r++);
  v.innerHTML = `<h1>Users</h1><div class="card">${table([["Email","email"],["Visitors","v"],["Appointments + Blizz","a"],["Route stops","r"]], Object.values(m))}</div>`;
}
Object.assign(window, { $, del, addRoute, addVis, addAp, csvOut, csvIn, setFilter: f => { filter = f; render(); } });
$("#go").onclick = login; $("#pw").addEventListener("keydown", e => { if (e.key === "Enter") login(); });
start();

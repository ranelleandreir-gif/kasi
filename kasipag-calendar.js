/* ============================================================================
   KASIPAG MICROFINANCING — CALENDAR + NOTIFICATIONS
   ADDITIVE MODULE ONLY. Walang binago sa existing system.

   - Ginagamit ang EXISTING firebase.js (walang bagong Firebase project/config).
   - READ-ONLY sa Firestore: onSnapshot lang sa existing "loans" at "payments".
   - WALANG bagong Firestore collection, field, document ID, o security rule.
   - Ang read/unread state ng notifications ay nasa localStorage (per user),
     kaya walang isinusulat sa database.
   - Self-mounting: iniinject nito ang sarili niyang nav link, section, at bell
     sa existing sidebar/topbar. Hindi kailangang baguhin ang existing markup.

   Usage (isang linya lang bawat dashboard):
     <script type="module" src="kasipag-calendar.js"></script>
   ========================================================================== */

import { db, auth } from "./firebase.js";
import { collection, onSnapshot, doc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ------------------------------------------------------------------ state */
const KC = {
  uid: null,
  role: null,          // "admin" | "collector" | "cashier"
  userName: "",
  loans: [],           // raw loan docs visible to this role
  payments: [],        // raw payment docs visible to this role (cashier/admin)
  events: [],          // derived collection events
  notifs: [],
  readIds: new Set(),
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(),
  selectedKey: null,
  mounted: false,
  seenLoanIds: null    // para sa "new borrower assigned to you"
};

/* ----------------------------------------------------------------- helpers */
const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

function toJsDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addMonthsSafe(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}
function dayKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function fmtLong(d) {
  if (!d) return "N/A";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
function fmtShort(d) {
  if (!d) return "N/A";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* -------------------------------------------------------------------------
   SCHEDULE DERIVATION
   Ginagamit lang ang EXISTING fields at EXISTING logic:
     - nextDueDate (isinusulat na ng existing Collector payment process)
     - kung wala: approvedAt / riderAssignedAt / createdAt + 1 buwan (existing)
     - installment = totalPayable / loanTermMonths (existing)
     - ₱50 late penalty (existing Collector rule)
   WALANG bagong loan calculation dito.
   ------------------------------------------------------------------------- */
function deriveSchedule(l) {
  const totalPayable = Number(l.totalPayable != null ? l.totalPayable : l.amount) || 0;
  let termMonths = Number(l.loanTermMonths) || 0;
  if (!termMonths && l.loanTermType && l.loanTermType !== "custom") termMonths = Number(l.loanTermType) || 0;

  const balance = Number(l.balance) || 0;
  const installment = termMonths > 0 ? Math.round((totalPayable / termMonths) * 100) / 100 : null;

  const stored = toJsDate(l.nextDueDate);
  let dueDate;
  if (stored) {
    dueDate = startOfDay(stored);
  } else {
    const anchor = toJsDate(l.approvedAt) || toJsDate(l.riderAssignedAt) || toJsDate(l.createdAt);
    if (!anchor) return null;
    dueDate = startOfDay(addMonthsSafe(anchor, 1));
    const lastPayment = toJsDate(l.lastPaymentAt);
    const today = startOfDay(new Date());
    let guard = 0;
    while (dueDate <= today && guard < 240) {
      const cycleStart = startOfDay(addMonthsSafe(dueDate, -1));
      if (lastPayment && lastPayment >= cycleStart) { dueDate = startOfDay(addMonthsSafe(dueDate, 1)); guard++; }
      else break;
    }
  }

  const today = startOfDay(new Date());
  const isPaidOff = balance <= 0 || l.status === "paid";
  const isLate = !isPaidOff && dueDate < today;
  const penalty = isLate ? 50 : 0;
  const amountDueBase = balance > 0 ? Math.min(installment != null ? installment : balance, balance) : 0;
  const amountToCollect = Math.max(Math.round((amountDueBase + penalty) * 100) / 100, 0);

  const paidSoFar = Math.max(totalPayable - balance, 0);
  const periodsPaid = installment ? Math.min(Math.round(paidSoFar / installment), termMonths) : 0;
  const remainingMonths = termMonths > 0 ? Math.max(termMonths - periodsPaid, 0) : null;

  const lastPayment = toJsDate(l.lastPaymentAt);
  const cycleStart = startOfDay(addMonthsSafe(dueDate, -1));
  const paidThisCycle = !!lastPayment && lastPayment >= cycleStart && lastPayment <= new Date();

  let state, label;
  if (isPaidOff) { state = "paid"; label = "PAID"; }
  else if (paidThisCycle) { state = "paid"; label = "PAID THIS MONTH"; }
  else if (isLate) { state = "overdue"; label = "OVERDUE"; }
  else { state = "unpaid"; label = "UNPAID"; }

  return { dueDate, installment, amountToCollect, penalty, isLate, remainingMonths, state, label, totalPayable, balance };
}

/* Kaya bang makita ng role na ito ang loan? — existing role rules lang. */
function visibleToRole(l) {
  if (l.deleted || l.deletedPermanent) return false;
  if (l.pendingApproval) return false;
  if (l.status === "rejected" || l.status === "pending") return false;
  if (KC.role === "admin") return true;
  if (KC.role === "collector") return l.assignedCollectorId === KC.uid;
  if (KC.role === "cashier") return l.assignedCashierId === KC.uid;
  return false;
}

/* Bumuo ng collection events mula sa existing data lang. */
function buildEvents() {
  const events = [];
  KC.loans.forEach(l => {
    const s = deriveSchedule(l);
    if (!s || !s.dueDate) return;

    events.push({
      id: l.id + "@" + dayKey(s.dueDate),
      loanId: l.id, loan: l, sched: s,
      date: s.dueDate,
      key: dayKey(s.dueDate),
      amount: s.state === "paid" && s.balance <= 0 ? 0 : s.amountToCollect,
      status: s.label,
      state: s.state,
      projected: false
    });

    // Natitirang buwanang installment — projection lang ng EXISTING monthly
    // schedule (walang bagong kalkulasyon), para kumpleto ang calendar.
    if (s.state !== "paid" && s.remainingMonths && s.remainingMonths > 1 && s.installment) {
      const max = Math.min(s.remainingMonths - 1, 24);
      for (let i = 1; i <= max; i++) {
        const d = startOfDay(addMonthsSafe(s.dueDate, i));
        events.push({
          id: l.id + "@" + dayKey(d),
          loanId: l.id, loan: l, sched: s,
          date: d, key: dayKey(d),
          amount: s.installment,
          status: "SCHEDULED", state: "scheduled", projected: true
        });
      }
    }
  });
  events.sort((a, b) => a.date - b.date || String(a.loan.borrowerName).localeCompare(String(b.loan.borrowerName)));
  KC.events = events;
}

/* ------------------------------------------------------------- notifications */
const readKey = () => "kasipag_notif_read_" + KC.uid;
const seenKey = () => "kasipag_notif_seen_loans_" + KC.uid;

function loadRead() {
  try { KC.readIds = new Set(JSON.parse(localStorage.getItem(readKey()) || "[]")); }
  catch (e) { KC.readIds = new Set(); }
}
function saveRead() {
  try { localStorage.setItem(readKey(), JSON.stringify([...KC.readIds].slice(-400))); } catch (e) {}
}
function loadSeenLoans() {
  try { KC.seenLoanIds = new Set(JSON.parse(localStorage.getItem(seenKey()) || "[]")); }
  catch (e) { KC.seenLoanIds = new Set(); }
}
function saveSeenLoans(ids) {
  try { localStorage.setItem(seenKey(), JSON.stringify(ids.slice(-500))); } catch (e) {}
}

function buildNotifications() {
  const out = [];
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(addMonthsSafe(today, 0)); tomorrow.setDate(today.getDate() + 1);
  const tKey = dayKey(today), tomKey = dayKey(tomorrow);

  if (KC.seenLoanIds === null) loadSeenLoans();
  const firstRun = KC.seenLoanIds.size === 0;
  const currentIds = [];

  KC.events.filter(e => !e.projected).forEach(e => {
    const l = e.loan;
    currentIds.push(l.id);
    const who = esc(l.borrowerName || "Borrower");

    if (e.state === "overdue") {
      out.push({
        id: "overdue-" + l.id + "-" + e.key, loanId: l.id, date: e.date, tone: "red",
        title: "Overdue collection",
        body: who + " — " + peso(e.amount) + " · due " + fmtShort(e.date),
        sub: KC.role === "admin" ? ("Collector: " + esc(l.assignedCollectorName || "Unassigned")) : null,
        sort: 3
      });
    } else if (e.key === tKey) {
      out.push({
        id: "due-today-" + l.id + "-" + e.key, loanId: l.id, date: e.date, tone: "amber",
        title: "Collection scheduled today",
        body: who + " — " + peso(e.amount),
        sub: KC.role === "collector" ? ("Cashier: " + esc(l.assignedCashierName || "Unassigned"))
          : ("Collector: " + esc(l.assignedCollectorName || "Unassigned")),
        sort: 2
      });
    } else if (e.key === tomKey) {
      out.push({
        id: "due-tom-" + l.id + "-" + e.key, loanId: l.id, date: e.date, tone: "blue",
        title: "Collection scheduled tomorrow",
        body: who + " — " + peso(e.amount),
        sub: null, sort: 1
      });
    }

    // Bagong assignment (role-scoped)
    if (!firstRun && !KC.seenLoanIds.has(l.id)) {
      const t = KC.role === "collector" ? "New borrower assigned to you"
        : KC.role === "cashier" ? "New loan assigned to you"
          : "New approved loan";
      out.push({
        id: "assigned-" + l.id, loanId: l.id, date: toJsDate(l.approvedAt) || new Date(), tone: "teal",
        title: t,
        body: who + " — " + peso(e.amount) + " to collect",
        sub: "Due " + fmtShort(e.date), sort: 4
      });
    }
  });

  // Payments — existing "payments" collection lang
  KC.payments.slice(0, 40).forEach(p => {
    const when = toJsDate(p.createdAt) || new Date();
    if ((new Date() - when) > 1000 * 60 * 60 * 24 * 14) return;
    const isForCashier = KC.role === "cashier";
    out.push({
      id: "payment-" + p.id, loanId: p.loanId, date: when, tone: "teal",
      title: isForCashier && p.recordedByRole === "collector"
        ? "Collection received from " + esc(p.collectorName || "Collector")
        : "Payment recorded",
      body: esc(p.borrowerName || "Borrower") + " — " + peso(p.amountPaid),
      sub: "Remaining balance: " + peso(p.remainingBalance),
      sort: 5
    });
  });

  out.sort((a, b) => (b.sort - a.sort) || (b.date - a.date));
  KC.notifs = out.slice(0, 60);

  if (currentIds.length) saveSeenLoans([...new Set([...(KC.seenLoanIds || []), ...currentIds])]);
  KC.seenLoanIds = new Set(currentIds);
}

/* ------------------------------------------------------------------- styles */
const CSS = `
.kc-section{display:none}
.kc-section.kc-show{display:block}
.kc-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-card);padding:18px;margin-bottom:16px}
.kc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.kc-title h2{font-family:var(--font-head);font-size:1.15rem;font-weight:800;color:var(--navy-900);margin:0}
.kc-title p{margin:3px 0 0;font-size:.8rem;color:var(--muted)}
.kc-ctrls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kc-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border);background:var(--surface);color:var(--navy-800);
  font-family:var(--font-body);font-size:.78rem;font-weight:700;padding:8px 12px;border-radius:var(--radius-sm);cursor:pointer;transition:.15s}
.kc-btn:hover{background:var(--surface-alt);border-color:var(--blue);color:var(--blue)}
.kc-btn.kc-primary{background:linear-gradient(135deg,var(--navy-700),var(--blue));border-color:transparent;color:#fff}
.kc-btn.kc-primary:hover{filter:brightness(1.07);color:#fff}
.kc-btn.kc-icon{padding:8px 10px}
.kc-month{font-family:var(--font-head);font-weight:800;font-size:1rem;color:var(--navy-900);min-width:170px;text-align:center}
.kc-legend{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:12px;font-size:.72rem;color:var(--muted);font-weight:600}
.kc-legend span{display:inline-flex;align-items:center;gap:5px}
.kc-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.kc-dot.unpaid{background:var(--blue)}.kc-dot.overdue{background:var(--red)}
.kc-dot.paid{background:var(--teal)}.kc-dot.scheduled{background:var(--muted-2)}
.kc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.kc-dow{text-align:center;font-size:.68rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-2);padding:6px 0}
.kc-cell{min-height:86px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);padding:7px 8px;cursor:pointer;
  display:flex;flex-direction:column;gap:5px;transition:.15s;text-align:left;font-family:var(--font-body)}
.kc-cell:hover{border-color:var(--blue);background:var(--blue-soft);transform:translateY(-1px)}
.kc-cell.kc-out{background:var(--surface-alt);opacity:.5;cursor:default}
.kc-cell.kc-out:hover{transform:none;border-color:var(--border);background:var(--surface-alt)}
.kc-cell.kc-today{border-color:var(--blue);box-shadow:inset 0 0 0 1px var(--blue)}
.kc-cell.kc-sel{background:var(--blue-soft);border-color:var(--blue)}
.kc-num{font-size:.82rem;font-weight:800;color:var(--navy-900)}
.kc-cell.kc-today .kc-num{color:var(--blue)}
.kc-pills{display:flex;flex-direction:column;gap:3px}
.kc-pill{display:inline-flex;align-items:center;gap:4px;font-size:.64rem;font-weight:800;padding:2px 6px;border-radius:999px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kc-pill.unpaid{background:var(--blue-soft);color:var(--blue)}
.kc-pill.overdue{background:var(--red-soft);color:var(--red)}
.kc-pill.paid{background:var(--teal-soft);color:var(--teal)}
.kc-pill.scheduled{background:var(--surface-alt);color:var(--muted);border:1px solid var(--border)}
.kc-daywrap{margin-top:18px;border-top:1px solid var(--border);padding-top:16px}
.kc-daytitle{font-family:var(--font-head);font-size:.92rem;font-weight:800;color:var(--navy-900);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px}
.kc-tablewrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.kc-table{width:100%;border-collapse:collapse;font-size:.8rem;min-width:620px}
.kc-table th{text-align:left;font-size:.67rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted-2);font-weight:800;padding:9px 10px;border-bottom:1px solid var(--border)}
.kc-table td{padding:11px 10px;border-bottom:1px solid var(--border);color:var(--text)}
.kc-table tbody tr{cursor:pointer;transition:.12s}
.kc-table tbody tr:hover{background:var(--blue-soft)}
.kc-name{font-weight:700;color:var(--navy-900)}
.kc-sub{font-size:.7rem;color:var(--muted);margin-top:2px}
.kc-amt{font-weight:800;color:var(--navy-900);white-space:nowrap}
.kc-chip{display:inline-block;font-size:.64rem;font-weight:800;padding:3px 9px;border-radius:999px;letter-spacing:.03em;white-space:nowrap}
.kc-chip.unpaid{background:var(--blue-soft);color:var(--blue)}
.kc-chip.overdue{background:var(--red-soft);color:var(--red)}
.kc-chip.paid{background:var(--teal-soft);color:var(--teal)}
.kc-chip.scheduled{background:var(--surface-alt);color:var(--muted);border:1px solid var(--border)}
.kc-empty{padding:26px;text-align:center;color:var(--muted);font-size:.82rem;background:var(--surface-alt);border:1px dashed var(--border);border-radius:var(--radius-sm)}
.kc-cards{display:none;flex-direction:column;gap:9px}
.kc-card{border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;background:var(--surface);cursor:pointer}
.kc-card:active{background:var(--blue-soft)}
.kc-card-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.kc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px}
.kc-stat{border:1px solid var(--border);border-radius:var(--radius-sm);padding:11px 13px;background:var(--surface-alt)}
.kc-stat strong{display:block;font-family:var(--font-head);font-size:1.15rem;font-weight:800;color:var(--navy-900)}
.kc-stat span{font-size:.7rem;color:var(--muted);font-weight:600}

/* bell */
.kc-bellwrap{position:relative;display:inline-flex}
.kc-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;
  border:1px solid var(--border);background:var(--surface);color:var(--navy-800);cursor:pointer;transition:.15s}
.kc-bell:hover{border-color:var(--blue);color:var(--blue)}
.kc-badge{position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:var(--red);color:#fff;
  font-size:.62rem;font-weight:800;display:none;align-items:center;justify-content:center;border:2px solid var(--surface)}
.kc-badge.kc-on{display:flex}
.kc-panel{position:absolute;top:46px;right:0;width:min(370px,calc(100vw - 28px));max-height:min(460px,70vh);overflow:auto;background:var(--surface);
  border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:var(--shadow-pop);display:none;z-index:1200}
.kc-panel.kc-open{display:block}
.kc-panel-head{position:sticky;top:0;background:var(--surface);border-bottom:1px solid var(--border);padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;z-index:1}
.kc-panel-head strong{font-family:var(--font-head);font-size:.88rem;color:var(--navy-900)}
.kc-link{background:none;border:none;color:var(--blue);font-family:var(--font-body);font-size:.72rem;font-weight:700;cursor:pointer;padding:2px}
.kc-link:hover{text-decoration:underline}
.kc-nitem{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:.12s;text-align:left;width:100%;background:none;border-left:none;border-right:none;border-top:none;font-family:var(--font-body)}
.kc-nitem:hover{background:var(--surface-alt)}
.kc-nitem.kc-unread{background:var(--blue-soft)}
.kc-nitem.kc-unread:hover{background:#dde8fd}
.kc-nicon{flex-shrink:0;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center}
.kc-nicon.blue{background:var(--blue-soft);color:var(--blue)}
.kc-nicon.red{background:var(--red-soft);color:var(--red)}
.kc-nicon.amber{background:var(--amber-soft);color:var(--amber)}
.kc-nicon.teal{background:var(--teal-soft);color:var(--teal)}
.kc-ntext{min-width:0;flex:1}
.kc-ntext strong{display:block;font-size:.78rem;font-weight:800;color:var(--navy-900);margin-bottom:2px}
.kc-ntext span{display:block;font-size:.73rem;color:var(--muted);line-height:1.45;word-break:break-word}
.kc-ntime{font-size:.65rem;color:var(--muted-2);margin-top:4px;font-weight:600}

/* modal */
.kc-overlay{position:fixed;inset:0;background:rgba(11,30,61,.5);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;padding:16px;z-index:2000}
.kc-overlay.kc-open{display:flex}
.kc-modal{background:var(--surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-pop);width:100%;max-width:520px;max-height:88vh;overflow:auto}
.kc-modal-head{background:linear-gradient(135deg,var(--navy-700),var(--blue));color:#fff;padding:18px 20px;border-radius:var(--radius-lg) var(--radius-lg) 0 0;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;position:sticky;top:0}
.kc-modal-head h3{font-family:var(--font-head);font-size:1rem;font-weight:800;color:#fff;margin:0}
.kc-modal-head p{margin:3px 0 0;font-size:.74rem;opacity:.86}
.kc-x{background:rgba(255,255,255,.16);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:1rem;line-height:1;flex-shrink:0}
.kc-x:hover{background:rgba(255,255,255,.3)}
.kc-modal-body{padding:18px 20px}
.kc-row{display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid var(--border);font-size:.8rem}
.kc-row:last-child{border-bottom:none}
.kc-row span{color:var(--muted);font-weight:600;flex-shrink:0}
.kc-row strong{color:var(--navy-900);font-weight:700;text-align:right;word-break:break-word}
.kc-modal-foot{display:flex;gap:9px;flex-wrap:wrap;padding:0 20px 20px}

@media (max-width:820px){
  .kc-wrap{padding:13px}
  .kc-cell{min-height:64px;padding:5px;gap:3px}
  .kc-num{font-size:.75rem}
  .kc-pill{font-size:.58rem;padding:1px 5px}
  .kc-month{min-width:0;flex:1;font-size:.9rem}
  .kc-head{gap:9px}
  .kc-grid{gap:4px}
}
@media (max-width:620px){
  .kc-table{display:none}
  .kc-cards{display:flex}
  .kc-tablewrap{overflow:visible}
  .kc-cell{min-height:56px}
  .kc-pills .kc-pill:nth-child(n+2){display:none}
  .kc-panel{position:fixed;top:auto;right:10px;left:10px;width:auto;bottom:10px;max-height:72vh}
  .kc-ctrls{width:100%}
  .kc-ctrls .kc-btn{flex:0 0 auto}
}
`;

/* --------------------------------------------------------------- UI markup */
const BELL_SVG = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`;
const CAL_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;

function sectionHTML() {
  const subtitle = KC.role === "admin" ? "All scheduled collections across every collector and cashier."
    : KC.role === "collector" ? "Only the collections assigned to you."
      : "Collections linked to your cashier workflow.";
  return `
  <div class="kc-wrap">
    <div class="kc-head">
      <div class="kc-title">
        <h2>📅 Collection Calendar</h2>
        <p>${subtitle}</p>
      </div>
      <div class="kc-ctrls">
        <button type="button" class="kc-btn kc-icon" id="kcPrev" aria-label="Previous month">‹</button>
        <div class="kc-month" id="kcMonthLabel">—</div>
        <button type="button" class="kc-btn kc-icon" id="kcNext" aria-label="Next month">›</button>
        <button type="button" class="kc-btn kc-primary" id="kcToday">Today</button>
      </div>
    </div>
    <div class="kc-stats" id="kcStats"></div>
    <div class="kc-legend">
      <span><i class="kc-dot unpaid"></i>Unpaid</span>
      <span><i class="kc-dot overdue"></i>Overdue</span>
      <span><i class="kc-dot paid"></i>Paid</span>
      <span><i class="kc-dot scheduled"></i>Upcoming installment</span>
    </div>
    <div class="kc-grid" id="kcGrid"></div>
    <div class="kc-daywrap" id="kcDayWrap"></div>
  </div>`;
}

function mountUI() {
  if (KC.mounted) return;
  const style = document.createElement("style");
  style.id = "kcStyles";
  style.textContent = CSS;
  document.head.appendChild(style);

  const isAdmin = KC.role === "admin";

  /* --- section --- */
  const section = document.createElement("section");
  section.id = "kcCalendarSection";
  section.className = isAdmin ? "section" : "kc-section";
  section.innerHTML = sectionHTML();

  if (isAdmin) {
    document.querySelector("main.main")?.appendChild(section);
  } else {
    (document.querySelector(".main-panel .container") || document.querySelector("main.main"))?.appendChild(section);
  }

  /* --- sidebar nav link --- */
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "kcNavBtn";
    btn.className = "nav-link";
    if (isAdmin) btn.setAttribute("data-tab", "kcCalendarSection");
    btn.innerHTML = CAL_SVG + `<span class="nav-label">Collection Calendar</span><span class="nav-count" id="kcNavCount">0</span>`;
    btn.addEventListener("click", showCalendar);

    if (isAdmin) {
      const labels = [...sidebar.querySelectorAll(".nav-group-label")];
      const reports = labels.find(l => /reports/i.test(l.textContent));
      if (reports) sidebar.insertBefore(btn, reports);
      else sidebar.insertBefore(btn, sidebar.querySelector(".sidebar-summary"));
    } else {
      const summary = sidebar.querySelector(".sidebar-summary");
      if (summary) sidebar.insertBefore(btn, summary); else sidebar.appendChild(btn);
    }
  }

  /* --- bell in topbar --- */
  const right = document.querySelector(".topbar-right");
  if (right) {
    const wrap = document.createElement("div");
    wrap.className = "kc-bellwrap";
    wrap.innerHTML = `
      <button type="button" class="kc-bell" id="kcBell" aria-label="Notifications">
        ${BELL_SVG}<span class="kc-badge" id="kcBadge">0</span>
      </button>
      <div class="kc-panel" id="kcPanel">
        <div class="kc-panel-head">
          <strong>🔔 Notifications</strong>
          <button type="button" class="kc-link" id="kcMarkAll">Mark all as read</button>
        </div>
        <div id="kcNotifList"></div>
      </div>`;
    const anchor = right.querySelector(".admin-chip, .cashier-chip");
    if (anchor) right.insertBefore(wrap, anchor); else right.insertBefore(wrap, right.firstChild);

    // Ang dating placeholder bell (shortcut lang sa Users tab) ay itinatago,
    // pero nananatili sa DOM kaya hindi nasisira ang existing notifDot code.
    const legacy = right.querySelector('.icon-btn[title="Notifications"]');
    if (legacy) legacy.style.display = "none";
  }

  /* --- modal --- */
  const overlay = document.createElement("div");
  overlay.className = "kc-overlay";
  overlay.id = "kcOverlay";
  overlay.innerHTML = `<div class="kc-modal" id="kcModal"></div>`;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);

  /* --- wiring --- */
  document.getElementById("kcPrev").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("kcNext").addEventListener("click", () => shiftMonth(1));
  document.getElementById("kcToday").addEventListener("click", goToday);
  document.getElementById("kcBell").addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
  document.getElementById("kcMarkAll").addEventListener("click", (e) => { e.stopPropagation(); markAllRead(); });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".kc-bellwrap")) document.getElementById("kcPanel")?.classList.remove("kc-open");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(); document.getElementById("kcPanel")?.classList.remove("kc-open"); }
  });

  // Kapag pinindot ang existing tabs, itago ang calendar (collector/cashier).
  if (!isAdmin) {
    document.addEventListener("click", (e) => {
      const link = e.target.closest(".nav-link");
      if (!link || link.id === "kcNavBtn") return;
      const oc = link.getAttribute("onclick") || "";
      if (/showCollectorTab|showCashierTab/.test(oc)) hideCalendar();
    }, true);
  }

  KC.mounted = true;
}

/* -------------------------------------------------------------- navigation */
function showCalendar() {
  const sec = document.getElementById("kcCalendarSection");
  const btn = document.getElementById("kcNavBtn");
  if (!sec) return;
  if (KC.role === "admin" && typeof window.openTab === "function") {
    window.openTab(btn, "kcCalendarSection");
  } else {
    document.querySelectorAll(".main-panel .container > section.card").forEach(s => s.classList.add("hidden"));
    document.querySelectorAll(".nav-link").forEach(n => n.classList.remove("active"));
    sec.classList.add("kc-show");
    btn?.classList.add("active");
  }
  renderCalendar();
  sec.scrollIntoView({ behavior: "smooth", block: "start" });
}
function hideCalendar() {
  document.getElementById("kcCalendarSection")?.classList.remove("kc-show");
  document.getElementById("kcNavBtn")?.classList.remove("active");
}
function shiftMonth(delta) {
  let m = KC.viewMonth + delta, y = KC.viewYear;
  if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
  KC.viewMonth = m; KC.viewYear = y;
  renderCalendar();
}
function goToday() {
  const now = new Date();
  KC.viewYear = now.getFullYear();
  KC.viewMonth = now.getMonth();
  KC.selectedKey = dayKey(now);
  renderCalendar();
}

/* ------------------------------------------------------------- calendar UI */
function eventsByDay() {
  const map = {};
  KC.events.forEach(e => { (map[e.key] = map[e.key] || []).push(e); });
  return map;
}

function renderCalendar() {
  const grid = document.getElementById("kcGrid");
  if (!grid) return;
  document.getElementById("kcMonthLabel").textContent = MONTHS[KC.viewMonth] + " " + KC.viewYear;

  const map = eventsByDay();
  const todayKey = dayKey(new Date());

  // stats for the visible month
  const inMonth = KC.events.filter(e => e.date.getFullYear() === KC.viewYear && e.date.getMonth() === KC.viewMonth);
  const due = inMonth.filter(e => e.state === "unpaid" || e.state === "overdue");
  const overdue = inMonth.filter(e => e.state === "overdue");
  const expected = due.reduce((s, e) => s + Number(e.amount || 0), 0);
  document.getElementById("kcStats").innerHTML = `
    <div class="kc-stat"><strong>${inMonth.length}</strong><span>Scheduled collections</span></div>
    <div class="kc-stat"><strong>${due.length}</strong><span>Awaiting collection</span></div>
    <div class="kc-stat"><strong>${overdue.length}</strong><span>Overdue</span></div>
    <div class="kc-stat"><strong>${peso(expected)}</strong><span>Expected this month</span></div>`;

  const first = new Date(KC.viewYear, KC.viewMonth, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(KC.viewYear, KC.viewMonth + 1, 0).getDate();
  const daysPrev = new Date(KC.viewYear, KC.viewMonth, 0).getDate();

  let html = DOW.map(d => `<div class="kc-dow">${d}</div>`).join("");
  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysPrev - i, out: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, out: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - startOffset - daysInMonth + 1, out: true });

  cells.forEach(c => {
    if (c.out) { html += `<div class="kc-cell kc-out"><div class="kc-num">${c.day}</div></div>`; return; }
    const d = new Date(KC.viewYear, KC.viewMonth, c.day);
    const key = dayKey(d);
    const list = map[key] || [];
    const cls = ["kc-cell"];
    if (key === todayKey) cls.push("kc-today");
    if (key === KC.selectedKey) cls.push("kc-sel");

    let pills = "";
    if (list.length) {
      const counts = { overdue: 0, unpaid: 0, paid: 0, scheduled: 0 };
      list.forEach(e => counts[e.state] = (counts[e.state] || 0) + 1);
      const order = ["overdue", "unpaid", "paid", "scheduled"];
      pills = `<div class="kc-pills">` + order.filter(k => counts[k]).slice(0, 2)
        .map(k => `<span class="kc-pill ${k}">${counts[k]} ${k === "scheduled" ? "upcoming" : k}</span>`).join("") + `</div>`;
    }
    html += `<button type="button" class="${cls.join(" ")}" data-key="${key}"><div class="kc-num">${c.day}</div>${pills}</button>`;
  });

  grid.innerHTML = html;
  grid.querySelectorAll(".kc-cell[data-key]").forEach(cell => {
    cell.addEventListener("click", () => { KC.selectedKey = cell.dataset.key; renderCalendar(); });
  });

  renderDayList();
  const nav = document.getElementById("kcNavCount");
  if (nav) nav.textContent = String(KC.events.filter(e => !e.projected && (e.state === "unpaid" || e.state === "overdue")).length);
}

function renderDayList() {
  const wrap = document.getElementById("kcDayWrap");
  if (!wrap) return;
  if (!KC.selectedKey) { wrap.innerHTML = `<div class="kc-empty">Select a date to view its collection schedule.</div>`; return; }

  const [y, m, d] = KC.selectedKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const list = KC.events.filter(e => e.key === KC.selectedKey);

  let body = `<div class="kc-daytitle">Collections for ${fmtLong(date)}</div>`;
  if (!list.length) {
    body += `<div class="kc-empty">No scheduled collections on this date.</div>`;
    wrap.innerHTML = body;
    return;
  }

  const showCollector = KC.role !== "collector";
  const showCashier = KC.role !== "cashier";

  body += `<div class="kc-tablewrap"><table class="kc-table"><thead><tr>
      <th>Borrower</th><th>Amount</th>${showCollector ? "<th>Collector</th>" : ""}${showCashier ? "<th>Cashier</th>" : ""}<th>Status</th>
    </tr></thead><tbody>`;
  list.forEach(e => {
    const l = e.loan;
    body += `<tr data-ev="${esc(e.id)}">
      <td><div class="kc-name">${esc(l.borrowerName || "Borrower")}</div><div class="kc-sub">Loan ID: ${esc(l.id.slice(0, 10))}</div></td>
      <td class="kc-amt">${peso(e.amount)}</td>
      ${showCollector ? `<td>${esc(l.assignedCollectorName || "Unassigned")}</td>` : ""}
      ${showCashier ? `<td>${esc(l.assignedCashierName || "Unassigned")}</td>` : ""}
      <td><span class="kc-chip ${e.state}">${esc(e.status)}</span></td>
    </tr>`;
  });
  body += `</tbody></table></div><div class="kc-cards">`;
  list.forEach(e => {
    const l = e.loan;
    body += `<div class="kc-card" data-ev="${esc(e.id)}">
      <div class="kc-card-top">
        <div><div class="kc-name">${esc(l.borrowerName || "Borrower")}</div>
          <div class="kc-sub">${showCollector ? "Collector: " + esc(l.assignedCollectorName || "Unassigned") : "Cashier: " + esc(l.assignedCashierName || "Unassigned")}</div></div>
        <span class="kc-chip ${e.state}">${esc(e.status)}</span>
      </div>
      <div class="kc-amt" style="margin-top:8px">${peso(e.amount)}</div>
    </div>`;
  });
  body += `</div>`;
  wrap.innerHTML = body;

  wrap.querySelectorAll("[data-ev]").forEach(el => {
    el.addEventListener("click", () => openDetail(el.dataset.ev));
  });
}

/* ------------------------------------------------------------ detail modal */
function openDetail(evId) {
  const e = KC.events.find(x => x.id === evId);
  if (!e) return;
  const l = e.loan, s = e.sched;

  // Role-based buttons lang — walang action na bawal sa role.
  let actions = "";
  if (KC.role === "admin") {
    actions = `<button type="button" class="kc-btn kc-primary" data-go="loans">View Loan</button>`;
  } else if (KC.role === "collector") {
    actions = `<button type="button" class="kc-btn kc-primary" data-go="assigned">Open Assigned Collections</button>`;
  } else if (KC.role === "cashier") {
    actions = `<button type="button" class="kc-btn kc-primary" data-go="collected">Open Collected Loans</button>`;
  }

  const lastPay = toJsDate(l.lastPaymentAt);
  document.getElementById("kcModal").innerHTML = `
    <div class="kc-modal-head">
      <div><h3>Collection Details</h3><p>${fmtLong(e.date)}</p></div>
      <button type="button" class="kc-x" id="kcClose">✕</button>
    </div>
    <div class="kc-modal-body">
      <div class="kc-row"><span>Borrower</span><strong>${esc(l.borrowerName || "N/A")}</strong></div>
      <div class="kc-row"><span>Contact Number</span><strong>${esc(l.contactNumber || "N/A")}</strong></div>
      <div class="kc-row"><span>Address</span><strong>${esc(l.address || "N/A")}</strong></div>
      <div class="kc-row"><span>Loan Amount</span><strong>${peso(l.amount)}</strong></div>
      <div class="kc-row"><span>Total Payable</span><strong>${peso(s.totalPayable)}</strong></div>
      <div class="kc-row"><span>Remaining Balance</span><strong>${peso(l.balance)}</strong></div>
      <div class="kc-row"><span>Amount to Collect</span><strong>${peso(e.amount)}</strong></div>
      ${s.penalty > 0 && !e.projected ? `<div class="kc-row"><span>Late Penalty</span><strong style="color:var(--red)">+${peso(s.penalty)}</strong></div>` : ""}
      <div class="kc-row"><span>Due Date</span><strong>${fmtLong(e.date)}</strong></div>
      <div class="kc-row"><span>Payment Status</span><strong><span class="kc-chip ${e.state}">${esc(e.status)}</span></strong></div>
      <div class="kc-row"><span>Assigned Collector</span><strong>${esc(l.assignedCollectorName || "Unassigned")}</strong></div>
      <div class="kc-row"><span>Assigned Cashier</span><strong>${esc(l.assignedCashierName || "Unassigned")}</strong></div>
      <div class="kc-row"><span>Loan ID</span><strong style="font-size:.7rem">${esc(l.id)}</strong></div>
      ${lastPay ? `<div class="kc-row"><span>Last Payment</span><strong>${fmtShort(lastPay)}${l.lastPaymentByName ? " · " + esc(l.lastPaymentByName) : ""}</strong></div>` : ""}
      ${s.remainingMonths != null ? `<div class="kc-row"><span>Remaining Installments</span><strong>${s.remainingMonths}</strong></div>` : ""}
      ${e.projected ? `<div class="kc-row"><span></span><strong style="font-weight:600;color:var(--muted);font-size:.72rem">Upcoming installment based on the existing monthly schedule.</strong></div>` : ""}
    </div>
    <div class="kc-modal-foot">${actions}<button type="button" class="kc-btn" id="kcClose2">Close</button></div>`;

  document.getElementById("kcOverlay").classList.add("kc-open");
  document.getElementById("kcClose").addEventListener("click", closeModal);
  document.getElementById("kcClose2").addEventListener("click", closeModal);
  document.querySelectorAll("#kcModal [data-go]").forEach(b => {
    b.addEventListener("click", () => {
      const go = b.dataset.go;
      closeModal();
      try {
        if (go === "loans" && typeof window.openTab === "function") {
          window.openTab(document.querySelector('[data-tab="loans"]'), "loans");
        } else if (go === "assigned" && typeof window.showCollectorTab === "function") {
          hideCalendar(); window.showCollectorTab("assigned");
        } else if (go === "collected" && typeof window.showCashierTab === "function") {
          hideCalendar(); window.showCashierTab("collected");
        }
      } catch (err) { /* existing navigation unchanged; ignore */ }
    });
  });
}
function closeModal() { document.getElementById("kcOverlay")?.classList.remove("kc-open"); }

/* ------------------------------------------------------- notifications UI */
function togglePanel() {
  const p = document.getElementById("kcPanel");
  if (!p) return;
  p.classList.toggle("kc-open");
  if (p.classList.contains("kc-open")) renderNotifs();
}
function markAllRead() {
  KC.notifs.forEach(n => KC.readIds.add(n.id));
  saveRead(); renderNotifs(); updateBadge();
}
function updateBadge() {
  const b = document.getElementById("kcBadge");
  if (!b) return;
  const n = KC.notifs.filter(x => !KC.readIds.has(x.id)).length;
  b.textContent = n > 99 ? "99+" : String(n);
  b.classList.toggle("kc-on", n > 0);
}
function timeAgo(d) {
  const ms = new Date() - d;
  if (ms < 0) return fmtShort(d);
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  return fmtShort(d);
}
function renderNotifs() {
  const list = document.getElementById("kcNotifList");
  if (!list) return;
  if (!KC.notifs.length) {
    list.innerHTML = `<div class="kc-empty" style="margin:14px;border-radius:var(--radius-sm)">You're all caught up. No new notifications.</div>`;
    return;
  }
  list.innerHTML = KC.notifs.map(n => `
    <button type="button" class="kc-nitem ${KC.readIds.has(n.id) ? "" : "kc-unread"}" data-nid="${esc(n.id)}" data-loan="${esc(n.loanId || "")}">
      <div class="kc-nicon ${n.tone}">${BELL_SVG}</div>
      <div class="kc-ntext">
        <strong>${n.title}</strong>
        <span>${n.body}</span>
        ${n.sub ? `<span>${n.sub}</span>` : ""}
        <div class="kc-ntime">${timeAgo(n.date)} · Tap to view details</div>
      </div>
    </button>`).join("");

  list.querySelectorAll("[data-nid]").forEach(el => {
    el.addEventListener("click", () => {
      KC.readIds.add(el.dataset.nid); saveRead(); updateBadge();
      el.classList.remove("kc-unread");
      const loanId = el.dataset.loan;
      const ev = KC.events.find(e => e.loanId === loanId && !e.projected);
      document.getElementById("kcPanel")?.classList.remove("kc-open");
      if (ev) {
        KC.viewYear = ev.date.getFullYear(); KC.viewMonth = ev.date.getMonth(); KC.selectedKey = ev.key;
        showCalendar();
        openDetail(ev.id);
      } else {
        showCalendar();
      }
    });
  });
}

/* ------------------------------------------------------------ data refresh */
let refreshTimer = null;
function refresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    buildEvents();
    buildNotifications();
    if (!KC.selectedKey) KC.selectedKey = dayKey(new Date());
    renderCalendar();
    updateBadge();
    if (document.getElementById("kcPanel")?.classList.contains("kc-open")) renderNotifs();
  }, 60);
}

/* ------------------------------------------------------------------- boot */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;                   // existing auth guard na ang bahala sa redirect
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;
    const u = snap.data();
    const role = u.role;
    if (!["admin", "collector", "cashier"].includes(role)) return;

    KC.uid = user.uid;
    KC.role = role;
    KC.userName = u.assignedName || u.name || u.email || role;
    loadRead();
    loadSeenLoans();

    mountUI();

    // READ-ONLY listener sa existing "loans" collection.
    onSnapshot(collection(db, "loans"), (snap2) => {
      const rows = [];
      snap2.forEach(d => {
        const l = { id: d.id, ...d.data() };
        if (visibleToRole(l)) rows.push(l);
      });
      KC.loans = rows;
      refresh();
    }, (err) => console.warn("[Kasipag Calendar] loans listener:", err));

    // READ-ONLY listener sa existing "payments" collection (role-scoped).
    if (role === "cashier" || role === "admin") {
      onSnapshot(collection(db, "payments"), (snap3) => {
        const rows = [];
        snap3.forEach(d => {
          const p = { id: d.id, ...d.data() };
          if (p.deleted || p.deletedPermanent) return;
          if (role === "cashier" && p.cashierId !== KC.uid) return;
          rows.push(p);
        });
        rows.sort((a, b) => (toJsDate(b.createdAt) || 0) - (toJsDate(a.createdAt) || 0));
        KC.payments = rows;
        refresh();
      }, (err) => console.warn("[Kasipag Calendar] payments listener:", err));
    }
  } catch (err) {
    console.warn("[Kasipag Calendar] init skipped:", err);
  }
});

"use strict";

function parseCSV(text) {
  const rows = []; let row = [], field = "", inQ = false;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) { if (c === '"') { if (s[i+1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const clean = rows.filter(r => r.some(v => String(v).trim() !== ""));
  if (!clean.length) return [];
  const headers = clean[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, "_"));
  return clean.slice(1).map(r => { const o = {}; headers.forEach((h, idx) => { o[h] = r[idx] === undefined ? "" : String(r[idx]).trim(); }); return o; });
}
function csvEscape(v) { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function toCSV(headers, rows) { return [headers.join(",")].concat(rows.map(r => headers.map(h => csvEscape(r[h])).join(","))).join("\n") + "\n"; }
function num(v) { if (v === "" || v === null || v === undefined) return null; const n = Number(String(v).replace(/[$,]/g, "")); return isFinite(n) ? n : null; }
function round2(n) { return Math.round(n * 100) / 100; }
function parseDate(v) { if (!v) return null; const d = new Date(String(v).trim() + "T00:00:00Z"); return isNaN(d.getTime()) ? null : d; }
function fmtDate(d) { return d ? d.toISOString().slice(0, 10) : ""; }
function daysBetween(a, b) { const da = parseDate(a), db = parseDate(b); if (!da || !db) return null; return Math.round((db.getTime() - da.getTime()) / 86400000); }

function outreachText(clientRef, flags) {
  const bits = [];
  if (flags.includes("missed_draft")) bits.push("we noticed a recent scheduled deposit did not come through");
  if (flags.includes("short_draft")) bits.push("we noticed a recent deposit was lower than planned");
  if (flags.includes("settlement_funding_risk")) bits.push("an upcoming settlement payment is approaching and we want to make sure the account is ready in time");
  const reason = bits.length ? bits.join(", and ") : "we are doing a routine check-in on your program account";
  return "Hello " + (clientRef || "there") + ", this is a friendly reminder from your program team. We are writing because " + reason + ". When you have a moment, please contact us so we can review your deposit schedule together and make any helpful adjustments. Thank you.";
}
function analyzeRow(row, config) {
  const cfg = config || {};
  const threshold = cfg.thresholdPercent !== undefined ? Number(cfg.thresholdPercent) : 10;
  const windowDays = cfg.windowDays !== undefined ? Number(cfg.windowDays) : 14;
  const ref = cfg.referenceDate || "2026-01-01";
  const expected = num(row.expected_amount), actualRaw = row.actual_amount, actual = num(actualRaw);
  const balance = num(row.current_balance) || 0;
  const settleAmount = num(row.next_settlement_amount);
  const flags = [];
  const missed = actualRaw === "" || actualRaw === null || actualRaw === undefined || actual === 0;
  if (missed) flags.push("missed_draft");
  else if (expected !== null && actual !== null && actual < expected * (1 - threshold / 100)) flags.push("short_draft");
  const daysToImpact = row.next_settlement_date ? daysBetween(ref, row.next_settlement_date) : null;
  let shortfall = 0;
  if (settleAmount !== null) {
    shortfall = round2(Math.max(0, settleAmount - balance));
    if (balance < settleAmount) flags.push("balance_below_settlement");
    if (shortfall > 0 && daysToImpact !== null && daysToImpact <= windowDays) flags.push("settlement_funding_risk");
  }
  const projectedShortfall = shortfall;
  return { clientRef: row.client_ref || "", draftDate: row.draft_date || "", expectedAmount: expected, actualAmount: actual, currentBalance: balance, nextSettlementDate: row.next_settlement_date || "", nextSettlementAmount: settleAmount, daysToImpact: daysToImpact === null ? Infinity : daysToImpact, flags, projectedShortfall, outreach: flags.length ? outreachText(row.client_ref, flags) : "" };
}
function analyzeRows(rows, config) {
  const queue = (rows || []).map(r => analyzeRow(r, config)).filter(c => c.flags.length);
  queue.sort((a, b) => (a.daysToImpact - b.daysToImpact) || (b.projectedShortfall - a.projectedShortfall));
  return queue;
}
function summarize(rows, queue, config) {
  const all = (rows || []).map(r => analyzeRow(r, config || {}));
  const total = all.length;
  const successful = all.filter(c => !c.flags.includes("missed_draft")).length;
  const totalExpected = round2(all.reduce((a, c) => a + (c.expectedAmount || 0), 0));
  const totalActual = round2(all.reduce((a, c) => a + (c.actualAmount || 0), 0));
  return { totalClients: total, draftSuccessRate: total ? round2(successful * 100 / total) : 0, totalExpected, totalActual, atRiskSettlements: (queue || []).filter(c => c.flags.includes("settlement_funding_risk")).length, flaggedClients: (queue || []).length };
}
function toQueueCSV(queue) { return toCSV(["client_ref","days_to_impact","flags","projected_shortfall","next_settlement_date","next_settlement_amount","outreach"], (queue||[]).map(c => ({ client_ref: c.clientRef, days_to_impact: c.daysToImpact === Infinity ? "" : c.daysToImpact, flags: c.flags.join("; "), projected_shortfall: c.projectedShortfall, next_settlement_date: c.nextSettlementDate, next_settlement_amount: c.nextSettlementAmount, outreach: c.outreach }))); }
const api = { parseCSV, analyzeRow, analyzeRows, summarize, outreachText, toQueueCSV };
if (typeof module !== "undefined" && module.exports) { module.exports = api; }
if (typeof window !== "undefined") { window.DedicatedAccountDriftAlerts = api; }

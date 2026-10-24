const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../src/logic.js");
const cfg = { thresholdPercent:10, windowDays:14, referenceDate:"2026-01-01" };
const base = { client_ref:"Client 001", draft_date:"2026-01-01", expected_amount:"300", actual_amount:"300", current_balance:"2000", next_settlement_date:"2026-03-01", next_settlement_amount:"1500" };
test("parseCSV parses draft rows", () => { const r=L.parseCSV("client_ref,expected_amount\nClient 001,300"); assert.equal(r[0].client_ref,"Client 001"); });
test("clean client has no flags and is not queued", () => { assert.deepEqual(L.analyzeRow(base,cfg).flags,[]); assert.equal(L.analyzeRows([base],cfg).length,0); });
test("blank actual amount is a missed draft", () => { const c=L.analyzeRow({...base, actual_amount:""},cfg); assert.ok(c.flags.includes("missed_draft")); });
test("zero actual amount is a missed draft", () => { assert.ok(L.analyzeRow({...base, actual_amount:"0"},cfg).flags.includes("missed_draft")); });
test("short draft beyond 10 percent threshold flags, within does not", () => { assert.ok(L.analyzeRow({...base, actual_amount:"250"},cfg).flags.includes("short_draft")); assert.ok(!L.analyzeRow({...base, actual_amount:"280"},cfg).flags.includes("short_draft")); });
test("balance below settlement inside window flags funding risk and shortfall", () => { const c=L.analyzeRow({...base, current_balance:"500", next_settlement_date:"2026-01-10", next_settlement_amount:"1500"},cfg); assert.ok(c.flags.includes("balance_below_settlement")); assert.ok(c.flags.includes("settlement_funding_risk")); assert.equal(c.projectedShortfall,1000); });
test("settlement outside window is not a funding risk", () => { const c=L.analyzeRow({...base, current_balance:"500", next_settlement_date:"2026-03-01"},cfg); assert.ok(!c.flags.includes("settlement_funding_risk")); });
test("queue is ranked by days to impact, not balance", () => { const q=L.analyzeRows([{...base, client_ref:"Client 002", actual_amount:"", current_balance:"9000", next_settlement_date:"2026-02-01", next_settlement_amount:"100"}, {...base, client_ref:"Client 001", actual_amount:"", current_balance:"10", next_settlement_date:"2026-01-05", next_settlement_amount:"100"}],cfg); assert.equal(q[0].clientRef,"Client 001"); assert.equal(q[1].clientRef,"Client 002"); });
test("weekly summary stats", () => { const rows=[base, {...base, client_ref:"Client 002", actual_amount:""}, {...base, client_ref:"Client 003", current_balance:"100", next_settlement_date:"2026-01-08"}]; const s=L.summarize(rows, L.analyzeRows(rows,cfg), cfg); assert.equal(s.totalClients,3); assert.equal(s.draftSuccessRate,66.67); assert.equal(s.totalExpected,900); assert.equal(s.atRiskSettlements,1); });
test("outreach text is neutral and polite, queue CSV includes it", () => { const q=L.analyzeRows([{...base, actual_amount:""}],cfg); assert.ok(q[0].outreach.includes("friendly reminder")); assert.ok(q[0].outreach.includes("Client 001")); assert.ok(L.toQueueCSV(q).includes("friendly reminder")); });

test("paydayHint flags drafts just before payday", () => {
  assert.equal(L.paydayHint("2026-03-27", 30), true);
  assert.equal(L.paydayHint("2026-03-28", 30), true);
  assert.equal(L.paydayHint("2026-03-29", 30), true);
  assert.equal(L.paydayHint("2026-03-20", 30), false);
  assert.equal(L.paydayHint("2026-03-30", 30), false);
  assert.equal(L.paydayHint("2026-03-27", 0), false);
});

test("analyzeRow adds draft_before_payday when payday_day is set", () => {
  const row = {
    client_ref: "c1",
    draft_date: "2026-03-27",
    expected_amount: "100",
    actual_amount: "100",
    current_balance: "1000",
    payday_day: "30",
  };
  const out = L.analyzeRow(row, {});
  assert.ok(out.flags.indexOf("draft_before_payday") !== -1);
  assert.equal(out.paydayDay, "30");
});

# Changelog

## 1.0.0 - 2026-10-23

- Per-client drift flags: missed drafts (blank or zero actual amount), short drafts beyond a configurable threshold percent, and balances below the next settlement amount.
- Settlement funding risk: flags a projected shortfall by the settlement date, assuming no further drafts, when the settlement falls inside a configurable days-ahead window.
- Save-the-settlement work queue ranked by days to impact (days until the next settlement), not by balance, each with neutral, polite outreach task text.
- Weekly summary stats: draft success rate, total expected versus actual drafts, and the count of at-risk settlements, plus a downloadable work-queue CSV.

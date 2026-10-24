# Dedicated Account Drift Alerts
Live page: https://aamirtechs.github.io/dedicated-account-drift-alerts/

Reconciles expected versus actual dedicated-account drafts and flags the clients drifting toward a failed settlement before a payment bounces. Payments and client-success teams get a save-the-settlement queue ranked by urgency, with neutral outreach wording they can use as-is.

## Features
- Per-client drift flags: missed drafts (blank or zero actual amount), short drafts beyond a configurable threshold percent, and balances below the next settlement amount.
- Settlement funding risk: flags a projected shortfall by the settlement date, assuming no further drafts, when the settlement falls inside a configurable days-ahead window.
- Save-the-settlement work queue ranked by days to impact (days until the next settlement), not by balance, each with neutral, polite outreach task text.
- Weekly summary stats: draft success rate, total expected versus actual drafts, and the count of at-risk settlements, plus a downloadable work-queue CSV.

## How it works
Upload or paste the draft ledger CSV, set the short-draft threshold percent and the settlement funding window in days, and run the check. Flagged clients appear in a work queue ranked by days to impact, with a weekly summary and a downloadable queue CSV. Synthetic clients only (Client 001 and similar). It runs entirely in the browser.

## Privacy
Runs 100% in your browser. Your files never leave this device, nothing is uploaded,
and there is no tracking.

## Development
Core logic lives in `src/logic.js` and is shared by the page and the tests.
Run the tests with `npm test`.

## License
MIT, Copyright 2026 Amir Hussain.

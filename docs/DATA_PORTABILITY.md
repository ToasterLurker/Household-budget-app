# Zero-cost demo backups — Version 0.4

## What exists

The prototype is intentionally **fictional and browser-local**. There is no Supabase connection and no secure place for real financial information.

From Settings:

- **Download JSON backup** preserves every demo transaction and transfer; enough to reconstruct all three current fictional account balances because opening balances are fixed in the demo
- **Export activity CSV** creates a spreadsheet-readable row per transaction; transfers are clearly typed as transfers rather than spending
- **Restore JSON backup** validates the file before allowing any change, prompts before replacing all current entries, then recalculates account balances

None of these operations uploads files to a server or incurs fees.

## JSON backup format

- Marker: `"format": "household-budget-demo"`
- Schema: `"version": 1`
- `accountIds` and `openingBalancesCents` document the exact demo account layout
- `entries` contains the transactions and paired transfer records as a single logical transfer
- `exportedAt` notes export time
- **No secrets or banking identifiers should ever be entered in this app**

## Import guardrails

- Only `.json`, under 1 MB
- At most 2,000 entries
- Reject unknown versions, changed account layout, invalid dates, unsupported account IDs, invalid money amounts, duplicate IDs
- Ignore unexpected fields rather than storing arbitrary user-supplied properties
- Do not overwrite current browser data unless the user confirms
- If writing to local browser storage fails, the previous demo remains unchanged

## Spreadsheet exports

The CSV export correctly escapes commas, quotes, newlines and spreadsheet formula-like text. The `AmountUSD` column remains numeric and negative for expenses; internal transfers remain a separate type and should not be added to spending totals.

**CSV is not a restorable backup** — it does not encode all account opening balances or other schema metadata.

## Limitations and the next system

- Backups are **unencrypted**, since only fictional data should be present. Never enter actual bank balances, payment details, account numbers, personal identifiers or sensitive information in this demo.
- Browser storage can be erased by clearing site data; save JSON elsewhere if you want to keep the fictional example.
- The future real multi-user app requires **authenticated owner-authorized export**, scoped shared-account permissions and encryption or secure storage guidance appropriate for sensitive financial records.
- Supabase Free is not continuous guaranteed hosting; if that platform is used, provide free user-controlled export and test restore regularly, with a migration plan to another free/local service.

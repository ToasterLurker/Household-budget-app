"use client";

import { useState, type ChangeEvent } from "react";
import type { LedgerEntry } from "@/lib/ledger-core.mjs";
import {
  createDemoBackup, createDemoCsv, DEMO_MAX_BYTES, parseDemoBackup,
} from "@/lib/demo-portability.mjs";

type Props = {
  entries: LedgerEntry[];
  hydrated: boolean;
  onRestore: (entries: LedgerEntry[]) => boolean;
};

function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function DemoBackupTools({ entries, hydrated, onRestore }: Props) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function exportJson() {
    try {
      const json = createDemoBackup(entries);
      downloadFile("household-budget-demo-backup.json", json, "application/json;charset=utf-8");
      setStatus("A restorable demo backup was downloaded. Keep the file somewhere safe.");
    } catch {
      setStatus("Could not create the backup. The demo data may need repair.");
    }
  }

  function exportCsv() {
    try {
      downloadFile("household-budget-demo-activity.csv", createDemoCsv(entries),
        "text/csv;charset=utf-8");
      setStatus("Activity spreadsheet downloaded. A CSV cannot restore account balances; use JSON for backup.");
    } catch {
      setStatus("Could not prepare the spreadsheet export.");
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > DEMO_MAX_BYTES) {
      setStatus("That file exceeds the 1 MB limit for this demo.");
      return;
    }

    setBusy(true);
    try {
      const imported = parseDemoBackup(await file.text());
      // No changes until the user explicitly approves the destructive replacement.
      const approved = window.confirm(
        "Restore " + imported.length +
        " demo entries from this JSON backup? This REPLACES every current demo transaction. " +
        "Export your current JSON backup first if you want to keep it."
      );
      if (!approved) {
        setStatus("Restore cancelled. Your current demo is unchanged.");
      } else if (onRestore(imported)) {
        setStatus("Restore complete: " + imported.length +
          " entries loaded. All example balances were recalculated.");
      } else {
        setStatus("Could not save this backup to browser storage. Current demo was not replaced.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not read that backup.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel spaced-panel" aria-labelledby="demo-backup-title">
    <h3 id="demo-backup-title">Free backup and data portability</h3>
    <p className="muted">Save a complete, restorable copy of your fictional demo entries as JSON,
      or export a CSV spreadsheet. No account, subscription, server, or paid service is required.</p>
    <div className="backup-actions">
      <button type="button" className="action-button" disabled={!hydrated || busy}
        onClick={exportJson}>Download JSON backup</button>
      <button type="button" className="action-button secondary-action" disabled={!hydrated || busy}
        onClick={exportCsv}>Export activity CSV</button>
    </div>
    <div className="import-control">
      <label htmlFor="demo-restore-file">Restore a JSON backup</label>
      <input id="demo-restore-file" type="file" accept=".json,application/json"
        disabled={!hydrated || busy} onChange={importBackup} />
      <p className="muted">Restoring replaces the current demo, after you confirm. CSV export is for
        spreadsheets only and cannot be imported as a backup.</p>
    </div>
    <p className="form-feedback" role="status" aria-live="polite">{status}</p>
    <p className="footnote"><strong>Demo-only warning:</strong> Backups are not encrypted.
      Do not enter real financial, identity, or bank data in this prototype.</p>
  </section>;
}

import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./db";

// Sauvegarde quotidienne : copie cohérente de la base (VACUUM INTO), datée, gardée 30 jours.

export function backupNow(db: Db, dataDir: string, now = new Date()) {
  const dir = join(dataDir, "backups");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `mijote-${now.toISOString().slice(0, 10)}.sqlite`);
  rmSync(file, { force: true });
  db.sqlite.prepare("VACUUM INTO ?").run(file);
  for (const name of readdirSync(dir)) {
    const day = name.match(/^mijote-(\d{4}-\d{2}-\d{2})\.sqlite$/)?.[1];
    if (day && now.getTime() - Date.parse(day) > 30 * 86_400_000) rmSync(join(dir, name), { force: true });
  }
  return file;
}

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Base SQLite (un fichier, data/mijote.sqlite). L'état du foyer est un document versionné,
// modifié uniquement par des actions (journal gardé 30 jours) : voir packages/shared/src/state.ts.

/** L'état du foyer, à sa dernière version (une seule ligne, id = 1). */
export const householdState = sqliteTable("household_state", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull(),
  json: text("json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Journal des actions appliquées, dans l'ordre. actionId rend un renvoi sans effet. */
export const actionLog = sqliteTable("action_log", {
  version: integer("version").primaryKey(),
  actionId: text("action_id").notNull().unique(),
  clientId: text("client_id").notNull(),
  memberId: text("member_id"),
  type: text("type").notNull(),
  payload: text("payload").notNull(),
  at: text("at").notNull(),
});

/** Un appareil du foyer (« Le téléphone de Tom »). */
export const member = sqliteTable("member", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
  lastSeen: text("last_seen").notNull(),
});

/** Session d'un appareil : on garde l'empreinte du jeton, jamais le jeton. */
export const session = sqliteTable("session", {
  tokenHash: text("token_hash").primaryKey(),
  memberId: text("member_id").notNull(),
  expiresAt: text("expires_at").notNull(),
});

/** Petites valeurs du serveur : mémoire de la synchro Home Assistant, appels IA du jour. */
export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS household_state (id INTEGER PRIMARY KEY, version INTEGER NOT NULL, json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS action_log (version INTEGER PRIMARY KEY, action_id TEXT NOT NULL UNIQUE, client_id TEXT NOT NULL, member_id TEXT, type TEXT NOT NULL, payload TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS member (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, created_at TEXT NOT NULL, last_seen TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS session (token_hash TEXT PRIMARY KEY, member_id TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

export type Db = ReturnType<typeof openDb>;

/** Ouvre (et crée au besoin) la base. ":memory:" pour les tests. */
export function openDb(dataDir: string | ":memory:") {
  let file = ":memory:";
  if (dataDir !== ":memory:") {
    mkdirSync(dataDir, { recursive: true });
    file = join(dataDir, "mijote.sqlite");
  }
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.exec(SCHEMA);
  return { sqlite, orm: drizzle(sqlite), file };
}

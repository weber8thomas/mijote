import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { member, session, type Db } from "./db";

// Foyer : une phrase secrète, demandée une fois par téléphone. Ensuite, un cookie de session longue durée
// (on ne garde en base que l'empreinte du jeton).

export const COOKIE = "mijote_session";
const YEAR = 365 * 86_400_000;

const sha256 = (s: string) => createHash("sha256").update(s).digest();
const hex = (s: string) => sha256(s).toString("hex");

/** Comparaison en temps constant (les deux empreintes ont la même longueur). */
export const samePassphrase = (given: string, expected: string) => timingSafeEqual(sha256(given.trim()), sha256(expected.trim()));

export type Member = { id: string; displayName: string };

export function createSession(db: Db, displayName: string, now = new Date()) {
  const id = randomBytes(9).toString("base64url");
  const token = randomBytes(32).toString("base64url");
  const at = now.toISOString();
  db.orm.insert(member).values({ id, displayName, createdAt: at, lastSeen: at }).run();
  const expiresAt = new Date(now.getTime() + YEAR);
  db.orm.insert(session).values({ tokenHash: hex(token), memberId: id, expiresAt: expiresAt.toISOString() }).run();
  return { token, expiresAt, member: { id, displayName } satisfies Member };
}

export function memberOf(db: Db, token: string | undefined, now = new Date()): Member | undefined {
  if (!token) return undefined;
  const row = db.orm
    .select({ id: member.id, displayName: member.displayName })
    .from(session)
    .innerJoin(member, eq(member.id, session.memberId))
    .where(and(eq(session.tokenHash, hex(token)), gt(session.expiresAt, now.toISOString())))
    .get();
  if (row) db.orm.update(member).set({ lastSeen: now.toISOString() }).where(eq(member.id, row.id)).run();
  return row;
}

export function endSession(db: Db, token: string) {
  db.orm.delete(session).where(eq(session.tokenHash, hex(token))).run();
}

export const listMembers = (db: Db) => db.orm.select().from(member).all();

export function renameMember(db: Db, id: string, displayName: string) {
  db.orm.update(member).set({ displayName }).where(eq(member.id, id)).run();
}

/** Retire un appareil du foyer : ses sessions ne marchent plus. */
export function removeMember(db: Db, id: string) {
  db.orm.delete(session).where(eq(session.memberId, id)).run();
  db.orm.delete(member).where(eq(member.id, id)).run();
}

/** Limite les essais de phrase secrète : 10 par quart d'heure et par adresse. */
export function rateLimiter(max = 10, windowMs = 15 * 60_000) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()) => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    return recent.length <= max;
  };
}

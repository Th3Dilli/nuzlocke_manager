import Database from 'better-sqlite3'
import {mkdirSync} from 'fs'
import {join} from 'path'
import {log} from "@/app/lib/logger";

const dbPath = process.env.DB_PATH ?? join(process.cwd(), 'database', 'nuzlocke.db')
mkdirSync(join(dbPath, '..'), {recursive: true})

declare global {
    var databaseInst: Database.Database | undefined
}

const database = globalThis.databaseInst ??= new Database(dbPath)

log("INFO", `Database: ${dbPath}`);

database.exec(`
    CREATE TABLE IF NOT EXISTS stats
    (
        user  TEXT PRIMARY KEY,
        team1 TEXT,
        team2 TEXT,
        team3 TEXT,
        team4 TEXT,
        team5 TEXT,
        team6 TEXT
    );

    CREATE TABLE IF NOT EXISTS users
    (
        twitch_id         TEXT PRIMARY KEY,
        username          TEXT UNIQUE NOT NULL,
        role              INTEGER     NOT NULL DEFAULT 0,
        page_enabled      BOOLEAN     NOT NULL DEFAULT false,
        api_token         TEXT                 DEFAULT NULL,
        profile_image_url TEXT        NOT NULL,
        created_at        TEXT        NOT NULL,
        updated_at        TEXT        NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions
    (
        id         TEXT PRIMARY KEY,
        twitch_id  TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
    );
`)


export const upsertUser = database.prepare<{ twitch_id: string; username: string; profile_image_url: string; now: string }>(`
    INSERT INTO users (twitch_id, username, role, page_enabled, api_token, profile_image_url, created_at, updated_at)
    VALUES (@twitch_id, @username, 0, false, NULL, @profile_image_url, @now, @now)
    ON CONFLICT(twitch_id) DO UPDATE SET username   = excluded.username,
                                         updated_at = excluded.updated_at,
                                         profile_image_url = excluded.profile_image_url
`)

export const updateToken = database.prepare<{ twitch_id: string; api_token: string; now: string }>(`
    UPDATE users
    SET api_token  = @api_token,
        updated_at = @now
    WHERE twitch_id = @twitch_id
`)


export const updatePageEnabled = database.prepare<{ twitch_id: string; page_enabled: number; now: string }>(`
    UPDATE users
    SET page_enabled  = @page_enabled,
        updated_at = @now
    WHERE twitch_id = @twitch_id
`)

export const selectUser = database.prepare<[string]>(`SELECT *
                                                      FROM users
                                                      WHERE twitch_id = ?`)

export const selectUsers = database.prepare(`SELECT twitch_id, username, role, page_enabled, profile_image_url, created_at, updated_at
                                                      FROM users`)

export const getUserToken = database.prepare(`SELECT username, api_token
                                              FROM users WHERE page_enabled == true`)

export const insertSession = database.prepare<{ id: string; twitch_id: string; created_at: string; expires_at: string }>(`
    INSERT INTO sessions (id, twitch_id, created_at, expires_at)
    VALUES (@id, @twitch_id, @created_at, @expires_at)
`)

export const selectSession = database.prepare<[string]>(`SELECT *
                                                         FROM sessions
                                                         WHERE id = ?`)

export const deleteSession = database.prepare<[string]>(`DELETE
                                                         FROM sessions
                                                         WHERE id = ?`)

export const deleteExpiredSessions = database.prepare<[string]>(`DELETE
                                                                FROM sessions
                                                                WHERE expires_at < ?`)

export const upsertStmt = database.prepare(`
    INSERT INTO stats (user, team1, team2, team3, team4, team5, team6)
    VALUES (@user, @team1, @team2, @team3, @team4, @team5, @team6)
    ON CONFLICT(user) DO UPDATE SET user=excluded.user,team1=excluded.team1,team2=excluded.team2,team3=excluded.team3,team4=excluded.team4,team5=excluded.team5,team6=excluded.team6
`);

export const selectStmt = database.prepare(`SELECT *
                                            FROM stats
                                            WHERE user = ?`);

export default database

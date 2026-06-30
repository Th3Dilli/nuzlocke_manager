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
    CREATE TABLE IF NOT EXISTS nuzlocke
    (
        user      TEXT PRIMARY KEY,
        team      TEXT NOT NULL DEFAULT '[]',
        graveyard TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS soullink
    (
        user      TEXT PRIMARY KEY,
        team1      TEXT NOT NULL DEFAULT '[]',
        team2      TEXT NOT NULL DEFAULT '[]',
        graveyard1 TEXT NOT NULL DEFAULT '[]',
        graveyard2 TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS users
    (
        twitch_id         TEXT PRIMARY KEY,
        username          TEXT UNIQUE NOT NULL,
        role              INTEGER     NOT NULL DEFAULT 0,
        nuzlocke_enabled      BOOLEAN     NOT NULL DEFAULT false,
        soullink_enabled      BOOLEAN     NOT NULL DEFAULT false,
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

    CREATE TABLE IF NOT EXISTS team_editors
    (
        owner      TEXT    NOT NULL,
        editor     TEXT    NOT NULL,
        can_manage INTEGER NOT NULL DEFAULT 0,
        created_at TEXT    NOT NULL,
        PRIMARY KEY (owner, editor)
    );
`)

// Migration: older databases were created before `can_manage` existed.
const teamEditorColumns = database.prepare(`PRAGMA table_info(team_editors)`).all() as Array<{ name: string }>
if (!teamEditorColumns.some(c => c.name === 'can_manage')) {
    database.exec(`ALTER TABLE team_editors ADD COLUMN can_manage INTEGER NOT NULL DEFAULT 0`)
}


export const upsertUser = database.prepare<{ twitch_id: string; username: string; profile_image_url: string; now: string }>(`
    INSERT INTO users (twitch_id, username, role, nuzlocke_enabled, soullink_enabled, api_token, profile_image_url, created_at, updated_at)
    VALUES (@twitch_id, @username, 0, false, false, NULL, @profile_image_url, @now, @now)
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


export const updatePageEnabled = database.prepare<{ twitch_id: string; nuzlocke_enabled: number;soullink_enabled: number; now: string }>(`
    UPDATE users
    SET nuzlocke_enabled  = @nuzlocke_enabled,
        soullink_enabled  = @soullink_enabled,
        updated_at = @now
    WHERE twitch_id = @twitch_id
`)

export const selectUser = database.prepare<[string]>(`SELECT *
                                                      FROM users
                                                      WHERE twitch_id = ?`)

export const selectUserByUsername = database.prepare<[string]>(`SELECT *
                                                      FROM users
                                                      WHERE username = ?`)

export const selectUsers = database.prepare(`SELECT twitch_id, username, role, nuzlocke_enabled, profile_image_url, created_at, updated_at
                                                      FROM users`)

export const getUserToken = database.prepare(`SELECT username, api_token
                                              FROM users WHERE nuzlocke_enabled == true OR soullink_enabled == true`)

export const getSoullinkEnabledUsers = database.prepare(`SELECT username
                                                         FROM users
                                                         WHERE soullink_enabled == true`)

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

export const upsertStmt = database.prepare<{ user: string; team: string; graveyard: string }>(`
    INSERT INTO nuzlocke (user, team, graveyard)
    VALUES (@user, @team, @graveyard)
    ON CONFLICT(user) DO UPDATE SET team      = excluded.team,
                                    graveyard = excluded.graveyard
`);

export const selectStmt = database.prepare(`SELECT *
                                            FROM nuzlocke
                                            WHERE user = ?`);

export const upsertSoullinkStmt = database.prepare<{ user: string; team1: string; team2: string; graveyard1: string; graveyard2: string }>(`
    INSERT INTO soullink (user, team1, team2, graveyard1, graveyard2)
    VALUES (@user, @team1, @team2, @graveyard1, @graveyard2)
    ON CONFLICT(user) DO UPDATE SET team1      = excluded.team1,
                                     team2      = excluded.team2,
                                     graveyard1 = excluded.graveyard1,
                                     graveyard2 = excluded.graveyard2
`);

export const selectSoullinkStmt = database.prepare(`SELECT *
                                                    FROM soullink
                                                    WHERE user = ?`);

export const insertTeamEditor = database.prepare<{ owner: string; editor: string; can_manage: number; created_at: string }>(`
    INSERT INTO team_editors (owner, editor, can_manage, created_at)
    VALUES (@owner, @editor, @can_manage, @created_at)
    ON CONFLICT(owner, editor) DO NOTHING
`);

export const deleteTeamEditor = database.prepare<{ owner: string; editor: string }>(`
    DELETE FROM team_editors WHERE owner = @owner AND editor = @editor
`);

export const updateTeamEditorRole = database.prepare<{ owner: string; editor: string; can_manage: number }>(`
    UPDATE team_editors
    SET can_manage = @can_manage
    WHERE owner = @owner AND editor = @editor
`);

export const selectTeamEditors = database.prepare<[string]>(`SELECT editor, can_manage
                                                            FROM team_editors
                                                            WHERE owner = ?
                                                            ORDER BY editor`);

export const selectTeamEditor = database.prepare<[string, string]>(`SELECT 1
                                                                   FROM team_editors
                                                                   WHERE owner = ?
                                                                     AND editor = ?`)

export const selectTeamEditorRole = database.prepare<[string, string]>(`SELECT can_manage
                                                                   FROM team_editors
                                                                   WHERE owner = ?
                                                                     AND editor = ?`)

export const selectEditingFor = database.prepare<[string]>(`SELECT owner
                                                            FROM team_editors
                                                            WHERE editor = ?
                                                            ORDER BY owner`);

export default database

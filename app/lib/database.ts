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
        graveyard TEXT NOT NULL DEFAULT '[]',
        badges    TEXT NOT NULL DEFAULT '[]',
        settings  TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS soullink
    (
        user       TEXT PRIMARY KEY,
        team1      TEXT NOT NULL DEFAULT '[]',
        team2      TEXT NOT NULL DEFAULT '[]',
        graveyard1 TEXT NOT NULL DEFAULT '[]',
        graveyard2 TEXT NOT NULL DEFAULT '[]',
        badges     TEXT NOT NULL DEFAULT '[]',
        settings   TEXT NOT NULL DEFAULT '{}',
        encounters TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS users
    (
        twitch_id         TEXT PRIMARY KEY,
        username          TEXT UNIQUE NOT NULL,
        role              INTEGER     NOT NULL DEFAULT 0,
        nuzlocke_enabled      BOOLEAN     NOT NULL DEFAULT false,
        soullink_enabled      BOOLEAN     NOT NULL DEFAULT false,
        nuzlocke_token    TEXT UNIQUE          DEFAULT NULL,
        soullink_token    TEXT UNIQUE          DEFAULT NULL,
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
        owner       TEXT    NOT NULL,
        editor      TEXT    NOT NULL,
        editor_name TEXT,
        can_manage  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL,
        PRIMARY KEY (owner, editor)
    );
`)

// CREATE TABLE IF NOT EXISTS is a no-op on a database that already has the
// `soullink` table from before the `encounters` column existed, so add it
// here for databases that were provisioned with the older schema.
const soullinkColumns = database.prepare("PRAGMA table_info(soullink)").all() as Array<{ name: string }>;
if (!soullinkColumns.some(c => c.name === "encounters")) {
    database.exec("ALTER TABLE soullink ADD COLUMN encounters TEXT NOT NULL DEFAULT '[]'");
}

export const upsertUser = database.prepare<{ twitch_id: string; username: string; profile_image_url: string; now: string }>(`
    INSERT INTO users (twitch_id, username, role, nuzlocke_enabled, soullink_enabled, nuzlocke_token, soullink_token, profile_image_url, created_at, updated_at)
    VALUES (@twitch_id, @username, 0, false, false, NULL, NULL, @profile_image_url, @now, @now)
    ON CONFLICT(twitch_id) DO UPDATE SET username   = excluded.username,
                                         updated_at = excluded.updated_at,
                                         profile_image_url = excluded.profile_image_url
`)

export const updateNuzlockeToken = database.prepare<{ twitch_id: string; nuzlocke_token: string; now: string }>(`
    UPDATE users
    SET nuzlocke_token = @nuzlocke_token,
        updated_at     = @now
    WHERE twitch_id = @twitch_id
`)

export const updateSoullinkToken = database.prepare<{ twitch_id: string; soullink_token: string; now: string }>(`
    UPDATE users
    SET soullink_token = @soullink_token,
        updated_at     = @now
    WHERE twitch_id = @twitch_id
`)

export const selectUserByNuzlockeToken = database.prepare<[string]>(`SELECT *
                                                                     FROM users
                                                                     WHERE nuzlocke_token = ?`)

export const selectUserBySoullinkToken = database.prepare<[string]>(`SELECT *
                                                                     FROM users
                                                                     WHERE soullink_token = ?`)


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

export const selectUsers = database.prepare(`SELECT twitch_id, username, role, nuzlocke_enabled, soullink_enabled, profile_image_url, created_at, updated_at
                                                      FROM users`)

export const getNuzlockeEnabledUsers = database.prepare(`SELECT username
                                                         FROM users
                                                         WHERE nuzlocke_enabled == true`)

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

export const upsertStmt = database.prepare<{
    user: string;
    team: string;
    graveyard: string;
    badges: string;
    settings: string;
}>(`
    INSERT INTO nuzlocke (user, team, graveyard, badges, settings)
    VALUES (@user, @team, @graveyard, @badges, @settings)
    ON CONFLICT(user) DO UPDATE SET team      = excluded.team,
                                    graveyard = excluded.graveyard,
                                    badges    = excluded.badges,
                                    settings  = excluded.settings
`);

export const selectStmt = database.prepare(`SELECT *
                                            FROM nuzlocke
                                            WHERE user = ?`);

export const upsertSoullinkStmt = database.prepare<{
    user: string;
    team1: string;
    team2: string;
    graveyard1: string;
    graveyard2: string;
    badges: string;
    settings: string;
    encounters: string;
}>(`
    INSERT INTO soullink (user, team1, team2, graveyard1, graveyard2, badges, settings, encounters)
    VALUES (@user, @team1, @team2, @graveyard1, @graveyard2, @badges, @settings, @encounters)
    ON CONFLICT(user) DO UPDATE SET team1      = excluded.team1,
                                     team2      = excluded.team2,
                                     graveyard1 = excluded.graveyard1,
                                     graveyard2 = excluded.graveyard2,
                                     badges     = excluded.badges,
                                     settings   = excluded.settings,
                                     encounters = excluded.encounters
`);

export const selectSoullinkStmt = database.prepare(`SELECT *
                                                    FROM soullink
                                                    WHERE user = ?`);

export const insertTeamEditor = database.prepare<{ owner: string; editor: string; editor_name: string; can_manage: number; created_at: string }>(`
    INSERT INTO team_editors (owner, editor, editor_name, can_manage, created_at)
    VALUES (@owner, @editor, @editor_name, @can_manage, @created_at)
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

export const selectTeamEditors = database.prepare<[string]>(`SELECT team_editors.editor                                                AS editor,
                                                                     team_editors.can_manage                                            AS can_manage,
                                                                     COALESCE(users.username, team_editors.editor_name, team_editors.editor) AS editor_name
                                                            FROM team_editors
                                                                     LEFT JOIN users ON users.twitch_id = team_editors.editor
                                                            WHERE owner = ?
                                                            ORDER BY editor_name`);

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

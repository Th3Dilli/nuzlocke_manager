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
        user                 TEXT PRIMARY KEY,
        team                 TEXT    NOT NULL DEFAULT '[]',
        graveyard            TEXT    NOT NULL DEFAULT '[]',
        badges               TEXT    NOT NULL DEFAULT '[]',
        show_nuzlocke_label  INTEGER NOT NULL DEFAULT 1,
        nuzlocke_label       TEXT    NOT NULL DEFAULT 'Nuzlocke',
        show_trainer_label   INTEGER NOT NULL DEFAULT 1,
        trainer_label        TEXT    NOT NULL DEFAULT 'Trainer',
        show_team_label      INTEGER NOT NULL DEFAULT 1,
        team_label           TEXT    NOT NULL DEFAULT 'Team',
        show_graveyard_label INTEGER NOT NULL DEFAULT 1,
        graveyard_label      TEXT    NOT NULL DEFAULT 'Graveyard',
        main_width           INTEGER NOT NULL DEFAULT 1200,
        cam_mode             TEXT    NOT NULL DEFAULT '1',
        frame_border_color   TEXT    NOT NULL DEFAULT '#f87171',
        team_color           TEXT    NOT NULL DEFAULT '#eab308',
        graveyard_color      TEXT    NOT NULL DEFAULT '#eab308',
        text_color           TEXT    NOT NULL DEFAULT '#fde047'
    );

    CREATE TABLE IF NOT EXISTS soullink
    (
        user                   TEXT PRIMARY KEY,
        team1                  TEXT    NOT NULL DEFAULT '[]',
        team2                  TEXT    NOT NULL DEFAULT '[]',
        graveyard1             TEXT    NOT NULL DEFAULT '[]',
        graveyard2             TEXT    NOT NULL DEFAULT '[]',
        badges                 TEXT    NOT NULL DEFAULT '[]',
        show_soullink1_label   INTEGER NOT NULL DEFAULT 1,
        soullink1_label        TEXT    NOT NULL DEFAULT 'Soul Link 1',
        show_soullink2_label   INTEGER NOT NULL DEFAULT 1,
        soullink2_label        TEXT    NOT NULL DEFAULT 'Soul Link 2',
        show_trainer1_label    INTEGER NOT NULL DEFAULT 1,
        trainer1_label         TEXT    NOT NULL DEFAULT 'Trainer 1',
        show_trainer2_label    INTEGER NOT NULL DEFAULT 1,
        trainer2_label         TEXT    NOT NULL DEFAULT 'Trainer 2',
        show_team1_label       INTEGER NOT NULL DEFAULT 1,
        team1_label            TEXT    NOT NULL DEFAULT 'Team 1',
        show_team2_label       INTEGER NOT NULL DEFAULT 1,
        team2_label            TEXT    NOT NULL DEFAULT 'Team 2',
        show_graveyard1_label  INTEGER NOT NULL DEFAULT 1,
        graveyard1_label       TEXT    NOT NULL DEFAULT 'Graveyard 1',
        show_graveyard2_label  INTEGER NOT NULL DEFAULT 1,
        graveyard2_label       TEXT    NOT NULL DEFAULT 'Graveyard 2',
        frame_border_color     TEXT    NOT NULL DEFAULT '#f87171',
        team_color             TEXT    NOT NULL DEFAULT '#eab308',
        graveyard_color        TEXT    NOT NULL DEFAULT '#eab308',
        text_color             TEXT    NOT NULL DEFAULT '#fde047'
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
        owner       TEXT    NOT NULL,
        editor      TEXT    NOT NULL,
        editor_name TEXT,
        can_manage  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL,
        PRIMARY KEY (owner, editor)
    );
`)

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

export const selectUsers = database.prepare(`SELECT twitch_id, username, role, nuzlocke_enabled, soullink_enabled, profile_image_url, created_at, updated_at
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

export const upsertStmt = database.prepare<{
    user: string;
    team: string;
    graveyard: string;
    badges: string;
    show_nuzlocke_label: number;
    nuzlocke_label: string;
    show_trainer_label: number;
    trainer_label: string;
    show_team_label: number;
    team_label: string;
    show_graveyard_label: number;
    graveyard_label: string;
    main_width: number;
    cam_mode: string;
    frame_border_color: string;
    team_color: string;
    graveyard_color: string;
    text_color: string;
}>(`
    INSERT INTO nuzlocke (user, team, graveyard, badges, show_nuzlocke_label, nuzlocke_label, show_trainer_label,
                           trainer_label, show_team_label, team_label, show_graveyard_label, graveyard_label,
                           main_width, cam_mode, frame_border_color, team_color, graveyard_color, text_color)
    VALUES (@user, @team, @graveyard, @badges, @show_nuzlocke_label, @nuzlocke_label, @show_trainer_label,
            @trainer_label, @show_team_label, @team_label, @show_graveyard_label, @graveyard_label,
            @main_width, @cam_mode, @frame_border_color, @team_color, @graveyard_color, @text_color)
    ON CONFLICT(user) DO UPDATE SET team                 = excluded.team,
                                    graveyard            = excluded.graveyard,
                                    badges               = excluded.badges,
                                    show_nuzlocke_label  = excluded.show_nuzlocke_label,
                                    nuzlocke_label       = excluded.nuzlocke_label,
                                    show_trainer_label   = excluded.show_trainer_label,
                                    trainer_label        = excluded.trainer_label,
                                    show_team_label      = excluded.show_team_label,
                                    team_label           = excluded.team_label,
                                    show_graveyard_label = excluded.show_graveyard_label,
                                    graveyard_label      = excluded.graveyard_label,
                                    main_width           = excluded.main_width,
                                    cam_mode             = excluded.cam_mode,
                                    frame_border_color   = excluded.frame_border_color,
                                    team_color           = excluded.team_color,
                                    graveyard_color      = excluded.graveyard_color,
                                    text_color           = excluded.text_color
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
    show_soullink1_label: number;
    soullink1_label: string;
    show_soullink2_label: number;
    soullink2_label: string;
    show_trainer1_label: number;
    trainer1_label: string;
    show_trainer2_label: number;
    trainer2_label: string;
    show_team1_label: number;
    team1_label: string;
    show_team2_label: number;
    team2_label: string;
    show_graveyard1_label: number;
    graveyard1_label: string;
    show_graveyard2_label: number;
    graveyard2_label: string;
    frame_border_color: string;
    team_color: string;
    graveyard_color: string;
    text_color: string;
}>(`
    INSERT INTO soullink (user, team1, team2, graveyard1, graveyard2, badges, show_soullink1_label, soullink1_label,
                           show_soullink2_label, soullink2_label, show_trainer1_label, trainer1_label,
                           show_trainer2_label, trainer2_label, show_team1_label, team1_label,
                           show_team2_label, team2_label, show_graveyard1_label, graveyard1_label,
                           show_graveyard2_label, graveyard2_label,
                           frame_border_color, team_color, graveyard_color, text_color)
    VALUES (@user, @team1, @team2, @graveyard1, @graveyard2, @badges, @show_soullink1_label, @soullink1_label,
            @show_soullink2_label, @soullink2_label, @show_trainer1_label, @trainer1_label,
            @show_trainer2_label, @trainer2_label, @show_team1_label, @team1_label,
            @show_team2_label, @team2_label, @show_graveyard1_label, @graveyard1_label,
            @show_graveyard2_label, @graveyard2_label,
            @frame_border_color, @team_color, @graveyard_color, @text_color)
    ON CONFLICT(user) DO UPDATE SET team1                 = excluded.team1,
                                     team2                 = excluded.team2,
                                     graveyard1            = excluded.graveyard1,
                                     graveyard2            = excluded.graveyard2,
                                     badges                = excluded.badges,
                                     show_soullink1_label  = excluded.show_soullink1_label,
                                     soullink1_label       = excluded.soullink1_label,
                                     show_soullink2_label  = excluded.show_soullink2_label,
                                     soullink2_label       = excluded.soullink2_label,
                                     show_trainer1_label   = excluded.show_trainer1_label,
                                     trainer1_label        = excluded.trainer1_label,
                                     show_trainer2_label   = excluded.show_trainer2_label,
                                     trainer2_label        = excluded.trainer2_label,
                                     show_team1_label      = excluded.show_team1_label,
                                     team1_label           = excluded.team1_label,
                                     show_team2_label      = excluded.show_team2_label,
                                     team2_label           = excluded.team2_label,
                                     show_graveyard1_label = excluded.show_graveyard1_label,
                                     graveyard1_label      = excluded.graveyard1_label,
                                     show_graveyard2_label = excluded.show_graveyard2_label,
                                     graveyard2_label      = excluded.graveyard2_label,
                                     frame_border_color    = excluded.frame_border_color,
                                     team_color            = excluded.team_color,
                                     graveyard_color       = excluded.graveyard_color,
                                     text_color            = excluded.text_color
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

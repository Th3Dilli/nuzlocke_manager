import {
    deleteTeamEditor,
    insertTeamEditor,
    selectEditingFor,
    selectTeamEditor,
    selectTeamEditorRole,
    selectTeamEditors,
    updateTeamEditorRole,
} from "@/app/lib/database";

// Editors are extra Twitch users an owner has granted permission to edit their
// team. Grants are stored by the editor's stable Twitch user id (resolved via
// the Twitch API at grant time), not their username, so a grant survives the
// editor renaming their Twitch channel and can even be created before that
// user has ever logged into this site. An editor can additionally be flagged
// as a "manager", letting them add/remove other (non-manager) editors on the
// owner's behalf.

export type TeamEditor = { editorId: string; editorName: string; canManage: boolean }

// Identity of the currently signed-in user, as needed to check permissions:
// username for the owner-equality shortcut, twitch_id for the actual grant lookup.
export type SessionIdentity = { username: string; twitch_id: string }

export function getTeamEditors(owner: string): TeamEditor[] {
    return (selectTeamEditors.all(owner) as Array<{ editor: string; editor_name: string | null; can_manage: number }>)
        .map(r => ({editorId: r.editor, editorName: r.editor_name ?? r.editor, canManage: r.can_manage === 1}));
}

// Owners whose team `editorId` (the editor's Twitch id) has been granted permission to edit.
export function getEditingFor(editorId: string): string[] {
    return (selectEditingFor.all(editorId) as Array<{ owner: string }>).map(r => r.owner);
}

export function addTeamEditor(owner: string, editorId: string, editorName: string, canManage = false): void {
    insertTeamEditor.run({owner, editor: editorId, editor_name: editorName, can_manage: canManage ? 1 : 0, created_at: new Date().toISOString()});
}

export function removeTeamEditor(owner: string, editorId: string): void {
    deleteTeamEditor.run({owner, editor: editorId});
}

export function setTeamEditorRole(owner: string, editorId: string, canManage: boolean): void {
    updateTeamEditorRole.run({owner, editor: editorId, can_manage: canManage ? 1 : 0});
}

// Whether `user` may edit `owner`'s team: the owner always can, plus anyone the
// owner has explicitly granted.
export function canEditTeam(owner: string, user: SessionIdentity): boolean {
    if (owner === user.username) return true;
    return selectTeamEditor.get(owner, user.twitch_id) !== undefined;
}

function isManager(owner: string, editorId: string): boolean {
    const row = selectTeamEditorRole.get(owner, editorId) as { can_manage: number } | undefined;
    return row?.can_manage === 1;
}

// Whether `user` may add/remove editors for `owner`'s page: the owner always
// can, plus any editor explicitly granted manage permission.
export function canManageEditors(owner: string, user: SessionIdentity): boolean {
    if (owner === user.username) return true;
    return isManager(owner, user.twitch_id);
}

// Whether `editorId` currently holds manage permission for `owner`'s page.
// Distinct from canManageEditors: this is a plain role check with no
// owner-is-always-allowed shortcut, used to decide whether a manager (as
// opposed to the owner) is allowed to remove that specific editor.
export function isTeamEditorManager(owner: string, editorId: string): boolean {
    return isManager(owner, editorId);
}

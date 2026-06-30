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
// team. Grants are stored by Twitch username (lowercase login); they take
// effect whenever that user is logged in, regardless of whether they had
// signed up at the time the grant was created. An editor can additionally be
// flagged as a "manager", letting them add/remove other (non-manager)
// editors on the owner's behalf.

export type TeamEditor = { editor: string; canManage: boolean }

export function getTeamEditors(owner: string): TeamEditor[] {
    return (selectTeamEditors.all(owner) as Array<{ editor: string; can_manage: number }>)
        .map(r => ({editor: r.editor, canManage: r.can_manage === 1}));
}

// Owners whose team `editor` has been granted permission to edit.
export function getEditingFor(editor: string): string[] {
    return (selectEditingFor.all(editor) as Array<{ owner: string }>).map(r => r.owner);
}

export function addTeamEditor(owner: string, editor: string, canManage = false): void {
    insertTeamEditor.run({owner, editor, can_manage: canManage ? 1 : 0, created_at: new Date().toISOString()});
}

export function removeTeamEditor(owner: string, editor: string): void {
    deleteTeamEditor.run({owner, editor});
}

export function setTeamEditorRole(owner: string, editor: string, canManage: boolean): void {
    updateTeamEditorRole.run({owner, editor, can_manage: canManage ? 1 : 0});
}

// Whether `user` may edit `owner`'s team: the owner always can, plus anyone the
// owner has explicitly granted.
export function canEditTeam(owner: string, user: string): boolean {
    if (owner === user) return true;
    return selectTeamEditor.get(owner, user) !== undefined;
}

function isManager(owner: string, editor: string): boolean {
    const row = selectTeamEditorRole.get(owner, editor) as { can_manage: number } | undefined;
    return row?.can_manage === 1;
}

// Whether `user` may add/remove editors for `owner`'s page: the owner always
// can, plus any editor explicitly granted manage permission.
export function canManageEditors(owner: string, user: string): boolean {
    if (owner === user) return true;
    return isManager(owner, user);
}

// Whether `editor` currently holds manage permission for `owner`'s page.
// Distinct from canManageEditors: this is a plain role check with no
// owner-is-always-allowed shortcut, used to decide whether a manager (as
// opposed to the owner) is allowed to remove that specific editor.
export function isTeamEditorManager(owner: string, editor: string): boolean {
    return isManager(owner, editor);
}

import {deleteTeamEditor, insertTeamEditor, selectEditingFor, selectTeamEditor, selectTeamEditors} from "@/app/lib/database";

// Editors are extra Twitch users an owner has granted permission to edit their
// team. Grants are stored by Twitch username (lowercase login); they take
// effect whenever that user is logged in, regardless of whether they had
// signed up at the time the grant was created.

export function getTeamEditors(owner: string): string[] {
    return (selectTeamEditors.all(owner) as Array<{ editor: string }>).map(r => r.editor);
}

// Owners whose team `editor` has been granted permission to edit.
export function getEditingFor(editor: string): string[] {
    return (selectEditingFor.all(editor) as Array<{ owner: string }>).map(r => r.owner);
}

export function addTeamEditor(owner: string, editor: string): void {
    insertTeamEditor.run({owner, editor, created_at: new Date().toISOString()});
}

export function removeTeamEditor(owner: string, editor: string): void {
    deleteTeamEditor.run({owner, editor});
}

// Whether `user` may edit `owner`'s team: the owner always can, plus anyone the
// owner has explicitly granted.
export function canEditTeam(owner: string, user: string): boolean {
    if (owner === user) return true;
    return selectTeamEditor.get(owner, user) !== undefined;
}

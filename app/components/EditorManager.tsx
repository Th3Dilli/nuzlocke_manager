"use client";

import {FormEvent, useEffect, useState} from "react";
import {Plus, Shield, UserPlus, X} from "lucide-react";
import Collapsible from "@/app/components/Collapsible";

type Editor = { editorId: string; editorName: string; canManage: boolean };

// Owner-only panel to grant/revoke team-edit access to other Twitch users.
// A manager-editor (canManage) can also use this panel, but with reduced
// privileges: they can add/remove regular editors, but cannot grant manage
// permission or touch other managers.
export default function EditorManager({username, isOwner}: { username: string; isOwner: boolean }) {
    const [editors, setEditors] = useState<Editor[]>([]);
    const [input, setInput] = useState("");
    const [grantManage, setGrantManage] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/${username}/editors`)
            .then(res => (res.ok ? res.json() : {editors: []}))
            .then((data: { editors: Editor[] }) => {
                if (!cancelled) setEditors(data.editors);
            })
            .catch(() => {/* ignore: panel just stays empty */});
        return () => {
            cancelled = true;
        };
    }, [username]);

    async function addEditor(e: FormEvent) {
        e.preventDefault();
        const editor = input.trim().toLowerCase();
        if (!editor || busy) return;

        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/${username}/editors`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({editor, canManage: isOwner && grantManage}),
            });
            if (res.ok) {
                const data: { editors: Editor[] } = await res.json();
                setEditors(data.editors);
                setInput("");
                setGrantManage(false);
            } else {
                setError((await res.text()) || "Failed to add editor");
            }
        } catch {
            setError("Failed to add editor");
        } finally {
            setBusy(false);
        }
    }

    async function removeEditor(editorId: string) {
        setError(null);
        try {
            const res = await fetch(`/api/${username}/editors`, {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({editorId}),
            });
            if (res.ok) {
                const data: { editors: Editor[] } = await res.json();
                setEditors(data.editors);
            } else {
                setError((await res.text()) || "Failed to remove editor");
            }
        } catch {
            setError("Failed to remove editor");
        }
    }

    async function setManage(editorId: string, canManage: boolean) {
        setError(null);
        try {
            const res = await fetch(`/api/${username}/editors`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({editorId, canManage}),
            });
            if (res.ok) {
                const data: { editors: Editor[] } = await res.json();
                setEditors(data.editors);
            } else {
                setError((await res.text()) || "Failed to update permissions");
            }
        } catch {
            setError("Failed to update permissions");
        }
    }

    return (
        <Collapsible icon={<UserPlus className="h-5 w-5 text-yellow-300"/>} title="Team Editors">
            <p className="mb-4 text-sm text-gray-500">
                Allow other Twitch users to edit your team. Enter their Twitch username.
                {isOwner && " Managers can also add and remove other editors."}
            </p>

            <form onSubmit={addEditor} className="mb-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center rounded-md border border-yellow-600 bg-neutral-900 px-2 focus-within:border-yellow-500">
                        <input
                            type="text"
                            value={input}
                            placeholder="twitch_username"
                            onChange={e => setInput(e.target.value)}
                            className="w-full bg-transparent px-2 py-2 text-sm text-gray-200 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={busy || !input.trim()}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-yellow-600 px-4 py-2 text-sm font-bold text-black shadow transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4"/> Add
                    </button>
                </div>
                {isOwner && (
                    <label className="flex items-center gap-2 text-sm text-gray-400 select-none">
                        <input
                            type="checkbox"
                            checked={grantManage}
                            onChange={e => setGrantManage(e.target.checked)}
                            className="h-4 w-4 rounded border-yellow-600 bg-neutral-900 accent-yellow-600"
                        />
                        Grant manage permission (can add/remove other editors)
                    </label>
                )}
            </form>

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            {editors.length === 0 ? (
                <p className="text-sm text-gray-600">No editors yet.</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {editors.map(({editorId, editorName, canManage}) => (
                        <li
                            key={editorId}
                            className="flex items-center justify-between rounded-md border border-yellow-700 bg-neutral-800 px-3 py-2"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-gray-200">{editorName}</span>
                                {!isOwner && canManage && (
                                    <span className="flex items-center gap-1 text-xs font-semibold bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded-full">
                                        <Shield className="h-3 w-3"/> Manager
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {isOwner && (
                                    <label className="flex items-center gap-1.5 text-xs text-gray-400 select-none">
                                        <input
                                            type="checkbox"
                                            checked={canManage}
                                            onChange={e => setManage(editorId, e.target.checked)}
                                            className="h-3.5 w-3.5 rounded border-yellow-600 bg-neutral-900 accent-yellow-600"
                                        />
                                        Manager
                                    </label>
                                )}
                                <button
                                    onClick={() => removeEditor(editorId)}
                                    disabled={!isOwner && canManage}
                                    title={!isOwner && canManage ? "Only the owner can remove a manager" : `Remove ${editorName}`}
                                    className="inline-flex cursor-pointer items-center gap-1 text-xs text-gray-400 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <X className="h-4 w-4"/> Remove
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Collapsible>
    );
}

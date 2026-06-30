"use client";

import {FormEvent, useEffect, useState} from "react";
import {Plus, UserPlus, X} from "lucide-react";

// Owner-only panel to grant/revoke team-edit access to other Twitch users.
export default function EditorManager({username}: { username: string }) {
    const [editors, setEditors] = useState<string[]>([]);
    const [input, setInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/${username}/editors`)
            .then(res => (res.ok ? res.json() : {editors: []}))
            .then((data: { editors: string[] }) => {
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
                body: JSON.stringify({editor}),
            });
            if (res.ok) {
                const data: { editors: string[] } = await res.json();
                setEditors(data.editors);
                setInput("");
            } else {
                setError((await res.text()) || "Failed to add editor");
            }
        } catch {
            setError("Failed to add editor");
        } finally {
            setBusy(false);
        }
    }

    async function removeEditor(editor: string) {
        setError(null);
        try {
            const res = await fetch(`/api/${username}/editors`, {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({editor}),
            });
            if (res.ok) {
                const data: { editors: string[] } = await res.json();
                setEditors(data.editors);
            } else {
                setError((await res.text()) || "Failed to remove editor");
            }
        } catch {
            setError("Failed to remove editor");
        }
    }

    return (
        <div className="mt-6 rounded-xl border border-yellow-600 bgdark p-4">
            <div className="mb-1 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-yellow-300"/>
                <h2 className="text-xl font-bold text-yellow-300">Team Editors</h2>
            </div>
            <p className="mb-4 text-sm text-gray-500">
                Allow other Twitch users to edit your team. Enter their Twitch username.
            </p>

            <form onSubmit={addEditor} className="mb-4 flex items-center gap-2">
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
            </form>

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            {editors.length === 0 ? (
                <p className="text-sm text-gray-600">No editors yet.</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {editors.map(editor => (
                        <li
                            key={editor}
                            className="flex items-center justify-between rounded-md border border-yellow-700 bg-neutral-800 px-3 py-2"
                        >
                            <span className="text-gray-200">{editor}</span>
                            <button
                                onClick={() => removeEditor(editor)}
                                title={`Remove ${editor}`}
                                className="inline-flex cursor-pointer items-center gap-1 text-xs text-gray-400 hover:text-red-400"
                            >
                                <X className="h-4 w-4"/> Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

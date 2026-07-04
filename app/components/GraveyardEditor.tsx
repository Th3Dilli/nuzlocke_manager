"use client";

import {useMemo, useState} from "react";
import {DEFAULT_LANGUAGE, POKEMON, pokemonName} from "@/app/lib/pokemon";
import {MAX_GRAVEYARD} from "@/app/lib/types/NuzlockeState";
import {AlertTriangle, Check, Search, X} from "lucide-react";
import {Pokeball} from "@/app/components/TeamBox";

const MAX_SUGGESTIONS = 8;

function listsEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

// Generic graveyard editor: saves to `apiUrl` as `{ [field]: graveyard }`. Used
// for both the single-graveyard nuzlocke page (field "graveyard") and the
// two-graveyard soullink page (field "graveyard1"/"graveyard2").
export default function GraveyardEditor({apiUrl, field, graveyard: remoteGraveyard, label = "Edit Graveyard"}: {
    apiUrl: string;
    field: string;
    graveyard: number[];
    label?: string;
}) {
    // Draft graveyard, seeded once from the current remote graveyard. Variable
    // length; each entry is a Pokémon id (no empty slots).
    const [graveyard, setGraveyard] = useState<number[]>(() => [...remoteGraveyard]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Set when another editor changed the graveyard while we had unsaved edits.
    const [remoteChanged, setRemoteChanged] = useState(false);
    // The last graveyard we saw from the server, kept in state so we can detect a
    // new SSE update during render (React's "adjust state on a prop change").
    const [prevRemote, setPrevRemote] = useState<number[]>(remoteGraveyard);

    const dirty = useMemo(() => !listsEqual(graveyard, remoteGraveyard), [remoteGraveyard, graveyard]);

    // Reconcile the draft when a new graveyard arrives over SSE (e.g. a co-editor
    // saved). Adopt the incoming list silently when we have no pending edits;
    // otherwise keep the draft and surface a notice so the user doesn't lose it.
    if (!listsEqual(prevRemote, remoteGraveyard)) {
        setPrevRemote(remoteGraveyard);
        if (listsEqual(graveyard, remoteGraveyard)) {
            // Draft already matches the new remote (e.g. our own save echoed back).
            setRemoteChanged(false);
        } else if (listsEqual(graveyard, prevRemote)) {
            // No local edits: adopt the incoming graveyard.
            setGraveyard([...remoteGraveyard]);
            setRemoteChanged(false);
        } else {
            // Local edits conflict with the incoming graveyard: let the user decide.
            setRemoteChanged(true);
        }
    }

    function add(id: number) {
        setGraveyard(prev => (prev.length >= MAX_GRAVEYARD ? prev : [...prev, id]));
        setSaved(false);
        setError(null);
    }

    function removeAt(index: number) {
        setGraveyard(prev => prev.filter((_, i) => i !== index));
        setSaved(false);
        setError(null);
    }

    function loadRemote() {
        setGraveyard([...remoteGraveyard]);
        setRemoteChanged(false);
        setSaved(false);
        setError(null);
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(apiUrl, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({[field]: graveyard}),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } else {
                setError(await res.text() || "Failed to save");
            }
        } catch {
            setError("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mt-6 rounded-xl border border-yellow-600 bgdark p-4">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Pokeball className="h-5 w-5"/>
                    <h2 className="text-xl font-bold text-yellow-300">{label}</h2>
                    <span className="text-sm text-gray-500">{graveyard.length}/{MAX_GRAVEYARD}</span>
                </div>
                <div className="flex items-center gap-3">
                    {error && <span className="text-sm text-red-400">{error}</span>}
                    <button
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-yellow-600 px-4 py-2 text-sm font-bold text-black shadow transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saved ? <><Check className="h-4 w-4"/> Saved</> : saving ? "Saving…" : "Save Graveyard"}
                    </button>
                </div>
            </div>

            {remoteChanged && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-amber-500 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4"/>
                        This graveyard was changed by another editor.
                    </span>
                    <span className="flex items-center gap-2">
                        <button
                            onClick={loadRemote}
                            className="cursor-pointer rounded border border-amber-500 px-2 py-1 text-xs font-medium hover:bg-amber-500/20"
                        >
                            Load latest
                        </button>
                        <button onClick={() => setRemoteChanged(false)} title="Keep my changes" className="cursor-pointer hover:text-amber-100">
                            <X className="h-4 w-4"/>
                        </button>
                    </span>
                </div>
            )}

            <AddPokemon disabled={graveyard.length >= MAX_GRAVEYARD} onAdd={add}/>

            {graveyard.length === 0 ? (
                <p className="mt-4 text-sm text-gray-600">No Pokémon in the graveyard yet.</p>
            ) : (
                <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                    {graveyard.map((id, i) => (
                        <GraveyardEntry key={`${id}-${i}`} index={i} id={id} onRemove={() => removeAt(i)}/>
                    ))}
                </ul>
            )}
        </div>
    );
}

function GraveyardEntry({index, id, onRemove}: { index: number; id: number; onRemove: () => void }) {
    const pokemon = useMemo(() => POKEMON.find(p => p.id === id), [id]);
    return (
        <li className="flex items-center gap-3 rounded-lg border border-yellow-700 bg-neutral-800 p-2">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-neutral-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="h-12 w-12 [image-rendering:pixelated]" src={`/showdown/${id}.gif`} alt={pokemon ? pokemonName(pokemon, DEFAULT_LANGUAGE) : String(id)}/>
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-500">#{index + 1}</div>
                <div className="truncate capitalize text-gray-200">{pokemon ? pokemonName(pokemon, DEFAULT_LANGUAGE) : id}</div>
            </div>
            <button
                onClick={onRemove}
                title="Remove"
                className="inline-flex shrink-0 cursor-pointer items-center text-gray-400 hover:text-red-400"
            >
                <X className="h-4 w-4"/>
            </button>
        </li>
    );
}

// Search field that appends the chosen Pokémon to the graveyard. Stays open
// after a pick so multiple Pokémon can be added in a row.
function AddPokemon({onAdd, disabled}: { onAdd: (id: number) => void; disabled: boolean }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return POKEMON.filter(p => p.names.en.toLowerCase().includes(q) || pokemonName(p, DEFAULT_LANGUAGE).toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
    }, [query]);

    function choose(id: number) {
        onAdd(id);
        setQuery("");
        setOpen(false);
    }

    return (
        <div className="relative">
            <div className={`flex items-center rounded-md border border-yellow-600 bg-neutral-900 px-2 focus-within:border-yellow-500 ${disabled ? "opacity-50" : ""}`}>
                <Search className="h-4 w-4 text-gray-500"/>
                <input
                    type="text"
                    value={query}
                    disabled={disabled}
                    placeholder={disabled ? "Graveyard full" : "Add Pokémon to the graveyard…"}
                    onChange={e => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    className="w-full bg-transparent px-2 py-2 text-sm text-gray-200 outline-none disabled:cursor-not-allowed"
                />
            </div>

            {open && suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-yellow-700 bg-neutral-900 shadow-lg">
                    {suggestions.map(p => (
                        <li key={p.id}>
                            <button
                                // onMouseDown fires before the input's blur, so the click registers.
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => choose(p.id)}
                                className="flex w-full cursor-pointer items-center gap-3 px-2 py-1.5 text-left hover:bg-neutral-800"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img className="h-10 w-10" src={`/showdown/${p.id}.gif`} alt={pokemonName(p, DEFAULT_LANGUAGE)}/>
                                <span className="capitalize text-sm text-gray-200">{pokemonName(p, DEFAULT_LANGUAGE)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

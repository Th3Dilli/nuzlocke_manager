"use client";

import {useMemo, useState} from "react";
import {DEFAULT_LANGUAGE, POKEMON, pokemonName} from "@/app/lib/pokemon";
import {TEAM_SIZE} from "@/app/lib/types/NuzlockeState";
import {AlertTriangle, Check, Search, X} from "lucide-react";
import {Pokeball} from "@/app/components/TeamBox";
import Collapsible from "@/app/components/Collapsible";

const MAX_SUGGESTIONS = 8;

function teamsEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

// Generic team editor: saves to `apiUrl` as `{ [field]: team }`. Used for both
// the single-team nuzlocke page (field "team") and the two-team soullink page
// (field "team1"/"team2").
export default function TeamEditor({apiUrl, field, team: remoteTeam, label = "Edit Team"}: {
    apiUrl: string;
    field: string;
    team: number[];
    label?: string;
}) {
    // Draft team, seeded once from the current remote team. Length TEAM_SIZE;
    // each entry is a Pokémon id or 0 for an empty slot.
    const [team, setTeam] = useState<number[]>(() =>
        Array.from({length: TEAM_SIZE}, (_, i) => remoteTeam[i] ?? 0)
    );
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Set when another editor changed the team while we had unsaved edits.
    const [remoteChanged, setRemoteChanged] = useState(false);
    // The last team we saw from the server, kept in state so we can detect a new
    // SSE update during render (React's "adjust state on a prop change" pattern).
    const [prevRemote, setPrevRemote] = useState<number[]>(remoteTeam);

    const dirty = useMemo(() => !teamsEqual(team, remoteTeam), [remoteTeam, team]);

    // Reconcile the draft when a new team arrives over SSE (e.g. a co-editor
    // saved). Adopt the incoming team silently when we have no pending edits;
    // otherwise keep the draft and surface a notice so the user doesn't lose it.
    if (!teamsEqual(prevRemote, remoteTeam)) {
        setPrevRemote(remoteTeam);
        if (teamsEqual(team, remoteTeam)) {
            // Draft already matches the new remote (e.g. our own save echoed back).
            setRemoteChanged(false);
        } else if (teamsEqual(team, prevRemote)) {
            // No local edits: adopt the incoming team.
            setTeam([...remoteTeam]);
            setRemoteChanged(false);
        } else {
            // Local edits conflict with the incoming team: let the user decide.
            setRemoteChanged(true);
        }
    }

    function setSlot(index: number, id: number) {
        setTeam(prev => prev.map((v, i) => (i === index ? id : v)));
        setSaved(false);
        setError(null);
    }

    function loadRemote() {
        setTeam([...remoteTeam]);
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
                body: JSON.stringify({[field]: team}),
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
        <Collapsible
            icon={<Pokeball className="h-5 w-5"/>}
            title={label}
            headerRight={
                <>
                    {error && <span className="text-sm text-red-400">{error}</span>}
                    <button
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-yellow-600 px-4 py-2 text-sm font-bold text-black shadow transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saved ? <><Check className="h-4 w-4"/> Saved</> : saving ? "Saving…" : "Save Team"}
                    </button>
                </>
            }
        >
            {remoteChanged && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-amber-500 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4"/>
                        This team was changed by another editor.
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {team.map((id, i) => (
                    <PokemonSlot key={i} index={i} id={id} onSelect={selected => setSlot(i, selected)}/>
                ))}
            </div>
        </Collapsible>
    );
}

function PokemonSlot({index, id, onSelect}: { index: number; id: number; onSelect: (id: number) => void }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);

    const selected = useMemo(() => POKEMON.find(p => p.id === id), [id]);

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return POKEMON.filter(p => p.names.en.toLowerCase().includes(q) || pokemonName(p, DEFAULT_LANGUAGE).toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
    }, [query]);

    function choose(pokemonId: number) {
        onSelect(pokemonId);
        setQuery("");
        setOpen(false);
    }

    return (
        <div className="rounded-lg border border-yellow-700 bg-neutral-800 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Slot {index + 1}
            </div>

            {/* Current selection preview */}
            <div className="mb-3 flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded bg-neutral-900">
                    {id ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="h-16 w-16" src={`/showdown/${id}.gif`} alt={selected ? pokemonName(selected, DEFAULT_LANGUAGE) : String(id)}/>
                    ) : (
                        <span className="text-xs text-gray-600">empty</span>
                    )}
                </div>
                <div className="flex-1">
                    <div className="capitalize text-gray-200">{selected ? pokemonName(selected, DEFAULT_LANGUAGE) : "—"}</div>
                    {id !== 0 && (
                        <button
                            onClick={() => onSelect(0)}
                            className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs text-gray-400 hover:text-red-400"
                        >
                            <X className="h-3 w-3"/> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Search field */}
            <div className="relative">
                <div className="flex items-center rounded-md border border-yellow-600 bg-neutral-900 px-2 focus-within:border-yellow-500">
                    <Search className="h-4 w-4 text-gray-500"/>
                    <input
                        type="text"
                        value={query}
                        placeholder="Search Pokémon…"
                        onChange={e => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 150)}
                        className="w-full bg-transparent px-2 py-2 text-sm text-gray-200 outline-none"
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
        </div>
    );
}

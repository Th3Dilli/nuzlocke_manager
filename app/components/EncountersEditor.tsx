"use client";

import {useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {DEFAULT_LANGUAGE, POKEMON, pokemonName} from "@/app/lib/pokemon";
import {AlertTriangle, Check, Plus, Search, X} from "lucide-react";
import {Pokeball} from "@/app/components/TeamBox";
import Collapsible from "@/app/components/Collapsible";
import {EncounterAction, MAX_ENCOUNTERS} from "@/app/lib/types/NuzlockeState";
import {LostDueToPlayer, SoullinkEncounter} from "@/app/lib/types/SoullinkState";

const MAX_SUGGESTIONS = 8;

const ACTION_OPTIONS: { value: EncounterAction; label: string }[] = [
    {value: "caught", label: "Caught"},
    {value: "dead", label: "Dead"},
    {value: "not_caught", label: "Not Caught"},
];

function emptyEncounter(): SoullinkEncounter {
    return {route: "", pokemon1: 0, pokemon2: 0, action: "caught", lostDueToPlayer: "none"};
}

function encountersEqual(a: SoullinkEncounter[], b: SoullinkEncounter[]): boolean {
    return a.length === b.length && a.every((row, i) => {
        const other = b[i];
        return row.route === other.route
            && row.pokemon1 === other.pokemon1
            && row.pokemon2 === other.pokemon2
            && row.action === other.action
            && row.lostDueToPlayer === other.lostDueToPlayer;
    });
}

// Per-route encounter log editor: saves to `apiUrl` as `{ encounters }`. Each
// row tracks what was encountered on a route for each side and how it was
// resolved (caught / dead / not caught), plus which side's Pokémon caused a
// loss under the soul-link death rule.
export default function EncountersEditor({apiUrl, encounters: remoteEncounters, player1Name, player2Name, label = "Encounters"}: {
    apiUrl: string;
    encounters: SoullinkEncounter[];
    player1Name?: string;
    player2Name?: string;
    label?: string;
}) {
    const [encounters, setEncounters] = useState<SoullinkEncounter[]>(() => [...remoteEncounters]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remoteChanged, setRemoteChanged] = useState(false);
    const [prevRemote, setPrevRemote] = useState<SoullinkEncounter[]>(remoteEncounters);

    const dirty = useMemo(() => !encountersEqual(encounters, remoteEncounters), [remoteEncounters, encounters]);

    if (!encountersEqual(prevRemote, remoteEncounters)) {
        setPrevRemote(remoteEncounters);
        if (encountersEqual(encounters, remoteEncounters)) {
            setRemoteChanged(false);
        } else if (encountersEqual(encounters, prevRemote)) {
            setEncounters([...remoteEncounters]);
            setRemoteChanged(false);
        } else {
            setRemoteChanged(true);
        }
    }

    function update(index: number, patch: Partial<SoullinkEncounter>) {
        setEncounters(prev => prev.map((row, i) => {
            if (i !== index) return row;
            const next = {...row, ...patch};
            // Only meaningful when the encounter resulted in a death.
            if (next.action === "caught") next.lostDueToPlayer = "none";
            return next;
        }));
        setSaved(false);
        setError(null);
    }

    function addRow() {
        setEncounters(prev => (prev.length >= MAX_ENCOUNTERS ? prev : [...prev, emptyEncounter()]));
        setSaved(false);
        setError(null);
    }

    function removeAt(index: number) {
        setEncounters(prev => prev.filter((_, i) => i !== index));
        setSaved(false);
        setError(null);
    }

    function loadRemote() {
        setEncounters([...remoteEncounters]);
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
                body: JSON.stringify({encounters}),
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
            title={<>{label} <span className="text-sm font-normal text-gray-500">{encounters.length}/{MAX_ENCOUNTERS}</span></>}
            headerRight={
                <>
                    {error && <span className="text-sm text-red-400">{error}</span>}
                    <button
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-yellow-600 px-4 py-2 text-sm font-bold text-black shadow transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saved ? <><Check className="h-4 w-4"/> Saved</> : saving ? "Saving…" : "Save Encounters"}
                    </button>
                </>
            }
        >
            {remoteChanged && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-amber-500 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4"/>
                        Encounters were changed by another editor.
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

            {encounters.length === 0 ? (
                <p className="text-sm text-gray-600">No encounters logged yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-separate border-spacing-y-2">
                        <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-2 font-semibold">Route</th>
                            <th className="px-2 font-semibold">{player1Name || "Pokémon 1"}</th>
                            <th className="px-2 font-semibold">{player2Name || "Pokémon 2"}</th>
                            <th className="px-2 font-semibold">Action</th>
                            <th className="px-2 font-semibold">Lost due to</th>
                            <th className="px-2"/>
                        </tr>
                        </thead>
                        <tbody>
                        {encounters.map((row, i) => (
                            <EncounterRow
                                key={i}
                                row={row}
                                player1Name={player1Name}
                                player2Name={player2Name}
                                onChange={patch => update(i, patch)}
                                onRemove={() => removeAt(i)}
                            />
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            <button
                onClick={addRow}
                disabled={encounters.length >= MAX_ENCOUNTERS}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded border border-yellow-600 px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-yellow-600/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Plus className="h-4 w-4"/> Add route
            </button>
        </Collapsible>
    );
}

function EncounterRow({row, player1Name, player2Name, onChange, onRemove}: {
    row: SoullinkEncounter;
    player1Name?: string;
    player2Name?: string;
    onChange: (patch: Partial<SoullinkEncounter>) => void;
    onRemove: () => void;
}) {
    return (
        <tr className="align-top">
            <td className="border-b border-neutral-700 px-2 py-1 pb-3">
                <input
                    type="text"
                    value={row.route}
                    onChange={e => onChange({route: e.target.value})}
                    placeholder="Route"
                    maxLength={40}
                    className="w-32 rounded-md border border-yellow-600 bg-neutral-900 px-2 py-2 text-sm text-gray-200 outline-none focus:border-yellow-500"
                />
            </td>
            <td className="border-b border-neutral-700 px-2 py-1 pb-3">
                <PokemonCell id={row.pokemon1} onChange={id => onChange({pokemon1: id})}/>
            </td>
            <td className="border-b border-neutral-700 px-2 py-1 pb-3">
                <PokemonCell id={row.pokemon2} onChange={id => onChange({pokemon2: id})}/>
            </td>
            <td className="border-b border-neutral-700 px-2 py-1 pb-3">
                <select
                    value={row.action}
                    onChange={e => onChange({action: e.target.value as EncounterAction})}
                    className="rounded-md border border-yellow-600 bg-neutral-900 px-2 py-2 text-sm text-gray-200 outline-none focus:border-yellow-500"
                >
                    {ACTION_OPTIONS.map(({value, label}) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </td>
            <td className="border-b border-neutral-700 px-2 py-1 pb-3">
                <select
                    value={row.lostDueToPlayer}
                    disabled={row.action === "caught"}
                    onChange={e => onChange({lostDueToPlayer: e.target.value as LostDueToPlayer})}
                    className="rounded-md border border-yellow-600 bg-neutral-900 px-2 py-2 text-sm text-gray-200 outline-none focus:border-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="none">N/A</option>
                    <option value="player1">{player1Name || "Player 1"}</option>
                    <option value="player2">{player2Name || "Player 2"}</option>
                </select>
            </td>
            <td className="border-b border-neutral-700 px-2 py-1 pb-3">
                <button
                    onClick={onRemove}
                    title="Remove"
                    className="inline-flex cursor-pointer items-center text-gray-400 hover:text-red-400"
                >
                    <X className="h-4 w-4"/>
                </button>
            </td>
        </tr>
    );
}

// Compact Pokémon picker for a single table cell: shows the current pick (or
// a placeholder) and opens a search dropdown to change it. Choosing "Clear"
// resets the slot to 0 (unset). Exported for reuse by the single-player
// nuzlocke encounters editor.
export function PokemonCell({id, onChange}: { id: number; onChange: (id: number) => void }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const pokemon = useMemo(() => POKEMON.find(p => p.id === id), [id]);

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return POKEMON.filter(p => p.names.en.toLowerCase().includes(q) || pokemonName(p, DEFAULT_LANGUAGE).toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
    }, [query]);

    function openMenu() {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) setMenuPos({top: rect.bottom + 4, left: rect.left});
        setOpen(true);
    }

    function choose(newId: number) {
        onChange(newId);
        setQuery("");
        setOpen(false);
    }

    return (
        <div ref={wrapperRef} className="relative w-36">
            <div className="flex items-center gap-1 rounded-md border border-yellow-600 bg-neutral-900 px-1 focus-within:border-yellow-500">
                {pokemon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="h-7 w-7 shrink-0 [image-rendering:pixelated]" src={`/showdown/${pokemon.id}.gif`} alt={pokemonName(pokemon, DEFAULT_LANGUAGE)}/>
                ) : (
                    <Search className="h-4 w-4 shrink-0 text-gray-500"/>
                )}
                <input
                    type="text"
                    value={open ? query : (pokemon ? pokemonName(pokemon, DEFAULT_LANGUAGE) : "")}
                    placeholder="—"
                    onChange={e => {
                        setQuery(e.target.value);
                        openMenu();
                    }}
                    onFocus={() => {
                        setQuery("");
                        openMenu();
                    }}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    className="w-full min-w-0 bg-transparent px-1 py-1.5 text-sm capitalize text-gray-200 outline-none"
                />
            </div>

            {open && menuPos && (suggestions.length > 0 || id !== 0) && createPortal(
                <ul
                    style={{position: "fixed", top: menuPos.top, left: menuPos.left}}
                    className="z-50 max-h-72 w-48 overflow-y-auto rounded-md border border-yellow-700 bg-neutral-900 shadow-lg"
                >
                    {id !== 0 && (
                        <li>
                            <button
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => choose(0)}
                                className="flex w-full cursor-pointer items-center px-2 py-1.5 text-left text-sm text-gray-400 hover:bg-neutral-800"
                            >
                                Clear
                            </button>
                        </li>
                    )}
                    {suggestions.map(p => (
                        <li key={p.id}>
                            <button
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => choose(p.id)}
                                className="flex w-full cursor-pointer items-center gap-3 px-2 py-1.5 text-left hover:bg-neutral-800"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img className="h-8 w-8 [image-rendering:pixelated]" src={`/showdown/${p.id}.gif`} alt={pokemonName(p, DEFAULT_LANGUAGE)}/>
                                <span className="truncate text-sm capitalize text-gray-200">{pokemonName(p, DEFAULT_LANGUAGE)}</span>
                            </button>
                        </li>
                    ))}
                </ul>,
                document.body
            )}
        </div>
    );
}

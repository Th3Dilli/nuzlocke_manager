"use client";

import {useMemo, useState} from "react";
import {AlertTriangle, Check, Plus, X} from "lucide-react";
import {Pokeball} from "@/app/components/TeamBox";
import Collapsible from "@/app/components/Collapsible";
import {PokemonCell} from "@/app/components/EncountersEditor";
import {EncounterAction, MAX_ENCOUNTERS, NuzlockeEncounter} from "@/app/lib/types/NuzlockeState";

const ACTION_OPTIONS: { value: EncounterAction; label: string }[] = [
    {value: "caught", label: "Caught"},
    {value: "dead", label: "Dead"},
    {value: "not_caught", label: "Not Caught"},
];

function emptyEncounter(): NuzlockeEncounter {
    return {route: "", pokemon: 0, action: "caught"};
}

function encountersEqual(a: NuzlockeEncounter[], b: NuzlockeEncounter[]): boolean {
    return a.length === b.length && a.every((row, i) => {
        const other = b[i];
        return row.route === other.route && row.pokemon === other.pokemon && row.action === other.action;
    });
}

// Per-route encounter log editor for the single-player nuzlocke page: saves
// to `apiUrl` as `{ encounters }`. Each row tracks what was encountered on a
// route and how it was resolved (caught / dead / not caught).
export default function NuzlockeEncountersEditor({apiUrl, encounters: remoteEncounters, label = "Encounters"}: {
    apiUrl: string;
    encounters: NuzlockeEncounter[];
    label?: string;
}) {
    const [encounters, setEncounters] = useState<NuzlockeEncounter[]>(() => [...remoteEncounters]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remoteChanged, setRemoteChanged] = useState(false);
    const [prevRemote, setPrevRemote] = useState<NuzlockeEncounter[]>(remoteEncounters);

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

    function update(index: number, patch: Partial<NuzlockeEncounter>) {
        setEncounters(prev => prev.map((row, i) => (i === index ? {...row, ...patch} : row)));
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
                    <table className="w-full min-w-[480px] border-separate border-spacing-y-2">
                        <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-2 font-semibold">Route</th>
                            <th className="px-2 font-semibold">Pokémon</th>
                            <th className="px-2 font-semibold">Action</th>
                            <th className="px-2"/>
                        </tr>
                        </thead>
                        <tbody>
                        {encounters.map((row, i) => (
                            <EncounterRow key={i} row={row} onChange={patch => update(i, patch)} onRemove={() => removeAt(i)}/>
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

function EncounterRow({row, onChange, onRemove}: {
    row: NuzlockeEncounter;
    onChange: (patch: Partial<NuzlockeEncounter>) => void;
    onRemove: () => void;
}) {
    return (
        <tr className="align-top">
            <td className="px-2 py-1">
                <input
                    type="text"
                    value={row.route}
                    onChange={e => onChange({route: e.target.value})}
                    placeholder="Route"
                    maxLength={40}
                    className="w-32 rounded-md border border-yellow-600 bg-neutral-900 px-2 py-2 text-sm text-gray-200 outline-none focus:border-yellow-500"
                />
            </td>
            <td className="px-2 py-1">
                <PokemonCell id={row.pokemon} onChange={id => onChange({pokemon: id})}/>
            </td>
            <td className="px-2 py-1">
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
            <td className="px-2 py-1">
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

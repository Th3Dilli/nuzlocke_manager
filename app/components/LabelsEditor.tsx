"use client";

import {useMemo, useState} from "react";
import {AlertTriangle, Check, X} from "lucide-react";
import {Pokeball} from "@/app/components/TeamBox";
import Collapsible from "@/app/components/Collapsible";

export type LabelSection<T extends string = string> = {
    key: T;
    textKey: T;
    title: string;
    placeholder: string;
};

type LabelValues<T extends string> = Record<T, boolean | string>;

function valuesEqual<T extends string>(sections: LabelSection<T>[], a: LabelValues<T>, b: LabelValues<T>): boolean {
    return sections.every(({key, textKey}) => a[key] === b[key] && a[textKey] === b[textKey]);
}

// Generic show/hide + custom-text editor for overlay title tabs (e.g. Nuzlocke,
// Trainer, Team, Graveyard — or their soullink 1/2 counterparts). `values`
// holds exactly the fields named in `sections`; saving POSTs that same shape
// to `apiUrl` as a partial update.
export default function LabelsEditor<T extends string>({apiUrl, values: remoteValues, sections, label = "Overlay Labels"}: {
    apiUrl: string;
    values: LabelValues<T>;
    sections: LabelSection<T>[];
    label?: string;
}) {
    const [values, setValues] = useState<LabelValues<T>>(remoteValues);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remoteChanged, setRemoteChanged] = useState(false);
    const [prevRemote, setPrevRemote] = useState<LabelValues<T>>(remoteValues);

    const dirty = useMemo(() => !valuesEqual(sections, values, remoteValues), [sections, values, remoteValues]);

    if (!valuesEqual(sections, prevRemote, remoteValues)) {
        setPrevRemote(remoteValues);
        if (valuesEqual(sections, values, remoteValues)) {
            setRemoteChanged(false);
        } else if (valuesEqual(sections, values, prevRemote)) {
            setValues(remoteValues);
            setRemoteChanged(false);
        } else {
            setRemoteChanged(true);
        }
    }

    function setShow(key: T, value: boolean) {
        setValues(prev => ({...prev, [key]: value}));
        setSaved(false);
        setError(null);
    }

    function setText(key: T, value: string) {
        setValues(prev => ({...prev, [key]: value}));
        setSaved(false);
        setError(null);
    }

    function loadRemote() {
        setValues(remoteValues);
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
                body: JSON.stringify(values),
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
                        {saved ? <><Check className="h-4 w-4"/> Saved</> : saving ? "Saving…" : "Save Labels"}
                    </button>
                </>
            }
        >
            {remoteChanged && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-amber-500 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4"/>
                        These labels were changed by another editor.
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sections.map(({key, textKey, title, placeholder}) => (
                    <div key={key} className="rounded-lg border border-yellow-700 bg-neutral-800 p-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-200">
                            <input
                                type="checkbox"
                                checked={Boolean(values[key])}
                                onChange={e => setShow(key, e.target.checked)}
                                className="h-4 w-4 cursor-pointer accent-yellow-500"
                            />
                            Show {title} label
                        </label>
                        <input
                            type="text"
                            value={String(values[textKey] ?? "")}
                            onChange={e => setText(textKey, e.target.value)}
                            disabled={!values[key]}
                            placeholder={placeholder}
                            maxLength={40}
                            className="mt-2 w-full rounded-md border border-yellow-600 bg-neutral-900 px-2 py-2 text-sm text-gray-200 outline-none focus:border-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                ))}
            </div>
        </Collapsible>
    );
}

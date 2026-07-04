"use client";

import {useMemo, useState} from "react";
import {AlertTriangle, Check, X} from "lucide-react";
import {Pokeball} from "@/app/components/TeamBox";
import {DEFAULT_SOULLINK_SETTINGS, SoullinkSettings} from "@/app/lib/types/SoullinkState";

function settingsEqual(a: SoullinkSettings, b: SoullinkSettings): boolean {
    return a.frameBorderColor === b.frameBorderColor
        && a.teamColor === b.teamColor
        && a.graveyardColor === b.graveyardColor
        && a.textColor === b.textColor;
}

// Editor for the soullink overlay's border/text colors, shared across both sides.
export default function SoullinkSettingsEditor({apiUrl, values: remoteValues}: {
    apiUrl: string;
    values: SoullinkSettings;
}) {
    const [values, setValues] = useState<SoullinkSettings>(remoteValues);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remoteChanged, setRemoteChanged] = useState(false);
    const [prevRemote, setPrevRemote] = useState<SoullinkSettings>(remoteValues);

    const dirty = useMemo(() => !settingsEqual(values, remoteValues), [values, remoteValues]);

    if (!settingsEqual(prevRemote, remoteValues)) {
        setPrevRemote(remoteValues);
        if (settingsEqual(values, remoteValues)) {
            setRemoteChanged(false);
        } else if (settingsEqual(values, prevRemote)) {
            setValues(remoteValues);
            setRemoteChanged(false);
        } else {
            setRemoteChanged(true);
        }
    }

    function update<K extends keyof SoullinkSettings>(key: K, value: SoullinkSettings[K]) {
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

    function resetColors() {
        setValues(DEFAULT_SOULLINK_SETTINGS);
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
        <div className="mt-6 rounded-xl border border-yellow-600 bgdark p-4">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Pokeball className="h-5 w-5"/>
                    <h2 className="text-xl font-bold text-yellow-300">Overlay Settings</h2>
                </div>
                <div className="flex items-center gap-3">
                    {error && <span className="text-sm text-red-400">{error}</span>}
                    <button
                        onClick={resetColors}
                        className="cursor-pointer rounded border border-yellow-600 px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-yellow-600/10"
                    >
                        Reset colors
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-yellow-600 px-4 py-2 text-sm font-bold text-black shadow transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saved ? <><Check className="h-4 w-4"/> Saved</> : saving ? "Saving…" : "Save Settings"}
                    </button>
                </div>
            </div>

            {remoteChanged && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-amber-500 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4"/>
                        These settings were changed by another editor.
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
                <div className="rounded-lg border border-yellow-700 bg-neutral-800 p-3">
                    <label className="flex items-center justify-between text-sm font-medium text-gray-200">
                        Frame border color
                        <input
                            type="color"
                            value={values.frameBorderColor}
                            onChange={e => update("frameBorderColor", e.target.value)}
                            className="h-8 w-12 cursor-pointer rounded border border-yellow-600 bg-neutral-900"
                        />
                    </label>
                </div>

                <div className="rounded-lg border border-yellow-700 bg-neutral-800 p-3">
                    <label className="flex items-center justify-between text-sm font-medium text-gray-200">
                        Team box color
                        <input
                            type="color"
                            value={values.teamColor}
                            onChange={e => update("teamColor", e.target.value)}
                            className="h-8 w-12 cursor-pointer rounded border border-yellow-600 bg-neutral-900"
                        />
                    </label>
                </div>

                <div className="rounded-lg border border-yellow-700 bg-neutral-800 p-3">
                    <label className="flex items-center justify-between text-sm font-medium text-gray-200">
                        Graveyard box color
                        <input
                            type="color"
                            value={values.graveyardColor}
                            onChange={e => update("graveyardColor", e.target.value)}
                            className="h-8 w-12 cursor-pointer rounded border border-yellow-600 bg-neutral-900"
                        />
                    </label>
                </div>

                <div className="rounded-lg border border-yellow-700 bg-neutral-800 p-3">
                    <label className="flex items-center justify-between text-sm font-medium text-gray-200">
                        Text color
                        <input
                            type="color"
                            value={values.textColor}
                            onChange={e => update("textColor", e.target.value)}
                            className="h-8 w-12 cursor-pointer rounded border border-yellow-600 bg-neutral-900"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
}

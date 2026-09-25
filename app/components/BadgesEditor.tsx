"use client";

import {useMemo, useState} from "react";
import {AlertTriangle, Check, X} from "lucide-react";
import {Pokeball} from "@/app/components/TeamBox";
import Collapsible from "@/app/components/Collapsible";
import {BADGES, badgeGroupLabel, groupedBadges} from "@/app/lib/badges";

function idsEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    const sa = [...a].sort((x, y) => x - y);
    const sb = [...b].sort((x, y) => x - y);
    return sa.every((v, i) => v === sb[i]);
}

type BadgeSet = { badges: number[]; badgeGroup: string };

function badgesEqual(a: BadgeSet, b: BadgeSet): boolean {
    return a.badgeGroup === b.badgeGroup && idsEqual(a.badges, b.badges);
}

// Generic badges editor: saves to `apiUrl` as `{ [field]: badges }`. Toggles
// membership in a fixed catalog (see app/lib/badges.json) rather than
// free-form add/remove like the team/graveyard editors. With `groupField` set,
// it also offers a badge set (generation) picker, saved as `{ [groupField]: group }`
// together with the badges; when a set is picked only its badges are listed.
export default function BadgesEditor({apiUrl, field = "badges", badges: remoteBadges, groupField, group: remoteGroup = "", label = "Edit Badges"}: {
    apiUrl: string;
    field?: string;
    badges: number[];
    groupField?: string;
    group?: string;
    label?: string;
}) {
    const remote = useMemo<BadgeSet>(() => ({badges: remoteBadges, badgeGroup: remoteGroup}), [remoteBadges, remoteGroup]);
    const [badgeSet, setBadgeSet] = useState<BadgeSet>(() => ({badges: [...remoteBadges], badgeGroup: remoteGroup}));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Set when another editor changed the badges while we had unsaved edits.
    const [remoteChanged, setRemoteChanged] = useState(false);
    // The last badges we saw from the server, kept in state so we can detect a
    // new SSE update during render (React's "adjust state on a prop change").
    const [prevRemote, setPrevRemote] = useState<BadgeSet>(remote);

    const {badges, badgeGroup} = badgeSet;
    const selected = useMemo(() => new Set(badges), [badges]);
    const dirty = useMemo(() => !badgesEqual(badgeSet, remote), [badgeSet, remote]);
    const allGroups = useMemo(() => groupedBadges(), []);
    const groups = useMemo(() => badgeGroup ? allGroups.filter(g => g.group === badgeGroup) : allGroups, [allGroups, badgeGroup]);
    const shownTotal = badgeGroup ? groups.reduce((n, g) => n + g.badges.length, 0) : BADGES.length;
    const shownSelected = badgeGroup ? groups.reduce((n, g) => n + g.badges.filter(b => selected.has(b.id)).length, 0) : badges.length;

    // Reconcile the badgeSet when new badges arrive over SSE (e.g. a co-editor
    // saved). Adopt the incoming list silently when we have no pending edits;
    // otherwise keep the badgeSet and surface a notice so the user doesn't lose it.
    if (!badgesEqual(prevRemote, remote)) {
        setPrevRemote(remote);
        if (badgesEqual(badgeSet, remote)) {
            setRemoteChanged(false);
        } else if (badgesEqual(badgeSet, prevRemote)) {
            setBadgeSet({badges: [...remote.badges], badgeGroup: remote.badgeGroup});
            setRemoteChanged(false);
        } else {
            setRemoteChanged(true);
        }
    }

    function toggle(id: number) {
        setBadgeSet(prev => ({
            ...prev,
            badges: prev.badges.includes(id) ? prev.badges.filter(v => v !== id) : [...prev.badges, id],
        }));
        setSaved(false);
        setError(null);
    }

    function selectGroup(value: string) {
        setBadgeSet(prev => ({...prev, badgeGroup: value}));
        setSaved(false);
        setError(null);
    }

    function loadRemote() {
        setBadgeSet({badges: [...remote.badges], badgeGroup: remote.badgeGroup});
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
                body: JSON.stringify(groupField ? {[field]: badges, [groupField]: badgeGroup} : {[field]: badges}),
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
            title={<>{label} <span className="text-sm font-normal text-gray-500">{shownSelected}/{shownTotal}</span></>}
            headerRight={
                <>
                    {error && <span className="text-sm text-red-400">{error}</span>}
                    <button
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-yellow-600 px-4 py-2 text-sm font-bold text-black shadow transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saved ? <><Check className="h-4 w-4"/> Saved</> : saving ? "Saving…" : "Save Badges"}
                    </button>
                </>
            }
        >
            {remoteChanged && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-amber-500 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4"/>
                        Badges were changed by another editor.
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

            {groupField && (
                <div className="mb-5 rounded-lg border border-yellow-700 bg-neutral-800 p-3 sm:max-w-sm">
                    <label className="block text-sm font-medium text-gray-200">
                        Badge set (unearned shown gray in the overlay)
                    </label>
                    <select
                        value={badgeGroup}
                        onChange={e => selectGroup(e.target.value)}
                        className="mt-2 w-full rounded-md border border-yellow-600 bg-neutral-900 px-2 py-2 text-sm text-gray-200 outline-none focus:border-yellow-500"
                    >
                        <option value="">All badges (overlay shows only earned)</option>
                        {allGroups.map(({group: value}) => (
                            <option key={value} value={value}>{badgeGroupLabel(value)}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="flex flex-col gap-5">
                {groups.map(({group, badges: groupBadges}) => (
                    <div key={group}>
                        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{badgeGroupLabel(group)}</h3>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-3">
                            {groupBadges.map(badge => {
                                const isSelected = selected.has(badge.id);
                                return (
                                    <button
                                        key={badge.id}
                                        type="button"
                                        onClick={() => toggle(badge.id)}
                                        title={`${badge.name} — ${badge.city}`}
                                        className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
                                            isSelected
                                                ? "border-yellow-500 bg-yellow-500/10"
                                                : "border-neutral-700 bg-neutral-800 hover:border-yellow-700"
                                        }`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={`/badges/${badge.id}.png`}
                                            alt={badge.name}
                                            className={`h-10 w-10 object-contain ${isSelected ? "" : "opacity-20 grayscale"}`}
                                        />
                                        <span className={`w-full truncate text-center text-[11px] ${isSelected ? "text-yellow-200" : "text-gray-500"}`}>
                                            {badge.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </Collapsible>
    );
}

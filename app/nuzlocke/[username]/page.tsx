"use client";

import {use} from "react";
import {NuzlockeState} from "@/app/lib/types/NuzlockeState";
import {Suspense, useEffect, useState} from "react";
import TeamEditor from "@/app/components/TeamEditor";
import GraveyardEditor from "@/app/components/GraveyardEditor";
import BadgesEditor from "@/app/components/BadgesEditor";
import EditorManager from "@/app/components/EditorManager";
import LabelsEditor, {LabelSection} from "@/app/components/LabelsEditor";
import OverlaySettingsEditor from "@/app/components/OverlaySettingsEditor";
import TeamBox, {Graveyard} from "@/app/components/TeamBox";

type NuzlockeLabelKey = "showNuzlockeLabel" | "nuzlockeLabel" | "showTrainerLabel" | "trainerLabel"
    | "showTeamLabel" | "teamLabel" | "showGraveyardLabel" | "graveyardLabel" | "showBadgesLabel" | "badgesLabel";

const LABEL_SECTIONS: LabelSection<NuzlockeLabelKey>[] = [
    {key: "showNuzlockeLabel", textKey: "nuzlockeLabel", title: "Nuzlocke", placeholder: "Nuzlocke"},
    {key: "showTrainerLabel", textKey: "trainerLabel", title: "Trainer", placeholder: "Trainer"},
    {key: "showTeamLabel", textKey: "teamLabel", title: "Team", placeholder: "Team"},
    {key: "showGraveyardLabel", textKey: "graveyardLabel", title: "Graveyard", placeholder: "Graveyard"},
    {key: "showBadgesLabel", textKey: "badgesLabel", title: "Badges", placeholder: "Badges"},
];


function HomeInner({username}: { username: string }) {
    const [stats, setStats] = useState<NuzlockeState | undefined>();

    const [notFound, setNotFound] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canManageEditors, setCanManageEditors] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/${username}/permissions`)
            .then(res => res.json())
            .then((data: { isOwner: boolean; canEdit: boolean; canManageEditors: boolean }) => {
                if (!cancelled) {
                    setIsOwner(data.isOwner);
                    setCanEdit(data.canEdit);
                    setCanManageEditors(data.canManageEditors);
                }
            })
            .catch(() => {/* not logged in / offline: stay read-only */
            });
        return () => {
            cancelled = true;
        };
    }, [username]);

    useEffect(() => {
        let es: EventSource | null = null;

        const startStream = () => {
            if (es) {
                es.close();
            }

            console.log(`Starting EventSource stream for: ${username}`);
            es = new EventSource(`/api/${username}/stream`);

            es.onmessage = (e) => {
                if ('data' in e) {
                    try {
                        const stat = JSON.parse(e.data) as NuzlockeState;
                        setStats(stat);
                    } catch (err) {
                        console.error("Failed to parse SSE data", err);
                    }
                } else {
                    setNotFound(true);
                    es?.close();
                }
            };

            es.addEventListener("not_found", (e) => {
                setNotFound(true);
                es?.close();
            });

            es.onerror = (e) => {
                console.log("Stream connection error", e);
                if (es?.readyState === EventSource.CLOSED) {
                    setNotFound(true);
                }
            };
        };

        startStream();

        return () => {
            console.log(`Cleaning up stream for: ${username}`);
            if (es) {
                es.close();
            }
        };
    }, [username]);

    if (notFound) {
        return (
            <div className="text-yellow-500 p-4">
                <main className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex flex-row items-center gap-4">
                        <h1 className="font-bold text-2xl text-yellow-300">
                            User not found or Stats not enabled
                        </h1>
                    </div>
                </main>
            </div>
        )
    }

    if (!stats) return (
        <div>Loading...</div>
    )

    return (
        <div className="text-yellow-500 p-4">
            <main className="max-w-7xl mx-auto flex flex-col gap-4">
                <div className="flex justify-center">
                    <a href={`https://twitch.tv/${username}`}
                       className="flex flex-row items-center gap-2 bg-[#9146ff] hover:bg-[#7d2ff7] text-white text-sm font-bold pl-2 pr-3 py-1.5 rounded-lg transition-colors">
                        <img src="/glitch_white.svg" alt="" className="w-4 h-4"/>
                        <p>{username}</p>
                    </a>
                </div>
                <div className="flex justify-center items-center gap-2">
                    <TeamBox team={stats.team} label={stats.showTeamLabel ? stats.teamLabel : ""} color={stats.teamColor} textColor={stats.textColor} className="w-full max-w-md"/>
                    <Graveyard label={stats.showGraveyardLabel ? stats.graveyardLabel : undefined} pokemon={stats.graveyard} color={stats.graveyardColor} textColor={stats.textColor} className="w-full flex-1 min-h-20">
                    </Graveyard>
                </div>

                {canEdit && <TeamEditor apiUrl={`/api/${username}`} field="team" team={stats.team} label="Edit Team"/>}
                {canEdit && <GraveyardEditor apiUrl={`/api/${username}`} field="graveyard" graveyard={stats.graveyard} label="Edit Graveyard"/>}
                {canEdit && <BadgesEditor apiUrl={`/api/${username}`} field="badges" badges={stats.badges} label="Edit Badges"/>}
                {canEdit && (
                    <LabelsEditor
                        apiUrl={`/api/${username}`}
                        sections={LABEL_SECTIONS}
                        values={{
                            showNuzlockeLabel: stats.showNuzlockeLabel,
                            nuzlockeLabel: stats.nuzlockeLabel,
                            showTrainerLabel: stats.showTrainerLabel,
                            trainerLabel: stats.trainerLabel,
                            showTeamLabel: stats.showTeamLabel,
                            teamLabel: stats.teamLabel,
                            showGraveyardLabel: stats.showGraveyardLabel,
                            graveyardLabel: stats.graveyardLabel,
                            showBadgesLabel: stats.showBadgesLabel,
                            badgesLabel: stats.badgesLabel,
                        }}
                    />
                )}
                {canEdit && (
                    <OverlaySettingsEditor
                        apiUrl={`/api/${username}`}
                        values={{
                            mainWidth: stats.mainWidth,
                            mainAspectRatio: stats.mainAspectRatio,
                            camMode: stats.camMode,
                            frameBorderColor: stats.frameBorderColor,
                            teamColor: stats.teamColor,
                            graveyardColor: stats.graveyardColor,
                            textColor: stats.textColor,
                            badgesEnabled: stats.badgesEnabled,
                        }}
                    />
                )}
                {(isOwner || canManageEditors) && <EditorManager username={username} isOwner={isOwner}/>}
            </main>
        </div>
    );
}


export default function UserPage({params}: { params: Promise<{ username: string }> }) {
    const {username} = use(params);
    return (
        <Suspense>
            <HomeInner key={username} username={username}/>
        </Suspense>
    );
}

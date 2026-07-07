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
import NuzlockeEncountersEditor from "@/app/components/NuzlockeEncountersEditor";

type NuzlockeLabelKey = "showNuzlockeLabel" | "nuzlockeLabel" | "showTrainerLabel" | "trainerLabel"
    | "showTeamLabel" | "teamLabel" | "showGraveyardLabel" | "graveyardLabel" | "showBadgesLabel" | "badgesLabel";

const LABEL_SECTIONS: LabelSection<NuzlockeLabelKey>[] = [
    {key: "showNuzlockeLabel", textKey: "nuzlockeLabel", title: "Nuzlocke", placeholder: "Nuzlocke"},
    {key: "showTrainerLabel", textKey: "trainerLabel", title: "Trainer", placeholder: "Trainer"},
    {key: "showTeamLabel", textKey: "teamLabel", title: "Team", placeholder: "Team"},
    {key: "showGraveyardLabel", textKey: "graveyardLabel", title: "Graveyard", placeholder: "Graveyard"},
    {key: "showBadgesLabel", textKey: "badgesLabel", title: "Badges", placeholder: "Badges"},
];


function HomeInner({token}: { token: string }) {
    const [stats, setStats] = useState<NuzlockeState | undefined>();

    const [notFound, setNotFound] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canManageEditors, setCanManageEditors] = useState(false);

    const apiUrl = `/api/nuzlocke/${token}`;

    useEffect(() => {
        let cancelled = false;
        fetch(`${apiUrl}/permissions`)
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
    }, [apiUrl]);

    useEffect(() => {
        let es: EventSource | null = null;

        const startStream = () => {
            if (es) {
                es.close();
            }

            es = new EventSource(`${apiUrl}/stream`);

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

            es.addEventListener("not_found", () => {
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
            if (es) {
                es.close();
            }
        };
    }, [apiUrl]);

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
                    <a href={`https://twitch.tv/${stats.user}`}
                       className="flex flex-row items-center gap-2 bg-[#9146ff] hover:bg-[#7d2ff7] text-white text-sm font-bold pl-2 pr-3 py-1.5 rounded-lg transition-colors">
                        <img src="/glitch_white.svg" alt="" className="w-4 h-4"/>
                        <p>{stats.user}</p>
                    </a>
                </div>
                {canEdit ? <div>
                        <TeamEditor apiUrl={apiUrl} field="team" team={stats.team} label="Edit Team"/>
                        <GraveyardEditor apiUrl={apiUrl} field="graveyard" graveyard={stats.graveyard} label="Edit Graveyard"/>
                        <BadgesEditor apiUrl={apiUrl} field="badges" badges={stats.badges} label="Edit Badges"/>
                        <NuzlockeEncountersEditor apiUrl={apiUrl} encounters={stats.encounters}/>
                        <LabelsEditor
                            apiUrl={apiUrl}
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
                        <OverlaySettingsEditor
                            apiUrl={apiUrl}
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
                    </div>
                    : <></>}
                {(isOwner || canManageEditors) && <EditorManager apiUrl={`${apiUrl}/editors`} isOwner={isOwner}/>}
            </main>
        </div>
    );
}


export default function EditPage({params}: { params: Promise<{ token: string }> }) {
    const {token} = use(params);
    return (
        <Suspense>
            <HomeInner key={token} token={token}/>
        </Suspense>
    );
}

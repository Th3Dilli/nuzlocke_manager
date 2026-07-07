"use client";

import {use} from "react";
import {SoullinkState} from "@/app/lib/types/SoullinkState";
import {Suspense, useEffect, useState} from "react";
import TeamEditor from "@/app/components/TeamEditor";
import GraveyardEditor from "@/app/components/GraveyardEditor";
import BadgesEditor from "@/app/components/BadgesEditor";
import EditorManager from "@/app/components/EditorManager";
import LabelsEditor, {LabelSection} from "@/app/components/LabelsEditor";
import SoullinkSettingsEditor from "@/app/components/SoullinkSettingsEditor";
import TeamBox, {Graveyard} from "@/app/components/TeamBox";

type SoullinkLabelKey = "showSoullink1Label" | "soullink1Label" | "showSoullink2Label" | "soullink2Label"
    | "showTrainer1Label" | "trainer1Label" | "showTrainer2Label" | "trainer2Label"
    | "showTeam1Label" | "team1Label" | "showTeam2Label" | "team2Label"
    | "showGraveyard1Label" | "graveyard1Label" | "showGraveyard2Label" | "graveyard2Label"
    | "showBadgesLabel" | "badgesLabel";

const LABEL_SECTIONS: LabelSection<SoullinkLabelKey>[] = [
    {key: "showSoullink1Label", textKey: "soullink1Label", title: "Soul Link 1", placeholder: "Soul Link 1"},
    {key: "showSoullink2Label", textKey: "soullink2Label", title: "Soul Link 2", placeholder: "Soul Link 2"},
    {key: "showTrainer1Label", textKey: "trainer1Label", title: "Trainer 1", placeholder: "Trainer 1"},
    {key: "showTrainer2Label", textKey: "trainer2Label", title: "Trainer 2", placeholder: "Trainer 2"},
    {key: "showTeam1Label", textKey: "team1Label", title: "Team 1", placeholder: "Team 1"},
    {key: "showTeam2Label", textKey: "team2Label", title: "Team 2", placeholder: "Team 2"},
    {key: "showGraveyard1Label", textKey: "graveyard1Label", title: "Graveyard 1", placeholder: "Graveyard 1"},
    {key: "showGraveyard2Label", textKey: "graveyard2Label", title: "Graveyard 2", placeholder: "Graveyard 2"},
    {key: "showBadgesLabel", textKey: "badgesLabel", title: "Badges", placeholder: "Badges"},
];

function TeamColumn({label, team, teamLabel, graveyard, graveyardLabel, teamColor, graveyardColor, textColor}: {
    label: string;
    team: number[];
    teamLabel?: string;
    graveyard: number[];
    graveyardLabel?: string;
    teamColor?: string;
    graveyardColor?: string;
    textColor?: string;
}) {
    return (
        <div className="flex flex-1 flex-col items-center gap-2">
            <h2 className="text-lg font-bold text-yellow-300">{label}</h2>
            <TeamBox team={team} label={teamLabel ?? ""} color={teamColor} textColor={textColor} className="w-full max-w-md"/>
            <Graveyard label={graveyardLabel} pokemon={graveyard} color={graveyardColor} textColor={textColor} className="w-full min-h-20">
            </Graveyard>
        </div>
    );
}

function HomeInner({username}: { username: string }) {
    const [stats, setStats] = useState<SoullinkState | undefined>();

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

            es = new EventSource(`/api/soullink/${username}/stream`);

            es.onmessage = (e) => {
                if ('data' in e) {
                    try {
                        const stat = JSON.parse(e.data) as SoullinkState;
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

    const apiUrl = `/api/soullink/${username}`;

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

                <div className="flex flex-col items-stretch gap-4 md:flex-row md:justify-center">
                    <TeamColumn
                        label="Team 1"
                        team={stats.team1}
                        teamLabel={stats.showTeam1Label ? stats.team1Label : ""}
                        graveyard={stats.graveyard1}
                        graveyardLabel={stats.showGraveyard1Label ? stats.graveyard1Label : undefined}
                        teamColor={stats.teamColor}
                        graveyardColor={stats.graveyardColor}
                        textColor={stats.textColor}
                    />
                    <TeamColumn
                        label="Team 2"
                        team={stats.team2}
                        teamLabel={stats.showTeam2Label ? stats.team2Label : ""}
                        graveyard={stats.graveyard2}
                        graveyardLabel={stats.showGraveyard2Label ? stats.graveyard2Label : undefined}
                        teamColor={stats.teamColor}
                        graveyardColor={stats.graveyardColor}
                        textColor={stats.textColor}
                    />
                </div>

                {canEdit && (
                    <div className="flex flex-col gap-4 md:flex-row">
                        <div className="flex-1">
                            <TeamEditor apiUrl={apiUrl} field="team1" team={stats.team1} label="Edit Team 1"/>
                            <GraveyardEditor apiUrl={apiUrl} field="graveyard1" graveyard={stats.graveyard1} label="Edit Graveyard 1"/>
                        </div>
                        <div className="flex-1">
                            <TeamEditor apiUrl={apiUrl} field="team2" team={stats.team2} label="Edit Team 2"/>
                            <GraveyardEditor apiUrl={apiUrl} field="graveyard2" graveyard={stats.graveyard2} label="Edit Graveyard 2"/>
                        </div>
                    </div>
                )}
                {canEdit && <BadgesEditor apiUrl={apiUrl} field="badges" badges={stats.badges} label="Edit Badges"/>}
                {canEdit && (
                    <LabelsEditor
                        apiUrl={apiUrl}
                        sections={LABEL_SECTIONS}
                        values={{
                            showSoullink1Label: stats.showSoullink1Label,
                            soullink1Label: stats.soullink1Label,
                            showSoullink2Label: stats.showSoullink2Label,
                            soullink2Label: stats.soullink2Label,
                            showTrainer1Label: stats.showTrainer1Label,
                            trainer1Label: stats.trainer1Label,
                            showTrainer2Label: stats.showTrainer2Label,
                            trainer2Label: stats.trainer2Label,
                            showTeam1Label: stats.showTeam1Label,
                            team1Label: stats.team1Label,
                            showTeam2Label: stats.showTeam2Label,
                            team2Label: stats.team2Label,
                            showGraveyard1Label: stats.showGraveyard1Label,
                            graveyard1Label: stats.graveyard1Label,
                            showGraveyard2Label: stats.showGraveyard2Label,
                            graveyard2Label: stats.graveyard2Label,
                            showBadgesLabel: stats.showBadgesLabel,
                            badgesLabel: stats.badgesLabel,
                        }}
                    />
                )}
                {canEdit && (
                    <SoullinkSettingsEditor
                        apiUrl={apiUrl}
                        values={{
                            mainAspectRatio: stats.mainAspectRatio,
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

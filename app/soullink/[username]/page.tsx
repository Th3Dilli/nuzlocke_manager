"use client";

import {use} from "react";
import {SoullinkState} from "@/app/lib/types/SoullinkState";
import {Suspense, useEffect, useState} from "react";
import TeamBox, {BadgesV, Graveyard} from "@/app/components/TeamBox";

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
            <Graveyard label={graveyardLabel} pokemon={graveyard} color={graveyardColor} textColor={textColor} className="w-full min-h-20"/>
        </div>
    );
}

function HomeInner({username}: { username: string }) {
    const [stats, setStats] = useState<SoullinkState | undefined>();
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let es: EventSource | null = null;

        const startStream = () => {
            if (es) {
                es.close();
            }

            es = new EventSource(`/api/soullink/public/${username}/stream`);

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

    return (
        <div className="text-yellow-500 p-4">
            <main className="max-w-7xl mx-auto flex flex-col gap-4">
                <div className="flex justify-center">
                    <a href={`https://twitch.tv/${stats.user}`}
                       className="flex flex-row items-center gap-2 bg-[#9146ff] hover:bg-[#7d2ff7] text-white text-sm font-bold pl-2 pr-3 py-1.5 rounded-lg transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/glitch_white.svg" alt="" className="w-4 h-4"/>
                        <p>{stats.user}</p>
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

                {stats.badgesEnabled && (
                    <BadgesV badges={stats.badges} label={stats.showBadgesLabel ? stats.badgesLabel : undefined} textColor={stats.textColor} className="h-auto min-h-20 w-full"/>
                )}
            </main>
        </div>
    );
}


export default function PublicPage({params}: { params: Promise<{ username: string }> }) {
    const {username} = use(params);
    return (
        <Suspense>
            <HomeInner key={username} username={username}/>
        </Suspense>
    );
}

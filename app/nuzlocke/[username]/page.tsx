"use client";

import {use} from "react";
import {NuzlockeState} from "@/app/lib/types/NuzlockeState";
import {Suspense, useEffect, useState} from "react";
import TeamBox, {BadgesV, Graveyard} from "@/app/components/TeamBox";

function HomeInner({username}: { username: string }) {
    const [stats, setStats] = useState<NuzlockeState | undefined>();
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let es: EventSource | null = null;

        const startStream = () => {
            if (es) {
                es.close();
            }

            es = new EventSource(`/api/nuzlocke/public/${username}/stream`);

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
            <main className="max-w-3xl mx-auto flex flex-col items-center gap-4">
                <a href={`https://twitch.tv/${stats.user}`}
                   className="flex flex-row items-center gap-2 bg-[#9146ff] hover:bg-[#7d2ff7] text-white text-sm font-bold pl-2 pr-3 py-1.5 rounded-lg transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/glitch_white.svg" alt="" className="w-4 h-4"/>
                    <p>{stats.user}</p>
                </a>

                <div className="flex w-full justify-center items-center gap-2">
                    <TeamBox team={stats.team} label={stats.showTeamLabel ? stats.teamLabel : ""} color={stats.teamColor} textColor={stats.textColor} className="w-full max-w-md"/>
                    <Graveyard label={stats.showGraveyardLabel ? stats.graveyardLabel : undefined} pokemon={stats.graveyard} color={stats.graveyardColor} textColor={stats.textColor} className="w-full flex-1 min-h-20"/>
                </div>

                {stats.badgesEnabled && stats.badges.length > 0 && (
                    <BadgesV badges={stats.badges} label={stats.showBadgesLabel ? stats.badgesLabel : undefined} textColor={stats.textColor} className="h-auto w-full"/>
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

"use client";

import {use} from "react";
import {Stat} from "@/app/lib/types/Stat";
import {Suspense, useEffect, useState} from "react";
import TeamEditor from "@/app/components/TeamEditor";
import GraveyardEditor from "@/app/components/GraveyardEditor";
import EditorManager from "@/app/components/EditorManager";
import TeamBox, {Graveyard} from "@/app/components/TeamBox";


function HomeInner({username}: { username: string }) {
    const [stats, setStats] = useState<Stat | undefined>();

    const [notFound, setNotFound] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/stats/${username}/permissions`)
            .then(res => res.json())
            .then((data: { isOwner: boolean; canEdit: boolean }) => {
                if (!cancelled) {
                    setIsOwner(data.isOwner);
                    setCanEdit(data.canEdit);
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
            es = new EventSource(`/api/stats/${username}/stream`);

            es.onmessage = (e) => {
                if ('data' in e) {
                    try {
                        const stat = JSON.parse(e.data) as Stat;
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
                        <img src="glitch_white.svg" className="w-4 h-4">
                        </img>
                        <p>{username}</p>
                    </a>
                </div>
                <div className="flex justify-center items-center gap-2">
                    <TeamBox team={stats.team}/>
                    <Graveyard label="Graveyard" className="w-full flex-1 h-20">
                        <div className="flex h-16 flex-row flex-wrap content-start ">
                            {stats.graveyard.length === 0 ? (
                                <span className="m-auto text-lg opacity-40">No fallen Pokémon yet</span>
                            ) : (
                                stats.graveyard.map((id, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        key={`${id}-${i}`}
                                        src={`/showdown/${id}.gif`}
                                        alt=""
                                        className="h-16 w-16 object-contain opacity-80 grayscale [image-rendering:pixelated]"
                                    />
                                ))
                            )}
                        </div>
                    </Graveyard>
                </div>

                {canEdit && <TeamEditor username={username} stats={stats}/>}
                {canEdit && <GraveyardEditor username={username} stats={stats}/>}
                {isOwner && <EditorManager username={username}/>}
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

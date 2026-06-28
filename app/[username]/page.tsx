"use client";

import {use} from "react";
import {Stat} from "@/app/lib/types/Stat";
import {Suspense, useEffect, useState} from "react";
import TeamEditor from "@/app/components/TeamEditor";


function HomeInner({username}: { username: string }) {
    const [stats, setStats] = useState<Stat|undefined>();

    const [notFound, setNotFound] = useState(false);
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/me")
            .then(res => res.json())
            .then((data: { username: string | null }) => {
                if (!cancelled) setIsOwner(data.username === username);
            })
            .catch(() => {/* not logged in / offline: stay read-only */});
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
                        <h1 className="cinzel font-bold text-2xl text-yellow-300">
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
                {stats.user}
                <img className="w-16 h-16" src={`/showdown/${stats.team1}.gif`}/>
                <img className="w-16 h-16" src={`/showdown/${stats.team2}.gif`}/>
                <img className="w-16 h-16" src={`/showdown/${stats.team3}.gif`}/>
                <img className="w-16 h-16" src={`/showdown/${stats.team4}.gif`}/>
                <img className="w-16 h-16" src={`/showdown/${stats.team5}.gif`}/>
                <img className="w-16 h-16" src={`/showdown/${stats.team6}.gif`}/>

                {isOwner && <TeamEditor username={username} stats={stats}/>}
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

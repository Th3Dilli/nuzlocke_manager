"use client";

import {Stat} from "@/app/lib/types/Stat";
import {Suspense, use, useEffect, useState} from "react";

function OverlayInner({username}: { username: string }) {

    const [stats, setStats] = useState<Stat>();
    const [notFound, setNotFound] = useState(false);
    useEffect(() => {
        const es = new EventSource(`/api/stats/${username}/stream`);
        es.onmessage = (e) => {
            if ('data' in e) {
                const stat = JSON.parse(e.data) as Stat;
                setStats(stat);
            } else {
                setNotFound(true);
                return () => es.close();
            }
        };
        es.addEventListener("not_found", (e) => {
            //console.log("User not found event received");
            setNotFound(true);
            es.close();
        });

        es.onerror = (e) => {
            //console.log("Stream connection error", e);
            setNotFound(true);
        }
        return () => es.close();
    }, [username]);

    if (notFound) {
        return (
            <div>User not found</div>
        )
    }
    if (!stats) return (
        <div>Loading...</div>
    )
    return (
        <div className="overlay min-h-screen bg-neutral-950 text-yellow-500 p-4">
            <main className="max-w-7xl mx-auto flex flex-col gap-4">

                {/* Stats bar */}
                <div className="overlay-bar flex flex-row gap-6 border-5 border-red-600 rounded-xl px-5 py-3 w-fit items-center">
                    <img className="w-16 h-16" src={`/showdown/${stats.team1}.gif`}/>
                    <img className="w-16 h-16" src={`/showdown/${stats.team2}.gif`}/>
                    <img className="w-16 h-16" src={`/showdown/${stats.team3}.gif`}/>
                    <img className="w-16 h-16" src={`/showdown/${stats.team4}.gif`}/>
                    <img className="w-16 h-16" src={`/showdown/${stats.team5}.gif`}/>
                    <img className="w-16 h-16" src={`/showdown/${stats.team6}.gif`}/>
                </div>

            </main>
        </div>
    );
}

export default function Overlay({params}: { params: Promise<{ username: string }> }) {
    const {username} = use(params);
    return (
        <Suspense>
            <OverlayInner username={username}/>
        </Suspense>
    );
}


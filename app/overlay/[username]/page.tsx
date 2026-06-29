"use client";

import {Stat} from "@/app/lib/types/Stat";
import {Component, ReactNode, Suspense, use, useEffect, useState} from "react";
import TeamBox, {Graveyard, Pokeball, TitleTab} from "@/app/components/TeamBox";

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
            <div className="overlay flex h-screen w-screen items-center justify-center text-2xl text-yellow-300">
                User not found
            </div>
        )
    }
    if (!stats) return (
        <div className="overlay flex h-screen w-screen items-center justify-center text-2xl text-yellow-300">
            Loading...
        </div>
    )

// Change this value to adjust the layout.
// The math will automatically handle everything else.
    const MAIN_SCREEN_WIDTH = 1250;

    return (
        <div
            className="overlay relative flex h-[1080px] w-[1920px] gap-4 overflow-hidden p-4 text-yellow-300 bg-transparent"
            style={{
                // Pass the width to CSS variables so Tailwind calc can read it
                "--main-w": `${MAIN_SCREEN_WIDTH}px`,
                "--main-h": `${(MAIN_SCREEN_WIDTH * 3) / 4}px`, // Forces 4:3 height
                // Right column width is whatever is left over from 1920px
                "--right-w": `${1920 - 32 - 16 - MAIN_SCREEN_WIDTH}px`,
                "--right-sub-h": `${((1920 - 32 - 16 - MAIN_SCREEN_WIDTH) * 3) / 4}px` // 4:3 right bottom frame
            } as React.CSSProperties}
        >

            {/* Left Column Container */}
            <div className="flex flex-col gap-4 shrink-0 aspect-4/3] min-h-[var(--main-h)] min-w-[var(--main-W)]">
                <Frame label="Nuzlocke" className="aspect-4/3 min-h-[var(--main-h)] min-w-[var(--main-W)] shrink-0" />

                <Graveyard label="Graveyard" className="w-full flex-1 min-h-0">
                    <div className="flex flex-row gap-2">
                        {stats.team.map((id, i) => (
                            <div key={i} className="flex flex-1 items-center justify-center">
                                {id ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={`/showdown/${id}.gif`}
                                        alt=""
                                        className=" [image-rendering:pixelated]"
                                    />
                                ) : (
                                    <Pokeball className="h-3/4 w-3/4 opacity-30"/>
                                )}
                            </div>
                        ))}
                    </div>
                </Graveyard>
            </div>

            {/* Right column: Space automatically computes to remaining width */}
            <div className="flex flex-1 flex-col gap-4 min-w-0">
                {/* Trainer/Cam Frame: Dynamically fills top right vertical space */}
                <Frame label="Trainer" className="flex-1 min-h-0" />

                {/* Pokemon Team Box */}
                <TeamBox team={stats.team} />

                {/* Second Screen Frame: Perfect 4:3 aspect ratio based on remaining space */}
                <Frame className="w-[var(--right-w)] h-[var(--right-sub-h)] shrink-0" />
            </div>

        </div>
    );
}

// A transparent, red-bordered cut-out with a floating pokéball title tab. The
// streamer places the matching OBS source (game capture / webcam) behind the
// browser source and aligns it to this frame.
function Frame({label, className, children}: { label?: string; className?: string; children?: ReactNode }) {
    return (
        <div className={`relative rounded-2xl border-8 border-red-400 ${className ?? ""}`}>
            {label ? <TitleTab label={label}/> : <></>}
            {children}
        </div>
    );
}





// Decorative CSS pokéball used for badges and empty team slots.


export default function Overlay({params}: { params: Promise<{ username: string }> }) {
    const {username} = use(params);
    return (
        <Suspense>
            <OverlayInner username={username}/>
        </Suspense>
    );
}

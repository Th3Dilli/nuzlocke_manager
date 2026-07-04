"use client";

import {SoullinkState} from "@/app/lib/types/SoullinkState";
import {ReactNode, Suspense, use, useEffect, useState} from "react";
import TeamBox, {Graveyard, TitleTab} from "@/app/components/TeamBox";

// Width of each main game-capture frame (4:3, so height follows). The two
// frames flank a vertical team-box strip in the leftover center space —
// tune this (and TEAM_COLUMN_WIDTH below) to taste once placed in OBS.
const MAIN_FRAME_WIDTH = 740;
const TEAM_COLUMN_WIDTH = 150;
// Square trainer cam, one per side, centered below that side's main frame.
const TRAINER_SIZE = 310;
const GRAVEYARD_HEIGHT = 150;

function OverlayInner({username}: { username: string }) {

    const [stats, setStats] = useState<SoullinkState>();
    const [notFound, setNotFound] = useState(false);
    useEffect(() => {
        const es = new EventSource(`/api/soullink/${username}/stream`);
        es.onmessage = (e) => {
            if ('data' in e) {
                const stat = JSON.parse(e.data) as SoullinkState;
                setStats(stat);
            } else {
                setNotFound(true);
                return () => es.close();
            }
        };
        es.addEventListener("not_found", () => {
            setNotFound(true);
            es.close();
        });

        es.onerror = () => {
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

    return (
        <div
            className="overlay relative flex h-[1080px] w-[1920px] flex-col gap-4 overflow-hidden p-4 text-yellow-300 bg-transparent"
            style={{
                "--main-w": `${MAIN_FRAME_WIDTH}px`,
                "--main-h": `${(MAIN_FRAME_WIDTH * 3) / 4}px`,
                "--team-w": `${TEAM_COLUMN_WIDTH}px`,
                "--trainer-size": `${TRAINER_SIZE}px`,
                "--graveyard-h": `${GRAVEYARD_HEIGHT}px`,
            } as React.CSSProperties}
        >
            {/* Two side groups: each side's main 4:3 frame + vertical team
                box on top, with that side's square trainer cam centered
                below it. Pinned to the top, graveyards fill the rest. */}
            <div className="flex shrink-0 justify-center gap-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex shrink-0 gap-4">
                        <Frame label={stats.showSoullink1Label ? stats.soullink1Label : undefined} className="h-[var(--main-h)] w-[var(--main-w)] shrink-0"/>
                        <TeamBox label={stats.showTeam1Label ? stats.team1Label : ""} team={stats.team1} direction="column" className="h-[var(--main-h)] w-[var(--team-w)] shrink-0"/>
                    </div>
                    <Frame label={stats.showTrainer1Label ? stats.trainer1Label : undefined} className="h-[var(--trainer-size)] w-[var(--trainer-size)] shrink-0"/>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <div className="flex shrink-0 gap-4">
                        <TeamBox label={stats.showTeam2Label ? stats.team2Label : ""} team={stats.team2} direction="column" className="h-[var(--main-h)] w-[var(--team-w)] shrink-0"/>
                        <Frame label={stats.showSoullink2Label ? stats.soullink2Label : undefined} className="h-[var(--main-h)] w-[var(--main-w)] shrink-0"/>
                    </div>
                    <Frame label={stats.showTrainer2Label ? stats.trainer2Label : undefined} className="h-[var(--trainer-size)] w-[var(--trainer-size)] shrink-0"/>
                </div>
            </div>

            <div className="flex h-[var(--graveyard-h)] shrink-0 gap-4">
                <Graveyard label={stats.showGraveyard1Label ? stats.graveyard1Label : undefined} pokemon={stats.graveyard1} className="min-w-0 flex-1">
                </Graveyard>
                <Graveyard label={stats.showGraveyard2Label ? stats.graveyard2Label : undefined} pokemon={stats.graveyard2} className="min-w-0 flex-1">
                </Graveyard>
            </div>
        </div>
    );
}

function GraveyardEntries({graveyard}: { graveyard: number[] }) {
    return (
        <div className="flex h-full flex-row flex-wrap content-start ">
            {graveyard.length === 0 ? (
                <span className="m-auto text-lg opacity-40">No fallen Pokémon yet</span>
            ) : (
                graveyard.map((id, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={`${id}-${i}`}
                        src={`/showdown/${id}.gif`}
                        alt=""
                        className="h-16 w-16 object-contain opacity-80 [image-rendering:pixelated]"
                    />
                ))
            )}
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

export default function Overlay({params}: { params: Promise<{ username: string }> }) {
    const {username} = use(params);
    return (
        <Suspense>
            <OverlayInner username={username}/>
        </Suspense>
    );
}

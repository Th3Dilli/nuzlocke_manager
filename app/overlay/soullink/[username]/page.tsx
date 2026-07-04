"use client";

import {SoullinkState} from "@/app/lib/types/SoullinkState";
import {ReactNode, Suspense, use, useEffect, useState} from "react";
import {Graveyard, TeamBoxV, TitleTab} from "@/app/components/TeamBox";


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
        <div className="h-[1080px] w-[1920px] gap-2 overlay">
            <div className="flex flex-col  w-full h-full">
                <div className="flex flex-row p-2">
                    <div className="flex-1 flex flex-row gap-2">
                        <Frame label={stats.showSoullink1Label ? stats.soullink1Label : undefined}
                               color={stats.frameBorderColor}
                               textColor={stats.textColor}
                               className="aspect-4/3 flex-1"/>
                        <div className="w-34">
                            <TeamBoxV label={stats.showTeam1Label ? stats.team1Label : ""}
                                      team={stats.team1}
                                      color={stats.teamColor}
                                      textColor={stats.textColor} className="h-123"/>
                        </div>
                    </div>

                    <div className="w-74">
                        
                    </div>

                    <div className="flex-1 flex flex-row-reverse gap-2">
                        <Frame label={stats.showSoullink2Label ? stats.soullink2Label : undefined}
                               color={stats.frameBorderColor}
                               textColor={stats.textColor}
                               className="aspect-4/3 flex-1"/>
                        <div className="w-34">
                            <TeamBoxV label={stats.showTeam2Label ? stats.team2Label : ""}
                                      team={stats.team2}
                                      color={stats.teamColor}
                                      textColor={stats.textColor} className="h-123"/>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-row p-2 gap-2 ">
                    <div className="flex-1 flex w-1/2 h-full ">
                        <Frame label={stats.showTrainer1Label ? stats.trainer1Label : undefined} color={stats.frameBorderColor}
                               textColor={stats.textColor} className="flex-1"/>
                    </div>

                    <div className="flex-1 w-1/2 h-full flex flex-col gap-3 min-h-0">
                        <Frame
                               color={stats.frameBorderColor}
                               textColor={stats.textColor}
                               className="aspect-4/3"/>
                        <Graveyard label={stats.showGraveyard1Label ? stats.graveyard1Label : undefined} pokemon={stats.graveyard1}
                                   color={stats.graveyardColor} textColor={stats.textColor} size="10" className="flex-1 min-h-0"/>
                    </div>

                    <div className="flex-1 w-1/2 h-full flex flex-col gap-3 min-h-0">
                        <Frame
                               color={stats.frameBorderColor}
                               textColor={stats.textColor}
                               className="aspect-4/3"/>
                        <Graveyard label={stats.showGraveyard2Label ? stats.graveyard2Label : undefined} pokemon={stats.graveyard2}
                                   color={stats.graveyardColor} textColor={stats.textColor} size="10" className="flex-1 min-h-0"/>
                    </div>

                    <div className="flex-1 flex">
                        <Frame label={stats.showTrainer2Label ? stats.trainer2Label : undefined} color={stats.frameBorderColor}
                               textColor={stats.textColor} className="flex-1"/>
                    </div>
                </div>
            </div>
        </div>
    );
}


function Frame({label, className, color = "#f87171", textColor}: { label?: string; className?: string; color?: string; textColor?: string }) {
    return (
        <div className={`relative rounded-2xl border-12 box-content ${className ?? ""}`} style={{borderColor: color}}>
            {label ? <TitleTab label={label} borderColor={color} textColor={textColor}/> : <></>}
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

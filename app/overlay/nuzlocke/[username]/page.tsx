"use client";

import {NuzlockeState} from "@/app/lib/types/NuzlockeState";
import {Component, ReactNode, Suspense, use, useEffect, useState} from "react";
import TeamBox, {Graveyard, Pokeball, TitleTab} from "@/app/components/TeamBox";

function OverlayInner({username}: { username: string }) {

    const [state, setState] = useState<NuzlockeState>();
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const es = new EventSource(`/api/${username}/stream`);
        es.onmessage = (e) => {
            if ('data' in e) {
                const stat = JSON.parse(e.data) as NuzlockeState;
                setState(stat);
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
    if (!state) return (
        <div className="overlay flex h-screen w-screen items-center justify-center text-2xl text-yellow-300">
            Loading...
        </div>
    )
    function getLayout(state: NuzlockeState) {
        const camMode = state.camMode;
        if (camMode === "4") {
            return (<div className="flex flex-1 flex-row gap-2">
                <Frame label={state.showTrainerLabel ? state.trainerLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={`flex-1`}/>
                <div className="flex-1"></div>
            </div>)
        } else if (camMode === "3") {
            return (<div className="flex flex-1 flex-row gap-2">
                <div className="flex-1"></div>
                <Frame label={state.showTrainerLabel ? state.trainerLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={`flex-1`}/>
            </div>)
        } else if (camMode === "2") {
            return (<div className="flex flex-1 flex-row gap-2">
                <div className="flex-none w-1/4"></div>
                <Frame label={state.showTrainerLabel ? state.trainerLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={`flex-auto w-1/2`}/>
                <div className="flex-auto w-1/4"></div>
            </div>)
        } else if (camMode === "1") {
            return (
                <Frame label={state.showTrainerLabel ? state.trainerLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={`flex-1`}/>
            )
        }
    }
    return (
        <div className="flex h-[1080px] w-[1920px] gap-2 p-2 overlay">

            <div className={`flex flex-col gap-2 `} style={{width: `${state.mainWidth}px`}}>
                <Frame label={state.showNuzlockeLabel ? state.nuzlockeLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={`aspect-4/3`} />

                <Graveyard label={state.showGraveyardLabel ? state.graveyardLabel : undefined} pokemon={state.graveyard}
                           color={state.graveyardColor} textColor={state.textColor} className="flex-1">
                </Graveyard>
            </div>

            <div className="flex flex-1 flex-col gap-4">
                {getLayout(state)}
                <TeamBox team={state.team} label={state.showTeamLabel ? state.teamLabel : ""} color={state.teamColor} textColor={state.textColor} className="h-24"/>
                <Frame color={state.frameBorderColor} textColor={state.textColor} className="aspect-4/3"/>
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





// Decorative CSS pokéball used for badges and empty team slots.


export default function Overlay({params}: { params: Promise<{ username: string }> }) {
    const {username} = use(params);
    return (
        <Suspense>
            <OverlayInner username={username}/>
        </Suspense>
    );
}

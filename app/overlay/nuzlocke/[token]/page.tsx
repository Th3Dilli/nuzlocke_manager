"use client";

import {MainAspectRatio, NuzlockeState} from "@/app/lib/types/NuzlockeState";
import {Suspense, use, useEffect, useState} from "react";
import TeamBox, {BadgesV, Graveyard, TitleTab} from "@/app/components/TeamBox";

const ASPECT_RATIO_CLASS: Record<MainAspectRatio, string> = {
    "4/3": "aspect-4/3",
    "5/3": "aspect-5/3",
};

function OverlayInner({token}: { token: string }) {

    const [state, setState] = useState<NuzlockeState>();
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const es = new EventSource(`/api/nuzlocke/${token}/stream`);
        es.onmessage = (e) => {
            if ('data' in e) {
                const stat = JSON.parse(e.data) as NuzlockeState;
                setState(stat);
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
    }, [token]);

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
        if (camMode === "5") {
            return (<div className="flex flex-1 flex-row gap-2">
                <Frame label={state.showTrainerLabel ? state.trainerLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={`flex-1`}/>
                <div className="flex-1">
                    {state.badgesEnabled && <BadgesV badges={state.badges} label={state.showBadgesLabel ? state.badgesLabel : undefined} textColor={state.textColor} className="h-102 w-42"/>}
                </div>
            </div>)
        } else if (camMode === "4") {
            return (<div className="flex flex-1 flex-row gap-2">
                <div className="flex-1 flex">
                    <div className="flex-1"></div>
                    {state.badgesEnabled ? <BadgesV badges={state.badges} label={state.showBadgesLabel ? state.badgesLabel : undefined} textColor={state.textColor} className="h-102 w-42"/> : <div className="h-102 w-42"></div>}
                </div>
                <Frame label={state.showTrainerLabel ? state.trainerLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={`flex-1`}/>
            </div>)
        } else if (camMode === "3") {
            return (<div className="flex flex-1 flex-row gap-2">
                <div className="flex-none w-1/4"></div>
                <Frame label={state.showTrainerLabel ? state.trainerLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={`flex-auto w-1/2`}/>
                {/*<div className="flex-auto w-1/4"></div>*/}
                {state.badgesEnabled ? <BadgesV badges={state.badges} label={state.showBadgesLabel ? state.badgesLabel : undefined} textColor={state.textColor} className="h-102 w-1/4 flex-auto"/> : <div className="h-102 w-40"></div>}
            </div>)
        } else if (camMode === "2") {
            return (<div className="flex flex-1 flex-row gap-2">
                <Frame label={state.showTrainerLabel ? state.trainerLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={`flex-auto w-1/2`}/>
                {state.badgesEnabled && <BadgesV badges={state.badges} label={state.showBadgesLabel ? state.badgesLabel : undefined} textColor={state.textColor} className="h-102 w-40"/>}
            </div>)
        } else if (camMode === "1") {
            return (<div className="flex flex-1 flex-row gap-2">
                {state.badgesEnabled && <BadgesV badges={state.badges} label={state.showBadgesLabel ? state.badgesLabel : undefined} textColor={state.textColor} className="h-102 w-40"/>}
                <Frame label={state.showTrainerLabel ? state.trainerLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={`flex-auto w-1/2`}/>
            </div>)
        }
    }
    return (
        <div className="flex h-[1080px] w-[1920px] gap-2 p-2 overlay">

            <div className={`flex flex-col gap-2 `} style={{width: `${state.mainWidth}px`}}>
                <Frame label={state.showNuzlockeLabel ? state.nuzlockeLabel : undefined} color={state.frameBorderColor} textColor={state.textColor} className={ASPECT_RATIO_CLASS[state.mainAspectRatio]} />

                {state.graveyardEnabled && <Graveyard label={state.showGraveyardLabel ? state.graveyardLabel : undefined} pokemon={state.graveyard}
                           color={state.graveyardColor} textColor={state.textColor} className="flex-1">
                </Graveyard>}
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

export default function Overlay({params}: { params: Promise<{ token: string }> }) {
    const {token} = use(params);
    return (
        <Suspense>
            <OverlayInner token={token}/>
        </Suspense>
    );
}

"use client";

import {use} from "react";
import {NuzlockeEncounter, PublicNuzlockeState} from "@/app/lib/types/NuzlockeState";
import {Suspense, useEffect, useState} from "react";
import TeamBox, {BadgesV, Graveyard} from "@/app/components/TeamBox";
import {DEFAULT_LANGUAGE, POKEMON, pokemonName} from "@/app/lib/pokemon";

const ACTION_LABEL: Record<NuzlockeEncounter["action"], string> = {
    caught: "Caught",
    dead: "Dead",
    not_caught: "Not Caught",
};

function EncounterPokemon({id}: { id: number }) {
    if (!id) return <span className="text-gray-600">—</span>;
    const pokemon = POKEMON.find(p => p.id === id);
    return (
        <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="h-8 w-8 [image-rendering:pixelated]" src={`/showdown/${id}.gif`} alt={pokemon ? pokemonName(pokemon, DEFAULT_LANGUAGE) : String(id)}/>
            <span className="capitalize">{pokemon ? pokemonName(pokemon, DEFAULT_LANGUAGE) : id}</span>
        </span>
    );
}

function EncountersTable({encounters, borderColor}: { encounters: NuzlockeEncounter[]; borderColor?: string }) {
    return (
        <div className="w-full overflow-x-auto bg-neutral-800/50 rounded-2xl border-[5px]" style={{borderColor: borderColor}}>
            <table className="w-full text-base">
                <thead>
                <tr className="text-left text-base uppercase tracking-wider text-yellow-300 bgdark m-4">
                    <th className="border-b-2 border-yellow-600/60 px-2 pt-2 pb-2 font-bold">Route</th>
                    <th className="border-b-2 border-yellow-600/60 px-2 pt-2 pb-2 font-bold">Pokémon</th>
                    <th className="border-b-2 border-yellow-600/60 px-2 pt-2 pb-2 font-bold">Action</th>
                </tr>
                </thead>
                <tbody>
                {encounters.length > 0 && encounters.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-neutral-900/50" : "bg-neutral-800/30"}>
                        <td className="border-b border-yellow-600/60 px-2 py-1.5">{row.route || "—"}</td>
                        <td className="border-b border-yellow-600/60 px-2 py-1.5"><EncounterPokemon id={row.pokemon}/></td>
                        <td className="border-b border-yellow-600/60 px-2 py-1.5">{ACTION_LABEL[row.action]}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

function HomeInner({username}: { username: string }) {
    const [stats, setStats] = useState<PublicNuzlockeState | undefined>();
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
                        const stat = JSON.parse(e.data) as PublicNuzlockeState;
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

                <div className="flex w-full flex-wrap justify-center items-center gap-4">
                    <TeamBox team={stats.team} label={stats.showTeamLabel ? stats.teamLabel : ""} color={stats.teamColor} textColor={stats.textColor} className="w-full max-w-md"/>
                    <Graveyard label={stats.showGraveyardLabel ? stats.graveyardLabel : undefined} pokemon={stats.graveyard} color={stats.graveyardColor} textColor={stats.textColor} className="w-full flex-1 min-w-50 min-h-20"/>
                </div>

                {stats.badges.length > 0 && <BadgesV badges={stats.badges} label={stats.showBadgesLabel ? stats.badgesLabel : undefined} textColor={stats.textColor} className="h-auto min-h-20 w-full"/>}

                {stats.encounters.length > 0 && <EncountersTable encounters={stats.encounters} borderColor={stats.teamColor}/>}
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

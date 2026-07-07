"use client";

import {use} from "react";
import {PublicSoullinkState, SoullinkEncounter} from "@/app/lib/types/SoullinkState";
import {Suspense, useEffect, useState} from "react";
import TeamBox, {BadgesV, Graveyard} from "@/app/components/TeamBox";
import {DEFAULT_LANGUAGE, POKEMON, pokemonName} from "@/app/lib/pokemon";

const ACTION_LABEL: Record<SoullinkEncounter["action"], string> = {
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

function EncountersTable({encounters, player1Name, player2Name, borderColor}: {
    encounters: SoullinkEncounter[];
    player1Name?: string;
    player2Name?: string;
    borderColor?: string;
}) {
    if (encounters.length === 0) return null;
    return (
        <div className="w-full overflow-x-auto bg-neutral-800/50 rounded-2xl border-[5px]" style={{borderColor: borderColor}}>
            <table className="w-full min-w-[640px] text-base">
                <thead>
                <tr className="text-left text-base tracking-wider text-yellow-300 bgdark">
                    <th className="border-b-2 border-yellow-600/60 px-2 pt-2 pb-2 font-bold">Route</th>
                    <th className="border-b-2 border-yellow-600/60 px-2 pt-2 pb-2 font-bold">{player1Name || "Player 1"}</th>
                    <th className="border-b-2 border-yellow-600/60 px-2 pt-2 pb-2 font-bold">{player2Name || "Player 2"}</th>
                    <th className="border-b-2 border-yellow-600/60 px-2 pt-2 pb-2 font-bold">Action</th>
                    <th className="border-b-2 border-yellow-600/60 px-2 pt-2 pb-2 font-bold">Lost due to</th>
                </tr>
                </thead>
                <tbody>
                {encounters.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-neutral-900/50" : "bg-neutral-800/30"}>
                        <td className="border-b border-yellow-600/60 px-2 py-1.5">{row.route || "—"}</td>
                        <td className="border-b border-yellow-600/60 px-2 py-1.5"><EncounterPokemon id={row.pokemon1}/></td>
                        <td className="border-b border-yellow-600/60 px-2 py-1.5"><EncounterPokemon id={row.pokemon2}/></td>
                        <td className="border-b border-yellow-600/60 px-2 py-1.5">{ACTION_LABEL[row.action]}</td>
                        <td className="border-b border-yellow-600/60 px-2 py-1.5">
                            {row.lostDueToPlayer === "player1" ? (player1Name || "Player 1")
                                : row.lostDueToPlayer === "player2" ? (player2Name || "Player 2")
                                    : "—"}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

function TeamColumn({label, playerName, team, teamLabel, graveyard, graveyardLabel, teamColor, graveyardColor, textColor}: {
    label: string;
    playerName?: string;
    team: number[];
    teamLabel?: string;
    graveyard: number[];
    graveyardLabel?: string;
    teamColor?: string;
    graveyardColor?: string;
    textColor?: string;
}) {
    return (
        <div className="flex flex-1 flex-col items-center gap-4">
            <h2 className="text-lg font-bold text-yellow-300">{label}</h2>
            {playerName && (
                <a href={`https://twitch.tv/${playerName}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex flex-row items-center gap-2 bg-[#9146ff] hover:bg-[#7d2ff7] text-white text-sm font-bold pl-2 pr-3 py-1.5 rounded-lg transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/glitch_white.svg" alt="" className="w-4 h-4"/>
                    <p>{playerName}</p>
                </a>
            )}
            <div className="h-5"></div>
            <TeamBox team={team} label={teamLabel ?? ""} color={teamColor} textColor={textColor} className="w-full max-w-md"/>
            <Graveyard label={graveyardLabel} pokemon={graveyard} color={graveyardColor} textColor={textColor} className="w-full min-h-20"/>
        </div>
    );
}

function HomeInner({username}: { username: string }) {
    const [stats, setStats] = useState<PublicSoullinkState | undefined>();
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let es: EventSource | null = null;

        const startStream = () => {
            if (es) {
                es.close();
            }

            es = new EventSource(`/api/soullink/public/${username}/stream`);

            es.onmessage = (e) => {
                if ('data' in e) {
                    try {
                        const stat = JSON.parse(e.data) as PublicSoullinkState;
                        console.log(stat);
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
            <main className="max-w-7xl mx-auto flex flex-col gap-4">
                <div className="flex flex-col items-stretch gap-4 md:flex-row md:justify-center">
                    <TeamColumn
                        label={stats.player1Name ? `Team ${stats.player1Name}` : "Team 1"}
                        playerName={stats.player1Name}
                        team={stats.team1}
                        teamLabel={stats.showTeam1Label ? stats.team1Label : ""}
                        graveyard={stats.graveyard1}
                        graveyardLabel={stats.showGraveyard1Label ? stats.graveyard1Label : undefined}
                        teamColor={stats.teamColor}
                        graveyardColor={stats.graveyardColor}
                        textColor={stats.textColor}
                    />
                    <TeamColumn
                        label={stats.player2Name ? `Team ${stats.player2Name}` : "Team 2"}
                        playerName={stats.player2Name}
                        team={stats.team2}
                        teamLabel={stats.showTeam2Label ? stats.team2Label : ""}
                        graveyard={stats.graveyard2}
                        graveyardLabel={stats.showGraveyard2Label ? stats.graveyard2Label : undefined}
                        teamColor={stats.teamColor}
                        graveyardColor={stats.graveyardColor}
                        textColor={stats.textColor}
                    />
                </div>

                <BadgesV badges={stats.badges} label={stats.showBadgesLabel ? stats.badgesLabel : undefined} textColor={stats.textColor} className="h-auto min-h-20 w-full"/>

                <EncountersTable encounters={stats.encounters} player1Name={stats.player1Name} player2Name={stats.player2Name} borderColor={stats.teamColor}/>
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

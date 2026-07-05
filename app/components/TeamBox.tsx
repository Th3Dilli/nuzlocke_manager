
export default function TeamBox({team, direction = "row", className, label = "Team", color = "#eab308", textColor}: {
    team: number[];
    direction?: "row" | "column";
    className?: string;
    label?: string;
    color?: string;
    textColor?: string;
}) {
    return (
        <div className={`relative shrink-0 p-3 pt-3 bgdark rounded-2xl border-[5px] h-20 ${className ?? ""}`} style={{borderColor: color}}>
            {label ? <TitleTab label={label} borderColor={color} textColor={textColor}/> : <></>}
            <div className={`flex gap-2 h-full ${direction === "column" ? "flex-col" : "flex-row"}`}>
                {team.map((id, i) => (
                    <div key={i} className="flex flex-1 aspect-square min-h-0 min-w-0 items-center justify-center">
                        {id ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={`/showdown/${id}.gif`}
                                alt=""
                                className="h-full [image-rendering:pixelated]"
                            />
                        ) : (
                            <Pokeball className="h-3/4 w-3/4 opacity-30"/>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TeamBoxV({team, className, label = "Team", color = "#eab308", textColor}: {
    team: number[];
    className?: string;
    label?: string;
    color?: string;
    textColor?: string;
}) {
    return (
        <div className={`relative shrink-0 p-3 pt-2 bgdark rounded-2xl border-[5px] h-20 ${className ?? ""}`} style={{borderColor: color}}>
            {label ? <TitleTabV label={label} borderColor={color} textColor={textColor}/> : <></>}
            <div className={`flex gap-2 h-full flex-col`}>
                {team.map((id, i) => (
                    <div key={i} className="flex flex-1 aspect-square min-h-0 min-w-0 items-center justify-center">
                        {id ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={`/showdown/${id}.gif`}
                                alt=""
                                className="h-full [image-rendering:pixelated]"
                            />
                        ) : (
                            <Pokeball className="h-3/4 w-3/4 opacity-30"/>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function BadgesV({badges, className, label, color = "#eab308", textColor}: {
    badges: number[];
    className?: string;
    label?: string;
    color?: string;
    textColor?: string;
}) {
    return (
        <div className={`relative shrink-0 p-3 pt-2 bgdark rounded-2xl border-[5px] h-20 ${className ?? ""}`} style={{borderColor: color}}>
            {label ? <TitleTabV label={label} borderColor={color} textColor={textColor}/> : <></>}
            <div className={`flex flex-wrap gap-2 h-full  items-center justify-center`}>
                {badges.map((id, i) => (
                    <div key={i} className="flex flex-1 aspect-square h-14 w-14 items-center justify-center">
                        {/*// eslint-disable-next-line @next/next/no-img-element*/}
                        <img
                            src={`/badges/${id}.png`}
                            alt=""
                            className="h-full [image-rendering:pixelated]"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Graveyard({label, className, pokemon, color = "#eab308", textColor, size = "12"}: { label?: string; className?: string; pokemon: number[]; color?: string; textColor?: string, size?: string }) {
    return (
        <div className={`relative rounded-2xl border-6 bgdark ${className ?? ""}`} style={{borderColor: color}}>
            {label ? <TitleTab label={label} borderColor={color} textColor={textColor}/> : <></>}

            <div className="overflow-hidden">
                <div className="flex flex-row flex-wrap min-h-0 min-w-0 mt-2 h-fill items-center ">
                {pokemon.length === 0 ? (
                    <></>
                ) : (
                    pokemon.map((id, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={`${id}-${i}`}
                            src={`/showdown/${id}.gif`}
                            alt=""
                            className={`h-${size} w-${size} object-contain opacity-80 [image-rendering:pixelated]`}
                        />
                    ))
                )}
            </div></div>
        </div>
    );
}

export function TitleTab({label, borderColor = "#dc2626", textColor = "#fde047"}: { label: string; borderColor?: string; textColor?: string; }) {
    return (
        <div
            style={{borderColor, color: textColor}}
            className="absolute left-5 top-0 flex -translate-y-4 items-center gap-2 rounded-full border-2 bg-neutral-900 px-3 py-0.5 text-sm font-bold">
            <Pokeball className="h-4 w-4"/>
            {label}
        </div>
    );
}

export function TitleTabV({label, borderColor = "#dc2626", textColor = "#fde047"}: { label: string; borderColor?: string; textColor?: string; }) {
    return (
        <div
            style={{borderColor, color: textColor}}
            className="absolute left-2 top-0 flex -translate-y-3 items-center gap-2 rounded-full border-2 bg-neutral-900 px-3 py-0.5 text-sm font-bold">
            <Pokeball className="h-4 w-4"/>
            {label}
        </div>
    );
}

export function Pokeball({className}: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
            <circle cx="50" cy="50" r="46" fill="white" stroke="black" strokeWidth="6"/>
            <path d="M 4 50 A 46 46 0 0 1 96 50 Z" fill="#dc2626" stroke="black" strokeWidth="6" strokeLinejoin="round"/>
            <circle cx="50" cy="50" r="12" fill="white" stroke="black" strokeWidth="6"/>
        </svg>
    );
}

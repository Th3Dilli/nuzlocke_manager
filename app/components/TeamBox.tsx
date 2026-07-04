
export default function TeamBox({team, direction = "row", className, label = "Team"}: {
    team: number[];
    direction?: "row" | "column";
    className?: string;
    label?: string;
}) {
    return (
        <div className={`relative shrink-0 p-3 pt-5 bgdark rounded-2xl border-[5px] border-yellow-500 h-20 ${className ?? ""}`}>
            {label ? <TitleTab label={label} borderColor="border-yellow-500"/> : <></>}
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

export function Graveyard({label, className, pokemon}: { label?: string; className?: string; pokemon: number[] }) {
    return (
        <div className={`relative rounded-2xl border-6 border-yellow-500 bgdark ${className ?? ""}`}>
            {label ? <TitleTab label={label} borderColor="border-yellow-500"/> : <></>}

            <div className="overflow-hidden">
                <div className="flex flex-row flex-wrap min-h-0 min-w-0 h-fill items-center ">
                {pokemon.length === 0 ? (
                    <></>
                ) : (
                    pokemon.map((id, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={`${id}-${i}`}
                            src={`/showdown/${id}.gif`}
                            alt=""
                            className="h-16 w-16 object-contain opacity-80 [image-rendering:pixelated]"
                        />
                    ))
                )}
            </div></div>
        </div>
    );
}

export function TitleTab({label, borderColor = "border-red-600"}: { label: string; borderColor?: string; }) {
    return (
        <div
            className={`absolute left-5 top-0 flex -translate-y-4 items-center gap-2 rounded-full border-2 bg-neutral-900 px-3 py-0.5 text-sm font-bold  text-yellow-300  ${borderColor ?? ""}`}>
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

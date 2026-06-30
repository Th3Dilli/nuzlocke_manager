import {ReactNode} from "react";

export default function TeamBox({team, direction = "row", className, label = "Team"}: {
    team: number[];
    direction?: "row" | "column";
    className?: string;
    label?: string;
}) {
    return (
        <div className={`bgdark relative shrink-0 rounded-2xl border-[5px] border-yellow-500 p-3 pt-5 ${className ?? ""}`}>
            <TitleTab label={label} borderColor="border-yellow-500"/>
            <div className={`flex gap-2 h-full ${direction === "column" ? "flex-col" : "flex-row"}`}>
                {team.map((id, i) => (
                    <div key={i} className="flex aspect-square min-h-0 min-w-0 flex-1 items-center justify-center">
                        {id ? (
                            // Explicit width/height keep every slot the same size regardless of
                            // which Pokémon is in it — sprite GIFs have varying natural pixel
                            // dimensions, which otherwise drives the box's shrink-to-fit size.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={`/showdown/${id}.gif`}
                                alt=""
                                width={48}
                                height={48}
                                className="h-full w-full object-contain [image-rendering:pixelated]"
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

export function TitleTab({
                             label,
                             borderColor = "border-red-600"
                         }: {
    label: string;
    borderColor?: string;
}) {
    return (
        <div
            className={`absolute left-5 top-0 flex -translate-y-1/2 items-center gap-2 rounded-full border-2 bg-neutral-900 px-3 py-0.5 text-sm font-bold tracking-wide text-yellow-300 shadow-md ${borderColor ?? ""}`}>
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

export function Graveyard({label, className, children}: { label?: string; className?: string; children?: ReactNode }) {
    return (
        <div className={`relative rounded-2xl border-6 border-yellow-500 bgdark ${className ?? ""}`}>
            {label ? <TitleTab label={label} borderColor="border-yellow-500"/> : <></>}
            {/* Clip content to the box's own bounds (not the outer div, so the
                floating title tab above stays visible). On pages where the box
                has no fixed height this is a no-op — it just grows instead. */}
            <div className="h-full overflow-hidden">{children}</div>
        </div>
    );
}
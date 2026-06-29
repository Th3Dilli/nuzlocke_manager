import {ReactNode} from "react";

export default function TeamBox({team}: { team: number[] }) {
    return (
        <div className="bgdark relative shrink-0 rounded-2xl border-[5px] border-yellow-500 p-3 pt-5">
            <TitleTab label="Team" borderColor="border-yellow-500"/>
            <div className="flex flex-row gap-2">
                {team.map((id, i) => (
                    <div key={i} className="flex aspect-square flex-1 items-center justify-center">
                        {id ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={`/showdown/${id}.gif`}
                                alt=""
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
        <span className={`relative inline-block overflow-hidden rounded-full border-2 border-black bg-white ${className ?? ""}`}>
            <span className="absolute inset-x-0 top-0 h-1/2 border-b-2 border-black bg-red-600"/>
            <span
                className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white"/>
        </span>
    );
}

export function Graveyard({label, className, children}: { label?: string; className?: string; children?: ReactNode }) {
    return (
        <div className={`relative rounded-2xl border-6 border-yellow-500 bgdark ${className ?? ""}`}>
            {label ? <TitleTab label={label} borderColor="border-yellow-500"/> : <></>}
            {children}
        </div>
    );
}
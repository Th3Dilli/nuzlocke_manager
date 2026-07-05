"use client";

import {ReactNode, useState} from "react";
import {ChevronDown} from "lucide-react";

// Shared collapsible card shell for the edit-page sections (team, graveyard,
// badges, labels, settings, editors). Keeps the header (icon, title, and any
// header-right controls like a save button) always visible, and toggles the
// body content so a page with many sections doesn't take up so much space.
export default function Collapsible({icon, title, headerRight, defaultOpen = false, children}: {
    icon?: ReactNode;
    title: ReactNode;
    headerRight?: ReactNode;
    defaultOpen?: boolean;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="mt-6 rounded-xl border border-yellow-600 bgdark p-4">
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                >
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "" : "-rotate-90"}`}/>
                    {icon}
                    <h2 className="truncate text-xl font-bold text-yellow-300">{title}</h2>
                </button>
                {headerRight && <div className="flex shrink-0 items-center gap-3">{headerRight}</div>}
            </div>

            {open && <div className="mt-4">{children}</div>}
        </div>
    );
}

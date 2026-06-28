"use client";
import { useState, useCallback } from "react";
import { Check, Copy, Download } from "lucide-react";

interface ConfigDownloadProps {
    username: string;
    token: string;
    url: string;
    slot?: number;
    debug?: boolean;
}

export function ConfigField({
                                username, token, url, slot = 0, debug = false,
                            }: ConfigDownloadProps) {
    const [copied, setCopied] = useState(false);
    const [currentSlot, setCurrentSlot] = useState(slot);

    const config = { url, user: username, token, slot: currentSlot, debug };
    const configPreview = { url, user: username, token: "************************", slot: currentSlot, debug };

    const json = JSON.stringify(config, null, 2);
    const jsonPreview = JSON.stringify(configPreview, null, 2);

    const handleDownload = useCallback(() => {
        const blob = new Blob([json], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = "config.json";
        link.click();
        URL.revokeObjectURL(href);
    }, [json]);

    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(json);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [json]);

    return (
        <div className="overflow-hidden rounded-xl border border-yellow-700 bg-neutral-800 font-mono">
            <div className="flex items-center justify-between border-b border-yellow-700 bg-neutral-800 px-4 py-2.5">
                <span className="text-xs tracking-wide text-gray-400">config.json</span>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <label htmlFor="slot-input">Slot</label>
                    <select
                        id="slot-input"
                        value={currentSlot}
                        onChange={e => setCurrentSlot(Number(e.target.value))}
                        className="rounded-md border border-yellow-700 bg-neutral-900 px-2 py-1 text-xs text-yellow-400 outline-none focus:border-yellow-500"
                    >
                        {Array.from({ length: 10 }, (_, i) => (
                            <option key={i} value={i}>{i}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-yellow-700 bg-transparent px-3 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-neutral-700 hover:text-gray-200"
                    >
                        {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-yellow-600 px-3 py-1 text-xs font-bold text-black transition-colors hover:bg-yellow-400"
                    >
                        <Download className="w-4 h-4" /> Download
                    </button>
                </div>
            </div>
            <textarea
                value={jsonPreview}
                readOnly
                spellCheck={false}
                rows={7}
                className="block w-full resize-none bg-neutral-800 p-4 text-[13px] leading-relaxed text-yellow-600 outline-none"
            />
        </div>
    );
}
'use client';

import {useState} from 'react';
import {Copy, Check} from 'lucide-react';

export default function CopyKeyField({name, url}: { url: string, name: string }) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Reset feedback after 2 seconds
    };

    return (
        <div className="p-4 ">
            <label className="block text-lg font-medium text-gray-400 mb-2">
                {name}
            </label>

            <div className="relative flex items-center bg-neutral-900 border border-yellow-600 rounded-md overflow-hidden focus-within:border-yellow-500">
                <input
                    type="text"
                    value={url}
                    readOnly
                    className="w-full px-3 py-2 text-sm text-gray-200 font-mono "
                />

                <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 rounded-r-md bg-neutral-900 pl-3 pr-2">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-gray-400 hover:text-gray-200 cursor-pointer "
                        title="Copy to clipboard"
                    >
                        {isCopied ? (
                            <Check size={16} className="text-green-500"/>
                        ) : (
                            <Copy size={16}/>
                        )}
                    </button>
                </div>
            </div>

            {isCopied && (
                <span className="text-xs text-green-500 mt-1 block animate-fade-in">
                  Copied to clipboard!
                </span>
            )}
        </div>
    );
}
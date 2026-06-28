'use client';

import {useState} from 'react';
import {Eye, EyeOff, Copy, Check} from 'lucide-react';
import {useRouter} from "next/navigation";

export default function ApiKeyField({apiKey}: { apiKey: string }) {
    const router = useRouter()

    async function handleClick() {
        await fetch('/api/user/regen-token', {method: 'POST'})
        router.refresh()
    }

    const [isVisible, setIsVisible] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(apiKey);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="p-4">
            <label className="block text-xl font-medium text-gray-400 mb-2">
                Secret API Key:
            </label>

            <div className="relative flex items-center bg-neutral-900 border border-yellow-600 rounded-md overflow-hidden focus-within:border-yellow-500">
                <input
                    type={isVisible ? "text" : "password"}
                    value={apiKey}
                    readOnly
                    className="w-full px-3 py-2 text-sm text-gray-200 font-mono pr-20"
                />

                <div className="absolute right-2 flex items-center gap-1 pl-2">
                    <button
                        onClick={() => setIsVisible(!isVisible)}
                        className="p-1.5 text-gray-400 hover:text-gray-200 cursor-pointer "
                        title={isVisible ? "Hide API Key" : "Show API Key"}
                    >
                        {isVisible ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>

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
            <div className="flex items-center gap-1 pt-4">
                <span className="w-full"></span>
                <button
                    onClick={handleClick}
                    className="bg-yellow-500 hover:bg-yellow-700 text-black font-bold py-2 px-4 rounded text-nowrap cursor-pointer "
                >
                    Regenerate API Token
                </button>
            </div>
        </div>
    );
}
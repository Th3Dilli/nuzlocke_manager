'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {RefreshCw} from 'lucide-react';

export default function RegenerateTokenButton({type}: { type: 'nuzlocke' | 'soullink' }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    async function handleClick() {
        if (!window.confirm('Regenerate this token? Existing edit/overlay links using it will stop working.')) {
            return;
        }
        setBusy(true);
        try {
            const res = await fetch('/api/user/regen-token', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({type}),
            });
            if (res.ok) {
                router.refresh();
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={busy}
            title="Regenerate token"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-yellow-600 px-2 py-1 text-xs font-medium text-gray-200 transition-colors hover:bg-yellow-600/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
            <RefreshCw size={12} className={busy ? 'animate-spin' : ''}/> Regenerate
        </button>
    );
}

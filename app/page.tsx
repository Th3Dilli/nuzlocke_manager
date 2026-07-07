import {changePageEnabled, getUserByUsername, getUsers, type User} from '@/app/lib/users'
import {getSessionUser} from '@/app/lib/session'
import {getEditingFor} from '@/app/lib/editors'
import Header from "@/app/components/Header";
import CopyKeyField from "@/app/components/CopyField";
import RegenerateTokenButton from "@/app/components/RegenerateTokenButton";
import {updatePageEnabled as updateNuzlockePageEnabled} from "@/app/lib/stats";
import {updatePageEnabled as updateSoullinkPageEnabled} from "@/app/lib/soullinkStats";
import {revalidatePath} from "next/cache";
import {Crown, ExternalLink, Gamepad2, ListChecks, Monitor, Settings, ShieldCheck, Swords, UserPlus} from "lucide-react";

function StatusBadge({enabled}: { enabled: boolean }) {
    return (
        <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                enabled ? "bg-green-600/20 text-green-400" : "bg-gray-600/20 text-gray-400"
            }`}
        >
            {enabled ? "Enabled" : "Disabled"}
        </span>
    )
}

function ToggleSwitch({name, label, defaultChecked, Icon}: {
    name: string
    label: string
    defaultChecked: boolean
    Icon: React.ElementType
}) {
    return (
        <div className="flex flex-row items-center justify-between p-4">
            <div className="flex items-center gap-2 text-gray-300">
                <Icon size={18} className="text-yellow-600"/>
                <span className="text-sm font-medium">{label}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                    type="checkbox"
                    name={name}
                    defaultChecked={defaultChecked}
                    className="sr-only peer"
                />
                <div
                    className="w-11 h-6 bg-gray-300 dark:bg-neutral-800 rounded-full peer peer-checked:bg-yellow-600
                         peer-focus:ring-2 peer-focus:ring-yellow-300 dark:peer-focus
                    :ring-yellow-800 duration-200 ease-in-out"
                >
                </div>
                <div
                    className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-full transition-transform duration-200 ease-in-out"
                ></div>
            </label>
        </div>
    )
}

export default async function Home() {
    const user: User | null = await getSessionUser()
    const baseUrl = process.env.BASE_URL;
    let users: User[] = []
    if (user && user.role >= 10) {
        const userResp = getUsers();
        if (userResp) users = userResp;
    }

    let editingFor: User[] = []
    if (user) {
        editingFor = getEditingFor(user.twitch_id)
            .map(owner => getUserByUsername(owner))
            .filter((owner): owner is User => owner !== null)
    }

    async function saveChanges(formData: FormData) {
        'use server';

        const sessionUser = await getSessionUser()
        const isNuzlockeEnabled = formData.get('nuzlockeEnabled') === 'on' ? 1 : 0;
        const isSoullinkEnabled = formData.get('soullinkEnabled') === 'on' ? 1 : 0;

        if (sessionUser) {
            const user = changePageEnabled(sessionUser.twitch_id, isNuzlockeEnabled, isSoullinkEnabled)
            if (user) {
                updateNuzlockePageEnabled(user)
                updateSoullinkPageEnabled(user)
            }
        }
        revalidatePath('/')
    }

    if (user) {
        return (<div className="min-h-screen page-bg">
                <Header/>
                <div className="flex flex-col items-center px-4 pb-12">
                    <div className="w-full max-w-5xl space-y-6">

                        <div className="flex items-center gap-4 p-6 rounded-xl border border-yellow-600 bg-neutral-900/90">
                            <img
                                src={user.profile_image_url}
                                alt={`${user.username}'s profile picture`}
                                className="h-16 w-16 rounded-full border-2 border-yellow-600 object-cover"
                            />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-100">{user.username}</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    {user.role >= 10 && (
                                        <span className="flex items-center gap-1 text-xs font-semibold bg-yellow-600 text-black px-2 py-0.5 rounded-full">
                                            <Crown size={12}/> Admin
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        Member since {new Date(user.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="p-5 rounded-xl border border-yellow-600 bg-neutral-900/90">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-gray-100 font-semibold">
                                        <Gamepad2 size={18} className="text-yellow-600"/> Nuzlocke
                                    </div>
                                    <StatusBadge enabled={user.nuzlocke_enabled === 1}/>
                                </div>
                                {user.nuzlocke_enabled === 1 ? (
                                    user.nuzlocke_token ? (
                                        <div>
                                            <div className="flex flex-col items-start gap-1 text-sm">
                                                <a href={`${baseUrl}/edit/nuzlocke/${user.nuzlocke_token}`}
                                                   className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                    <ExternalLink size={14}/> Go to Nuzlocke Edit Page
                                                </a>
                                                <a href={`${baseUrl}/overlay/nuzlocke/${user.nuzlocke_token}`}
                                                   className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                    <Monitor size={14}/> Go to Nuzlocke Overlay
                                                </a>
                                                <a href={`${baseUrl}/nuzlocke/${user.username}`}
                                                   className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                    <ExternalLink size={14}/> Public Nuzlocke Page
                                                </a>
                                            </div>
                                            <CopyKeyField name="Nuzlocke Overlay OBS Browser Source:"
                                                          url={`${baseUrl}/overlay/nuzlocke/${user.nuzlocke_token}`}/>
                                            <div className="px-4 -mt-2">
                                                <RegenerateTokenButton type="nuzlocke"/>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm text-gray-500">No token yet.</p>
                                            <RegenerateTokenButton type="nuzlocke"/>
                                        </div>
                                    )
                                ) : (
                                    <p className="text-sm text-gray-500">Enable this page below to get your links.</p>
                                )}
                            </div>

                            <div className="p-5 rounded-xl border border-yellow-600 bg-neutral-900/90">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-gray-100 font-semibold">
                                        <Swords size={18} className="text-yellow-600"/> Soullink
                                    </div>
                                    <StatusBadge enabled={user.soullink_enabled === 1}/>
                                </div>
                                {user.soullink_enabled === 1 ? (
                                    user.soullink_token ? (
                                        <div>
                                            <div className="flex flex-col items-start gap-1 text-sm">
                                                <a href={`${baseUrl}/edit/soullink/${user.soullink_token}`}
                                                   className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                    <ExternalLink size={14}/> Go to Soullink Edit Page
                                                </a>
                                                <a href={`${baseUrl}/overlay/soullink/${user.soullink_token}`}
                                                   className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                    <Monitor size={14}/> Go to Soullink Overlay
                                                </a>
                                                <a href={`${baseUrl}/soullink/${user.username}`}
                                                   className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                    <ExternalLink size={14}/> Public Soullink Page
                                                </a>
                                            </div>
                                            <CopyKeyField name="Soullink Overlay OBS Browser Source:"
                                                          url={`${baseUrl}/overlay/soullink/${user.soullink_token}`}/>
                                            <div className="px-4 -mt-2">
                                                <RegenerateTokenButton type="soullink"/>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm text-gray-500">No token yet.</p>
                                            <RegenerateTokenButton type="soullink"/>
                                        </div>
                                    )
                                ) : (
                                    <p className="text-sm text-gray-500">Enable this page below to get your links.</p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-yellow-600 bg-neutral-900/90 p-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Settings size={18} className="text-yellow-600"/>
                                <h2 className="text-lg font-semibold text-gray-100">Page Settings</h2>
                            </div>
                            <form action={saveChanges}>
                                <div className="divide-y divide-yellow-700/40 border border-yellow-700/40 rounded-lg">
                                    <ToggleSwitch name="nuzlockeEnabled" label="Enable Nuzlocke Page"
                                                  defaultChecked={user.nuzlocke_enabled === 1} Icon={Gamepad2}/>
                                    <ToggleSwitch name="soullinkEnabled" label="Enable Soullink Page"
                                                  defaultChecked={user.soullink_enabled === 1} Icon={Swords}/>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        className="bg-yellow-600 text-black text-sm font-semibold px-4 py-2 rounded shadow hover:bg-yellow-700"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>

                            <div className="border border-yellow-700/40 rounded-lg mt-6 p-4">
                                <div className="flex items-center gap-2 text-gray-300 font-bold mb-2">
                                    <ListChecks size={16} className="text-yellow-600"/> Setup Guide
                                </div>
                                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                                    <li>Enable the page you need.</li>
                                    <li>Add your other users as editors to allow them to edit the overlay.</li>
                                    <li>Change the overlay settings (color, cam mode, etc)</li>
                                    <li>Add a background that you like in your OBS scene.</li>
                                    <li>Add the emulator screens on top of the background and finally add the overlay on top of the emulator screens. Make sure to set in OBS the overlay browser source dimensions to 1920 x 1080.</li>
                                </ul>
                            </div>
                        </div>

                        {editingFor.length > 0 && (
                            <div className="p-6 rounded-xl border border-yellow-600 bg-neutral-900/90">
                                <div className="flex items-center gap-2 mb-4">
                                    <UserPlus size={18} className="text-yellow-600"/>
                                    <h2 className="text-lg font-semibold text-gray-100">Editing For</h2>
                                </div>
                                <div className="space-y-3">
                                    {editingFor.map(owner => (
                                        <div key={owner.username} className="p-3 rounded-lg border border-yellow-700/40 bg-neutral-950/50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <img
                                                    src={owner.profile_image_url}
                                                    alt={`${owner.username}'s profile picture`}
                                                    className="h-6 w-6 rounded-full object-cover"
                                                />
                                                <p className="text-gray-100 font-medium">{owner.username}</p>
                                            </div>
                                            {owner.nuzlocke_enabled === 1 || owner.soullink_enabled === 1 ? (
                                                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                                                    {owner.nuzlocke_enabled === 1 && owner.nuzlocke_token && (
                                                        <div className="flex flex-col items-start gap-1 rounded-md border border-yellow-700/30 p-2">
                                                            <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                                                                <Gamepad2 size={12}/> Nuzlocke
                                                            </div>
                                                            <a href={`${baseUrl}/edit/nuzlocke/${owner.nuzlocke_token}`}
                                                               className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                                <ExternalLink size={14}/> Edit Page
                                                            </a>
                                                            <a href={`${baseUrl}/overlay/nuzlocke/${owner.nuzlocke_token}`}
                                                               className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                                <Monitor size={14}/> Overlay
                                                            </a>
                                                            <a href={`${baseUrl}/nuzlocke/${owner.username}`}
                                                               className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                                <ExternalLink size={14}/> Public Page
                                                            </a>
                                                        </div>
                                                    )}
                                                    {owner.soullink_enabled === 1 && owner.soullink_token && (
                                                        <div className="flex flex-col items-start gap-1 rounded-md border border-yellow-700/30 p-2">
                                                            <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                                                                <Swords size={12}/> Soullink
                                                            </div>
                                                            <a href={`${baseUrl}/edit/soullink/${owner.soullink_token}`}
                                                               className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                                <ExternalLink size={14}/> Edit Page
                                                            </a>
                                                            <a href={`${baseUrl}/overlay/soullink/${owner.soullink_token}`}
                                                               className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                                <Monitor size={14}/> Overlay
                                                            </a>
                                                            <a href={`${baseUrl}/soullink/${owner.username}`}
                                                               className="inline-flex items-center gap-1.5 text-yellow-600 hover:underline">
                                                                <ExternalLink size={14}/> Public Page
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">No pages enabled yet.</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {user.role >= 10 && (
                            <div className="p-6 rounded-xl border border-yellow-600 bg-neutral-900/90">
                                <div className="flex items-center gap-2 mb-4">
                                    <ShieldCheck size={18} className="text-yellow-600"/>
                                    <h2 className="text-lg font-semibold text-gray-100">Admin Tools</h2>
                                </div>
                                <div className="space-y-3">
                                    {users.map((user) => {
                                        return (<div key={user.username} className="p-3 rounded-lg border border-yellow-700/40 bg-neutral-950/50">
                                            <div className="flex items-center justify-between">
                                                <p className="text-gray-100 font-medium">{user.username}</p>
                                                <span className="text-xs text-gray-400">Role {user.role}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{user.twitch_id}</p>
                                            <p className="text-xs text-gray-400 mt-1">Nuzlocke Enabled: {user.nuzlocke_enabled === 1 ? "Yes" : "No"}</p>
                                            <p className="text-xs text-gray-400 mt-1">Soullink Enabled: {user.soullink_enabled === 1 ? "Yes" : "No"}</p>
                                            <p className="text-xs text-gray-500">Created At: {user.created_at} | Updated At: {user.updated_at}</p>
                                        </div>)
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center ">
            <div className="w-full max-w-sm p-8 rounded-xl shadow-lg border border-yellow-600 bg-neutral-900">
                <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a href="/api/auth/twitch"
                       className="flex flex-row items-center gap-2 bg-[#9146ff] hover:bg-[#7d2ff7] text-white text-sm font-bold pl-2 pr-3 py-1.5 rounded-lg transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/glitch_white.svg" className="w-4 h-4" alt="twitch logo">
                        </img>
                        <p>Login with Twitch</p>
                    </a>
                </div>
            </div>
        </div>
    )
}

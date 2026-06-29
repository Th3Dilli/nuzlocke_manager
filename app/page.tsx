import {changePageEnabled, getUsers, type User} from '@/app/lib/users'
import {getSessionUser} from '@/app/lib/session'
import Header from "@/app/components/Header";
import ApiKeyField from "@/app/components/ApiKeyField";
import CopyKeyField from "@/app/components/CopyField";
import {updatePageEnabled} from "@/app/lib/stats";
import {revalidatePath} from "next/cache";
import {ConfigField} from "@/app/components/ConfigField";
import {Download} from "lucide-react";

export default async function Home() {
    const user: User | null = await getSessionUser()
    const baseUrl = process.env.BASE_URL;
    let users: User[] = []
    if (user && user.role >= 10) {
        const userResp = getUsers();
        if (userResp) users = userResp;
    }

    async function saveChanges(formData: FormData) {
        'use server';

        const sessionUser = await getSessionUser()
        const isChecked = formData.get('pageEnabled') === 'on';
        if (sessionUser) {
            const user = changePageEnabled(sessionUser.twitch_id, isChecked ? 1 : 0)
            if (user)
                updatePageEnabled(user)
        }
        revalidatePath('/')
    }

    if (user) {
        return (<div className="min-h-screen page-bg">
                <Header/>
                <div className="flex flex-col items-center">
                    <div className="w-2/5">
                        <div className="p-2 gap-2 rounded-xl border border-yellow-600 bg-neutral-900">
                            {user.page_enabled === 1 ? (
                                <div>
                                    <a href={`${baseUrl}/${user.username}`} className="text-yellow-600 hover:underline">
                                        Go to Page
                                    </a><br/>
                                    <a href={`${baseUrl}/overlay/${user.username}`} className="text-yellow-600 hover:underline">
                                        Go to Overlay
                                    </a>
                                    <CopyKeyField name="Overlay OBS Browser Source:" url={`${baseUrl}/overlay/${user.username}`}></CopyKeyField>

                                </div>
                            ) : (<></>)}
                            <div>
                                <form action={saveChanges} className="m-4 space-y-4 border border-yellow-700 rounded-lg">
                                    <div className=" flex flex-row items-center">
                                        <div className=" p-4 block text-lg font-medium text-gray-400 mb-2">
                                            Enable Stats Page:
                                        </div>
                                        <label className=" relative inline-flex items-center cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                name="pageEnabled"
                                                defaultChecked={user.page_enabled === 1}
                                                className="sr-only peer"
                                            />

                                            <div
                                                className=" w-11 h-6 bg-gray-300 dark:bg-neutral-800 rounded-full peer peer-checked:bg-yellow-600
                                         peer-focus:ring-2 peer-focus:ring-yellow-300 dark:peer-focus
                                    :ring-yellow-800 duration-200 ease-in-out"
                                            >
                                            </div>

                                            <div
                                                className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-full transition-transform duration-200 ease-in-out"
                                            ></div>
                                        </label>
                                    </div>
                                    <div className="flex flex-row items-center justify-end pb-4 pr-4">
                                        <div className="w-32">
                                            <button
                                                type="submit"
                                                className="bg-yellow-600 text-black text-sm px-4 py-2 rounded shadow hover:bg-yellow-700"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </form>
                                <div className="border-2 border-yellow-600 rounded-lg m-4 p-4">
                                    <div className="text-gray-400 pb-4 ">
                                        <p className="font-bold ">Setup Guid:</p>
                                        <div className="p-4">
                                            <li>Enable the Stats Page</li>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {user.role >= 10 && (
                            <div className="mt-4 p-4 rounded-xl border border-yellow-600 bg-neutral-900">
                                <div className="mb-2 pb-2">
                                    <h2 className="text-2xl font-bold mb-4">Admin Tools</h2>
                                    {users.map((user) => {
                                        return (<div key={user.username} className="p-2 mb-4 gap-2 rounded-xl border border-yellow-600 bg-neutral-900">
                                            <p>{user.username} | {user.twitch_id}</p>
                                            <p>Role: {user.role}</p>
                                            <p>Page Enabled: {user.page_enabled === 1 ? "Yes" : "No"}</p>
                                            <p>Created At: {user.created_at} | Updated At: {user.updated_at}</p>
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
                    <a href="/api/auth/twitch"
                       className="flex flex-row items-center gap-2 bg-[#9146ff] hover:bg-[#7d2ff7] text-white text-sm font-bold pl-2 pr-3 py-1.5 rounded-lg transition-colors">
                        <img src="glitch_white.svg" className="w-4 h-4">
                        </img>
                        <p>Login with Twitch</p>
                    </a>
                </div>
            </div>
        </div>
    )
}

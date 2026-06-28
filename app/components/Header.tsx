import {User} from "@/app/lib/users";
import {getSessionUser} from "@/app/lib/session";
import Link from "next/link";
import {LogOut} from "lucide-react";

export default async function Header() {
    const user: User | null = await getSessionUser()

    if (user) {
        return (
            <div className="flex justify-end items-center p-4">
                <div className="flex items-center gap-3 h-16">
                    <Link href="/">
                        <div className="flex items-center gap-1 bg-[#9146ff] hover:bg-[#7d2ff7] rounded-lg p-1 pr-2">
                            <div className="relative h-8 w-8 overflow-hidden rounded-full">
                                <img
                                    src={user.profile_image_url}
                                    alt={`${user.username}'s profile picture`}
                                    className="object-cover"
                                />
                            </div>
                            <span className="text-sm font-semibold text-gray-200">
                              {user.username}
                            </span>
                        </div>
                    </Link>
                    <a
                        href="/api/auth/logout"
                        className="flex items-center h-10 w-10 rounded-lg border border-yellow-600 px-3 py-1 text-lg bg-neutral-900 hover:bg-neutral-700"
                    >
                        <LogOut/>
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="flex justify-end items-center p-4">
            <Link href="/api/auth/twitch">
                <button className="flex items-center gap-2 bg-violet-500 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded">

                    <img src="glitch_white.svg" className="w-4 h-4">
                    </img>
                    Login with Twitch
                </button>
            </Link>
        </div>
    )
}
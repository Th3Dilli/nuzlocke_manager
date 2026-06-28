import {selectUser, selectUsers, updatePageEnabled, updateToken, upsertUser} from '@/app/lib/database'
import { randomBytes } from 'crypto'
import {TwitchUser} from "@/app/lib/types/twitchUser";

export type User = {
    twitch_id: string
    username: string
    role: number
    page_enabled: number
    api_token: string
    profile_image_url: string
    created_at: string
    updated_at: string
}

function generateApiToken(): string {
    return randomBytes(32).toString('hex')
}

export function generateSessionID(): string {
    return randomBytes(64).toString('hex')
}

export function upsertTwitchUser(twitch_user: TwitchUser): User {
    const now = new Date().toISOString()
    upsertUser.run({
        twitch_id: twitch_user.id,
        username: twitch_user.login,
        profile_image_url: twitch_user.profile_image_url,
        now
    })

    return selectUser.get(twitch_user.id) as User
}

export function regenerateApiToken(twitch_id: string) {
    const now = new Date().toISOString()
    updateToken.run({ twitch_id, api_token: generateApiToken(), now })
}

export function changePageEnabled(twitch_id: string, enabled: number): User | null {
    const now = new Date().toISOString()
    let user = getUser(twitch_id);
    if (user?.page_enabled === 0) {
        if (user.api_token === null || user.api_token === "")
            regenerateApiToken(twitch_id)
    }
    updatePageEnabled.run({twitch_id, page_enabled: enabled, now})
    user = getUser(twitch_id);
    return user;
}

export function getUser(twitch_id: string): User | null {
    return (selectUser.get(twitch_id) as User | undefined) ?? null
}

export function getUsers(): User[] | null {
    return (selectUsers.all() as User[] | undefined) ?? null
}

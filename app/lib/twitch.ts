import {TwitchUserResponse} from "@/app/lib/types/twitchUser";

let cachedAppToken: { token: string; expiresAt: number } | null = null;

// App access tokens (client-credentials grant) let us call Helix without a
// user having logged in, e.g. to resolve a typed username to its Twitch id.
// Cached in memory and refreshed a minute before expiry.
async function getAppAccessToken(clientId: string, clientSecret: string): Promise<string> {
    if (cachedAppToken && cachedAppToken.expiresAt > Date.now()) {
        return cachedAppToken.token;
    }

    const res = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "client_credentials",
        }),
    });
    if (!res.ok) {
        throw new Error(`Failed to obtain Twitch app access token: ${await res.text()}`);
    }

    const {access_token, expires_in} = await res.json() as { access_token: string; expires_in: number };
    cachedAppToken = {token: access_token, expiresAt: Date.now() + (expires_in - 60) * 1000};
    return cachedAppToken.token;
}

// Resolves a Twitch login (username) to its stable numeric user id via
// Helix, so an owner can grant edit access to someone who has never logged
// into this site. Returns null if no such Twitch account exists.
export async function resolveTwitchIdByLogin(login: string): Promise<string | null> {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error("Twitch credentials not configured");
    }

    const token = await getAppAccessToken(clientId, clientSecret);
    const res = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Client-Id": clientId,
        },
    });
    if (!res.ok) {
        throw new Error(`Failed to resolve Twitch user: ${await res.text()}`);
    }

    const {data} = await res.json() as TwitchUserResponse;
    return data[0]?.id ?? null;
}

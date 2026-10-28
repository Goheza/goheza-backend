// Replaces `@/lib/tiktok-business-test` (that file was NOT in the zip, so this
// is rebuilt from how the routes use it. Compare with your original.)
import { config } from '../config'
import { supabase } from '../supabase'

export interface SocialAccount {
    id: string
    user_id: string
    platform: string
    status: string
    open_id: string | null
    business_id: string | null
    access_token: string | null
    refresh_token: string | null
    token_expires_at: string | null
    token_status: string | null
    scopes: string[] | null
}

const REFRESH_URL = 'https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/refresh_token/'

export async function getConnectedAccount(userId: string): Promise<SocialAccount | null> {
    const { data, error } = await supabase
        .from(config.table)
        .select('*')
        .eq('user_id', userId)
        .eq('platform', 'tiktok')
        .eq('status', 'connected')
        .maybeSingle()

    if (error) throw new Error(error.message)
    return (data as SocialAccount) ?? null
}

// TikTok's business_id is the open_id from the token response.
export const businessIdOf = (a: SocialAccount) => (a.business_id ?? a.open_id) as string

export async function ensureFreshAccessToken(account: SocialAccount): Promise<string> {
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0
    const fiveMinutes = 5 * 60 * 1000

    if (account.access_token && expiresAt - Date.now() > fiveMinutes) {
        return account.access_token
    }
    if (!account.refresh_token) throw new Error('No refresh token stored. Reconnect the TikTok account.')

    const res = await fetch(REFRESH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: config.tiktokAppId,
            client_secret: config.tiktokAppSecret,
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
        }),
    })
    const json: any = await res.json()

    if (!res.ok || json.code !== 0) {
        await supabase.from(config.table).update({ token_status: 'refresh_failed' }).eq('id', account.id)
        throw new Error(json?.message ?? 'TikTok token refresh failed. Reconnect the account.')
    }

    const t = json.data ?? json
    await supabase
        .from(config.table)
        .update({
            access_token: t.access_token,
            refresh_token: t.refresh_token ?? account.refresh_token,
            token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
            last_token_refresh_at: new Date().toISOString(),
            token_status: 'active',
        })
        .eq('id', account.id)

    return t.access_token as string
}

// Accepts a full TikTok URL (.../video/123...) or a bare numeric id.
export function extractTikTokVideoId(raw: string): string | null {
    const s = String(raw).trim()
    if (/^\d{8,}$/.test(s)) return s
    const m = s.match(/\/video\/(\d+)/)
    return m ? m[1] : null
}

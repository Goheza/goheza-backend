import { Request, Response } from 'express'
import { config } from '../config'
import { supabase } from '../supabase'
import { verifyState } from '../lib/state'
import { DEFAULT_RETURN, safeRedirectPath } from './connect'

function buildRedirect(returnTo: string, params: Record<string, string>) {
    const url = new URL(returnTo, config.frontendUrl)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return url.toString()
}

// GET /api/tiktok-business/callback   (public: TikTok redirects the browser here)
export async function callback(req: Request, res: Response) {
    try {
        const code = req.query.code as string | undefined
        const state = req.query.state as string | undefined
        const tiktokError = req.query.error as string | undefined

        const fail = (returnTo: string, reason: string) =>
            res.redirect(buildRedirect(returnTo, { provider: 'tiktok', social: 'error', reason }))

        // Verify state first: it tells us who the user is and where to send them back.
        const verified = state ? verifyState(state) : null
        if (!verified) return fail(DEFAULT_RETURN, 'state_mismatch')

        const returnTo = safeRedirectPath(verified.returnTo, DEFAULT_RETURN)
        const userId = verified.uid

        if (tiktokError) {
            console.error('TikTok denied authorization:', tiktokError, req.query.error_description)
            return fail(returnTo, tiktokError)
        }
        if (!code) return fail(returnTo, 'missing_code')

        const tokenRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: config.tiktokAppId,
                client_secret: config.tiktokAppSecret,
                grant_type: 'authorization_code',
                auth_code: code,
                redirect_uri: `${config.apiPublicUrl}/api/tiktok-business/callback`,
            }),
        })
        const tokenData: any = await tokenRes.json()

        if (!tokenRes.ok || tokenData.code !== 0) {
            console.error('TikTok token error:', tokenData)
            return fail(returnTo, tokenData?.message ?? 'token_exchange_failed')
        }

        const { access_token, refresh_token, expires_in, open_id, scope } = tokenData.data ?? tokenData

        // One TikTok connection per user (table has unique(user_id, platform)).
        const { error: upsertError } = await supabase.from(config.table).upsert(
            {
                user_id: userId,
                platform: 'tiktok',
                status: 'connected',
                open_id,
                business_id: open_id, // assumption carried over: business_id === open_id
                access_token,
                refresh_token,
                token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
                scopes: scope ? String(scope).split(',') : [],
                token_status: 'active',
                last_token_refresh_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,platform' }
        )

        if (upsertError) {
            console.error('Database upsert error:', upsertError)
            return fail(returnTo, 'db_error')
        }

        return res.redirect(buildRedirect(returnTo, { provider: 'tiktok', social: 'success' }))
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: { msg: error instanceof Error ? error.message : String(error) } })
    }
}

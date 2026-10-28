import { Request, Response } from 'express'
import { config } from '../config'
import { supabase } from '../supabase'

// GET /api/tiktok-business/status   (requires login)
// Never selects access_token / refresh_token, so they can't leak to the browser.
export async function status(_req: Request, res: Response) {
    try {
        const { data, error } = await supabase
            .from(config.table)
            .select('id, open_id, business_id, display_name, external_username, status, token_status, scopes, token_expires_at, connected_at')
            .eq('user_id', res.locals.userId)
            .eq('platform', 'tiktok')
            .eq('status', 'connected')
            .maybeSingle()

        if (error) return res.status(500).json({ error: error.message })
        return res.json({ connected: !!data, account: data ?? null })
    } catch (error: any) {
        console.error('Status route error:', error)
        return res.status(500).json({ error: error.message ?? 'Server error' })
    }
}

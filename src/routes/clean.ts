import { Request, Response } from 'express'
import { config } from '../config'
import { supabase } from '../supabase'

// POST /api/tiktok-business/clean   (requires login)
// CHANGED: the old route wiped EVERY row in goheza_tests. On a real shared
// table that would delete every user's connections, so this now removes only
// the logged-in user's own TikTok connection.
export async function clean(_req: Request, res: Response) {
    try {
        const { error } = await supabase
            .from(config.table)
            .delete()
            .eq('user_id', res.locals.userId)
            .eq('platform', 'tiktok')

        if (error) return res.status(500).json({ error: error.message })
        return res.json({ success: true })
    } catch (error: any) {
        console.error('Clean route error:', error)
        return res.status(500).json({ error: error.message ?? 'Server error' })
    }
}

import { NextFunction, Request, Response } from 'express'
import { supabase } from '../supabase'

// Replaces the old "no user at all" behaviour. The frontend sends the logged-in
// user's Supabase access token as `Authorization: Bearer <token>`.
export async function requireUser(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
        return res.status(401).json({ success: false, error: 'Missing Authorization bearer token' })
    }

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
        return res.status(401).json({ success: false, error: 'Invalid or expired session' })
    }

    res.locals.userId = data.user.id as string
    next()
}

import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { config } from '../config'

const expected = Buffer.from(config.apiKey)

// Every protected route must send:  x-api-key: <API_KEY>
// This identifies the calling APP. The user's Bearer token (requireUser)
// still identifies the USER. Both are required.
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
    const provided = Buffer.from(String(req.headers['x-api-key'] ?? ''))

    const valid = provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
    if (!valid) {
        return res.status(401).json({ success: false, error: 'Invalid or missing API key' })
    }
    next()
}

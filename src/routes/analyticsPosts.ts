import { Request, Response } from 'express'
import { businessIdOf, ensureFreshAccessToken, getConnectedAccount } from '../lib/tiktok-account'
import { fetchBusinessVideoList, resolvePostFields } from '../lib/tiktok-posts'

// POST /api/tiktok-business/analytics/posts   (requires login)
export async function analyticsPosts(req: Request, res: Response) {
    try {
        const body = req.body ?? {}
        const { cursor, maxCount } = body as { cursor?: number; maxCount?: number }

        if (cursor !== undefined && !Number.isInteger(cursor)) {
            return res.status(400).json({ success: false, error: 'cursor must be an integer (Unix timestamp in ms).' })
        }
        if (maxCount !== undefined && (!Number.isInteger(maxCount) || maxCount < 1 || maxCount > 20)) {
            return res.status(400).json({ success: false, error: 'maxCount must be an integer between 1 and 20.' })
        }

        const resolved = resolvePostFields(body.fields)
        if ('error' in resolved) return res.status(400).json({ success: false, error: resolved.error })

        const account = await getConnectedAccount(res.locals.userId)
        if (!account) {
            return res.status(400).json({ success: false, error: 'No connected TikTok account found.' })
        }

        const accessToken = await ensureFreshAccessToken(account)

        const { ok, json } = await fetchBusinessVideoList({
            accessToken,
            businessId: businessIdOf(account),
            fields: resolved.fields,
            cursor,
            maxCount,
        })

        if (!ok) {
            console.error('TikTok post list error:', json)
            return res.status(502).json({
                success: false,
                error: json.message ?? 'TikTok post list request failed',
                details: json,
            })
        }

        // Can be fewer than maxCount even when hasMore is true (trust & safety filtering).
        return res.json({
            success: true,
            requestId: json.request_id,
            videos: json.data?.videos ?? [],
            cursor: json.data?.cursor ?? null,
            hasMore: json.data?.has_more ?? false,
        })
    } catch (error: any) {
        console.error('Post list route error:', error)
        return res.status(500).json({ success: false, error: error.message ?? 'Internal server error' })
    }
}

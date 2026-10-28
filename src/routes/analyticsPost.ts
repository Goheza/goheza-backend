import { Request, Response } from 'express'
import { businessIdOf, ensureFreshAccessToken, extractTikTokVideoId, getConnectedAccount } from '../lib/tiktok-account'
import { fetchBusinessVideoList, resolvePostFields } from '../lib/tiktok-posts'

// POST /api/tiktok-business/analytics/post   (requires login)
export async function analyticsPost(req: Request, res: Response) {
    try {
        const body = req.body ?? {}
        const raw: string | undefined = body.videoUrl ?? body.videoId

        if (!raw) return res.status(400).json({ success: false, error: 'Missing videoUrl or videoId' })

        const videoId = extractTikTokVideoId(raw)
        if (!videoId) {
            return res.status(400).json({ success: false, error: 'Could not extract a video ID from that link' })
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
            filters: { video_ids: [videoId] },
        })

        if (!ok) {
            console.error('TikTok post insights error:', json)
            return res.status(502).json({
                success: false,
                error: json.message ?? 'TikTok post insights request failed',
                details: json,
            })
        }

        const video = json.data?.videos?.[0]
        if (!video) {
            return res.status(404).json({
                success: false,
                error: 'Video not found. Check the link, that it belongs to the connected account, and that it was not filtered out (e.g. music copyright).',
            })
        }

        return res.json({ success: true, requestId: json.request_id, videoId, video })
    } catch (error: any) {
        console.error('Post insights route error:', error)
        return res.status(500).json({ success: false, error: error.message ?? 'Internal server error' })
    }
}

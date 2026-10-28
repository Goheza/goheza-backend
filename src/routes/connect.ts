import { Request, Response } from 'express'
import { config } from '../config'
import { signState } from '../lib/state'

export const safeRedirectPath = (path: unknown, fallback: string): string =>
    typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : fallback

export const DEFAULT_RETURN = '/app/56738-b-323'

// POST /api/tiktok-business/connect   (requires login)
export async function connect(req: Request, res: Response) {
    try {
        const returnTo = safeRedirectPath(req.body?.returnTo, DEFAULT_RETURN)
        const state = signState(res.locals.userId, returnTo)

        const redirectUri = `${config.apiPublicUrl}/api/tiktok-business/callback`

        const scopes = [
            'user.info.basic',
            'video.list',
            'video.insights',
            'video.publish',
            'video.upload',
            'biz.creator.info',
            'biz.creator.insights',
            'user.info.username',
            'user.info.stats',
            'user.info.profile',
            'user.account.type',
            'user.insights',
            'comment.list',
            'comment.list.manage',
        ].join(',')

        const authUrl =
            `https://www.tiktok.com/v2/auth/authorize/?` +
            `client_key=${config.tiktokAppId}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${encodeURIComponent(state)}`

        return res.json({ authUrl })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Generation failed' })
    }
}

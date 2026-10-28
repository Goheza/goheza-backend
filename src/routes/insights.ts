import { Request, Response } from 'express'
import { businessIdOf, ensureFreshAccessToken, getConnectedAccount } from '../lib/tiktok-account'

const BUSINESS_GET_URL = 'https://business-api.tiktok.com/open_api/v1.3/business/get/'

// Every field the v1.3 /business/get/ doc lists, grouped by required scope.
const PROFILE_FIELDS = [
    'is_business_account', // user.account.type
    'has_advanced_access', // user.account.type
    'profile_image', // user.info.basic
    'display_name', // user.info.basic
    'username', // user.info.username
    'profile_deep_link', // user.info.profile
    'bio_description', // user.info.profile
    'is_verified', // user.info.profile
    'following_count', // user.info.stats
    'followers_count', // user.info.stats
    'total_likes', // user.info.stats
    'videos_count', // user.info.stats
] as const

const METRIC_FIELDS = [
    // all need user.insights
    'video_views',
    'unique_video_views', // Advanced Access / Verified Business only
    'profile_views',
    'likes',
    'comments',
    'shares',
    'phone_number_clicks', // Verified Business only
    'lead_submissions', // Verified Business only
    'app_download_clicks', // Verified Business only
    'bio_link_clicks', // Verified Business only
    'email_clicks', // Verified Business only
    'address_clicks', // Verified Business only
    'daily_total_followers', // Advanced Access / Verified Business only
    'daily_new_followers', // Advanced Access / Verified Business only
    'daily_lost_followers', // Advanced Access / Verified Business only
    'engaged_audience', // Advanced Access / Verified Business only
    'audience_activity', // 100+ followers
    'audience_ages', // 100+ followers
    'audience_genders', // 100+ followers
    'audience_countries', // 100+ followers
    'audience_cities', // 100+ followers
] as const

const ALLOWED_FIELDS = new Set<string>([...PROFILE_FIELDS, ...METRIC_FIELDS])
const DEFAULT_FIELDS: string[] = [...PROFILE_FIELDS, ...METRIC_FIELDS]
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// POST /api/tiktok-business/insights   (requires login)
export async function insights(req: Request, res: Response) {
    try {
        const body = req.body ?? {}
        const { startDate, endDate } = body as { startDate?: string; endDate?: string }
        const requested: unknown = body.fields

        if ((startDate && !DATE_RE.test(startDate)) || (endDate && !DATE_RE.test(endDate))) {
            return res.status(400).json({ success: false, error: 'startDate and endDate must be YYYY-MM-DD (UTC).' })
        }

        let fields = DEFAULT_FIELDS
        if (requested !== undefined) {
            if (!Array.isArray(requested) || requested.length === 0) {
                return res.status(400).json({ success: false, error: 'fields must be a non-empty array of strings.' })
            }
            const unknown = requested.filter((f) => typeof f !== 'string' || !ALLOWED_FIELDS.has(f))
            if (unknown.length) {
                return res.status(400).json({ success: false, error: `Unsupported fields: ${unknown.join(', ')}` })
            }
            fields = requested as string[]
        }

        const account = await getConnectedAccount(res.locals.userId)
        if (!account) {
            return res.status(400).json({ success: false, error: 'No connected TikTok account found.' })
        }

        const accessToken = await ensureFreshAccessToken(account)

        const url = new URL(BUSINESS_GET_URL)
        url.searchParams.set('business_id', businessIdOf(account))
        url.searchParams.set('fields', JSON.stringify(fields))
        // If omitted, TikTok defaults to [today - 7d, today - 1d]; max look-back is 60 days.
        if (startDate) url.searchParams.set('start_date', startDate)
        if (endDate) url.searchParams.set('end_date', endDate)

        const tiktokRes = await fetch(url.toString(), { headers: { 'Access-Token': accessToken } })
        const json: any = await tiktokRes.json()

        if (!tiktokRes.ok || json.code !== 0) {
            console.error('TikTok account insights error:', json)
            return res.status(502).json({
                success: false,
                error: json.message ?? 'TikTok account insights request failed',
                details: json,
            })
        }

        return res.json({ success: true, requestId: json.request_id, data: json.data })
    } catch (error: any) {
        console.error('Account insights route error:', error)
        return res.status(500).json({ success: false, error: error.message ?? 'Internal server error' })
    }
}

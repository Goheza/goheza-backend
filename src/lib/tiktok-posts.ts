// Replaces `@/lib/tiktok-business-posts` (also missing from the zip, rebuilt
// from usage. Compare with your original, especially the default field list.)
const VIDEO_LIST_URL = 'https://business-api.tiktok.com/open_api/v1.3/business/video/list/'

const DEFAULT_POST_FIELDS = [
    'item_id',
    'create_time',
    'thumbnail_url',
    'share_url',
    'embed_url',
    'caption',
    'video_duration',
    'video_views',
    'likes',
    'comments',
    'shares',
    'reach',
    'full_video_watched_rate',
    'total_time_watched',
    'average_time_watched',
]

export function resolvePostFields(requested: unknown): { fields: string[] } | { error: string } {
    if (requested === undefined) return { fields: DEFAULT_POST_FIELDS }
    if (!Array.isArray(requested) || requested.length === 0 || requested.some((f) => typeof f !== 'string')) {
        return { error: 'fields must be a non-empty array of strings.' }
    }
    return { fields: requested as string[] }
}

export async function fetchBusinessVideoList(opts: {
    accessToken: string
    businessId: string
    fields: string[]
    filters?: { video_ids?: string[] }
    cursor?: number
    maxCount?: number
}): Promise<{ ok: boolean; json: any }> {
    const url = new URL(VIDEO_LIST_URL)
    url.searchParams.set('business_id', opts.businessId)
    url.searchParams.set('fields', JSON.stringify(opts.fields))
    if (opts.filters) url.searchParams.set('filters', JSON.stringify(opts.filters))
    if (opts.cursor !== undefined) url.searchParams.set('cursor', String(opts.cursor))
    if (opts.maxCount !== undefined) url.searchParams.set('max_count', String(opts.maxCount))

    const res = await fetch(url.toString(), { headers: { 'Access-Token': opts.accessToken } })
    const json: any = await res.json()
    return { ok: res.ok && json.code === 0, json }
}

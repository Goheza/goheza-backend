import 'dotenv/config'

function need(name: string): string {
    const v = process.env[name]
    if (!v) throw new Error(`Missing environment variable: ${name}`)
    return v
}

export const config = {
    port: Number(process.env.PORT ?? 4000),
    apiPublicUrl: need('API_PUBLIC_URL').replace(/\/$/, ''),
    frontendUrl: need('FRONTEND_URL').replace(/\/$/, ''),
    supabaseUrl: need('SUPABASE_URL'),
    supabaseServiceKey: need('SUPABASE_SERVICE_ROLE_KEY'),
    tiktokAppId: need('TIKTOK_BUSINESS_APP_ID'),
    tiktokAppSecret: need('TIKTOK_BUSINESS_APP_SECRET'),
    stateSecret: need('OAUTH_STATE_SECRET'),
    apiKey: need('API_KEY'),
    table: 'creator_social_accounts', // <-- the one place the table name lives
}

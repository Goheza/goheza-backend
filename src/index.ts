import cors from 'cors'
import express from 'express'
import { config } from './config'
import { requireApiKey } from './middleware/apiKey'
import { requireUser } from './middleware/auth'
import { analyticsPost } from './routes/analyticsPost'
import { analyticsPosts } from './routes/analyticsPosts'
import { callback } from './routes/callback'
import { clean } from './routes/clean'
import { connect } from './routes/connect'
import { insights } from './routes/insights'
import { status } from './routes/status'

const app = express()

app.use(cors({ origin: config.frontendUrl, allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'] }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

// Same paths as the Next.js app, so TikTok's redirect URI and frontend paths stay familiar.
const r = express.Router()

// Public on purpose: TikTok redirects the user's browser here and cannot send
// an API key. It is protected by the signed, expiring `state` instead.
r.get('/callback', callback)

// Everything below requires BOTH the API key and a logged-in user.
r.use(requireApiKey)
r.post('/connect', requireUser, connect)
r.get('/status', requireUser, status)
r.post('/clean', requireUser, clean)
r.post('/insights', requireUser, insights)
r.post('/analytics/post', requireUser, analyticsPost)
r.post('/analytics/posts', requireUser, analyticsPosts)
app.use('/api/tiktok-business', r)

app.listen(config.port, () => console.log(`TikTok backend listening on :${config.port}`))

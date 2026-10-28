import crypto from 'crypto'
import { config } from '../config'

// The OAuth callback is a plain browser redirect from TikTok, so it carries no
// Authorization header. We put the user id inside a signed, expiring `state`
// instead (this replaces the old cookie-based CSRF check).
interface StatePayload {
    uid: string
    returnTo: string
    n: string
    exp: number
}

const b64 = (s: string) => Buffer.from(s).toString('base64url')
const sign = (data: string) => crypto.createHmac('sha256', config.stateSecret).update(data).digest('base64url')

export function signState(uid: string, returnTo: string): string {
    const payload: StatePayload = {
        uid,
        returnTo,
        n: crypto.randomBytes(8).toString('hex'),
        exp: Date.now() + 10 * 60 * 1000,
    }
    const body = b64(JSON.stringify(payload))
    return `${body}.${sign(body)}`
}

export function verifyState(state: string): StatePayload | null {
    const [body, sig] = state.split('.')
    if (!body || !sig) return null

    const expected = sign(body)
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as StatePayload
        if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
        return payload
    } catch {
        return null
    }
}

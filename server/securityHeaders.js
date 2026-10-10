// Response headers for every route. The CSP allows this origin and the opt-in Meta Pixel
// plus the HTML shell's own inline script (by hash), and frames only the embed
// players the resolver emits. Emotion injects <style> tags, hence inline styles.
import crypto from 'node:crypto'
import helmet from 'helmet'
import { EMBED_ORIGINS } from './features/public-pages/embeds.js'

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi

// Browsers hash the parsed script text, whose line endings are already LF.
export function inlineScriptHashes(html) {
  return [...html.matchAll(INLINE_SCRIPT)].map(([, body]) => {
    const text = body.replace(/\r\n?/g, '\n')
    return `'sha256-${crypto.createHash('sha256').update(text).digest('base64')}'`
  })
}

export function securityHeaders({ shellHtml = '' } = {}) {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://connect.facebook.net', ...inlineScriptHashes(shellHtml)],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https://www.facebook.com'],
        frameSrc: EMBED_ORIGINS,
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xFrameOptions: { action: 'deny' },
  })
}

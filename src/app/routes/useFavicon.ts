import { useEffect } from 'react'
import fallbackIconUrl from '../../../shared/icons/gb_whiteback_128.png'

// The browser tab icon, written from the page payload the way document.title is:
// each route passes the image that identifies it (a band's avatar, a release's
// cover art) and anything without one gets the GigBuddy logo. The <link> from
// index.html is reused when present so the tab never carries two icons.
export default function useFavicon(href?: string | null) {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = href || fallbackIconUrl
  }, [href])
}

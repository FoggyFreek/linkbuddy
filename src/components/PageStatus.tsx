import CenteredStatus from './CenteredStatus.js'

// The three states a public page can be in before (or instead of) its content:
// still loading, no such published page, or the fetch failed. Shared by both
// public routes and the router's malformed-path branch so the wording of a
// not-found page is written once.
export type PageLoadStatus = 'loading' | 'ready' | 'notfound' | 'error'

export default function PageStatus({ status }: { status: PageLoadStatus }) {
  if (status === 'loading') return <CenteredStatus busy />
  if (status === 'error') return <CenteredStatus>Something went wrong — try again later.</CenteredStatus>
  return <CenteredStatus>This page doesn&apos;t exist (or isn&apos;t published yet).</CenteredStatus>
}

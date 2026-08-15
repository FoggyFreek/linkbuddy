import type { ReactNode } from 'react'

export type PageType = 'main' | 'release'
export type PageTheme = 'light' | 'dark'
export type DraftTheme = PageTheme | null
export type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'expired'
export type EditorTab = 'build' | 'appearance' | 'preview' | 'stats'
export type LinkClickHandler = (target: string) => void

export interface Link {
  label: string
  url: string
  platform?: Platform
}

export interface Platform {
  id: string
  label: string
  iconKey: string
  url?: string
  embed?: EmbedDescriptor | null
}

export interface EmbedDescriptor {
  type: string
  src: string
  aspectRatio?: string | number
  display?: 'overlay' | 'inline'
  height?: number
}

export interface Band {
  name: string
  slug?: string
  bio?: string | null
  avatarUrl?: string | null
  bannerUrl?: string | null
  logoUrl?: string | null
  logoDarkUrl?: string | null
  socials?: Record<string, string | null | undefined>
}

export interface Song {
  id: number
  title: string
  artist?: string | null
  coverUrl?: string | null
  links?: Link[]
}

export interface Product {
  id: number
  name: string
  priceCents: number
  imageUrl?: string | null
}

export interface Gig {
  id: number | string
  title?: string | null
  venue?: string | null
  city?: string | null
  startsAt?: string
  date: string
  url?: string | null
  eventUrl?: string | null
  ticketUrl?: string | null
  soldOut?: boolean
}

export interface ContentSnapshot {
  band?: Band | null
  songs?: Song[]
  products?: Product[]
  gigs?: Gig[]
  [key: string]: unknown
}

interface WidgetBase {
  id: string
  type: WidgetType
}

export interface SongWidgetDraft extends WidgetBase {
  type: 'song'
  songId: number
}

export interface PlatformsWidgetDraft extends WidgetBase {
  type: 'platforms'
  songId: number
  title: string | null
}

export interface GigsWidgetDraft extends WidgetBase {
  type: 'gigs'
  title: string | null
  limit: number
}

export interface MerchItemDraft {
  productId: number
  imageUrl: string | null
  badge: string | null
}

export interface MerchWidgetDraft extends WidgetBase {
  type: 'merch'
  title: string | null
  shopUrl: string | null
  items: MerchItemDraft[]
}

export interface EmbedWidgetDraft extends WidgetBase {
  type: 'embed'
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
}

export interface LinkWidgetDraft extends WidgetBase {
  type: 'link'
  label: string
  sublabel: string | null
  url: string
  icon: string
  imageUrl: string | null
}

export type DraftWidget =
  | SongWidgetDraft
  | PlatformsWidgetDraft
  | GigsWidgetDraft
  | MerchWidgetDraft
  | EmbedWidgetDraft
  | LinkWidgetDraft
export type WidgetType = DraftWidget['type']

export interface DraftSection {
  id: string
  title: string | null
  widgets: DraftWidget[]
}

export interface Layout {
  background: string
  font: string
  showBanner: boolean
  theme: DraftTheme
  sections: DraftSection[]
}

export interface ResolvedSongWidget extends WidgetBase {
  type: 'song'
  title: string
  artist?: string | null
  coverUrl?: string | null
  links: Link[]
}

export interface ResolvedPlatformsWidget extends WidgetBase {
  type: 'platforms'
  title?: string | null
  platforms: Platform[]
}

export interface ResolvedGigsWidget extends WidgetBase {
  type: 'gigs'
  title: string
  gigs: Gig[]
}

export interface ResolvedMerchProduct extends Product {
  badge?: string | null
}

export interface ResolvedMerchWidget extends WidgetBase {
  type: 'merch'
  title?: string | null
  shopUrl?: string | null
  products: ResolvedMerchProduct[]
}

export interface ResolvedEmbedWidget extends Omit<EmbedWidgetDraft, 'type'> {
  type: 'embed'
  embed?: EmbedDescriptor | null
}

export interface ResolvedLinkWidget extends Omit<LinkWidgetDraft, 'type'> {
  type: 'link'
  embed?: EmbedDescriptor | null
}

export type ResolvedWidget =
  | ResolvedSongWidget
  | ResolvedPlatformsWidget
  | ResolvedGigsWidget
  | ResolvedMerchWidget
  | ResolvedEmbedWidget
  | ResolvedLinkWidget

export interface ResolvedSection {
  id: string
  title?: string | null
  widgets: ResolvedWidget[]
}

export interface Release {
  title: string
  artist?: string | null
  coverUrl?: string | null
}

export interface ResolvedPage {
  band: Band | null
  release: Release | null
  background: string
  font: string
  showBanner: boolean
  theme: PageTheme
  sections: ResolvedSection[]
  gigbuddyUrl?: string
}

export interface ReleaseSnapshot {
  songId: number
  title: string
  artist?: string | null
}

export interface PageListEntry {
  id: number
  slug: string
  pageType: PageType
  release: ReleaseSnapshot | null
  publishedAt: string | null
}

export interface EditorPage extends PageListEntry {
  draftLayout: Layout
  contentSyncedAt: string | null
  content: ContentSnapshot
  publicUrl: string
}

export interface UnfurlResult {
  title?: string | null
  siteName?: string | null
  description?: string | null
  imageUrl?: string | null
  embed?: EmbedDescriptor | null
}

export interface StatsRow { key: string; views: number }
export interface TargetStatsRow { key: string; clicks: number }
export interface ConversionStatsRow extends StatsRow { clicks: number; ctr: number | null }
export interface DailyStatsRow { day: string; views: number; clicks: Record<string, number> }
export interface Stats {
  days: number
  retentionDays: number
  enabled: boolean
  totalViews: number
  uniqueVisits: number
  totalClicks: number
  clickThroughRate: number | null
  byDay: DailyStatsRow[]
  byDevice: StatsRow[]
  bySource: StatsRow[]
  byCountry: StatsRow[]
  byTarget: TargetStatsRow[]
  conversionBySource: ConversionStatsRow[]
}

export interface DragLocation { sectionId: string; index: number }
export type NullableNode = ReactNode | null

export interface WidgetRendererProps<T extends ResolvedWidget = ResolvedWidget> {
  widget: T
  onLinkClick: LinkClickHandler
}

export class ApiError extends Error {
  status?: number
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error'
}

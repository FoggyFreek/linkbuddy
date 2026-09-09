import { afterEach, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render, cleanup } from 'vitest-browser-react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../lib/theme.js'
import AccoladesWidget from '../widgets/AccoladesWidget.js'
import { WidgetEditor } from '../../features/editor/components/WidgetEditors.js'

afterEach(cleanup)

it('renders accolade details and a horizontally scrollable, keyboard-accessible carousel', async () => {
  const onLinkClick = vi.fn()
  const accolades = Array.from({ length: 4 }, (_, id) => ({ id, description: id === 2 ? `Award ${id} ${'with a much longer citation '.repeat(6)}` : `Award ${id}`, date: '2026-09-01', url: id === 0 ? 'https://example.org/award' : null, imageUrl: id === 0 ? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' : null }))
  const screen = await render(<ThemeProvider theme={theme}><div style={{ width: 320 }}><AccoladesWidget widget={{ id: 'a', type: 'accolades', title: 'Awards', accolades }} onLinkClick={onLinkClick} /></div></ThemeProvider>)
  await expect.element(screen.getByText('Award 0')).toBeVisible()
  await expect.element(screen.getByRole('heading', { name: 'Awards' })).toBeVisible()
  const carousel = screen.container.querySelector('[aria-roledescription="carousel"]')
  expect(carousel.scrollWidth).toBeGreaterThan(carousel.clientWidth)
  expect(carousel.clientWidth).toBeLessThanOrEqual(320)
  expect(carousel.tabIndex).toBe(0)
  expect(getComputedStyle(carousel).scrollSnapType).toBe('x mandatory')
  const time = screen.container.querySelector('time')
  const timeColor = getComputedStyle(time).color
  expect(time.dateTime).toBe('2026-09-01')
  const description = screen.container.querySelector('article p')
  expect(time.compareDocumentPosition(description)).toBe(Node.DOCUMENT_POSITION_PRECEDING)
  expect(timeColor).toBe(getComputedStyle(description).getPropertyValue('--mui-palette-text-disabled'))
  expect(parseFloat(getComputedStyle(description).fontSize)).toBeLessThan(parseFloat(getComputedStyle(description.closest('article')).fontSize))
  const badge = screen.container.querySelector('img')
  expect(badge.getBoundingClientRect().height).toBe(115)
  expect(getComputedStyle(badge).marginTop).toBe('16px')
  expect(badge.getBoundingClientRect().width).toBeLessThanOrEqual(badge.parentElement.getBoundingClientRect().width - 32)
  expect(screen.container.querySelectorAll('img')).toHaveLength(1)
  await screen.getByRole('button', { name: 'Next accolade' }).click()
  await vi.waitFor(() => expect(carousel.scrollLeft).toBeGreaterThan(0))
  await screen.getByRole('button', { name: 'Previous accolade' }).click()
  await vi.waitFor(() => expect(carousel.scrollLeft).toBe(0))
  carousel.focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(carousel.scrollLeft).toBeGreaterThan(0))
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(carousel.scrollLeft).toBe(0))
  const card = screen.container.querySelector('article')
  const cardStyle = getComputedStyle(card)
  expect(cardStyle.backgroundColor).toBe('rgb(255, 255, 255)')
  expect(cardStyle.boxShadow).not.toBe('none')
  const containerStyle = getComputedStyle(card.closest('.MuiPaper-root:not(article)'))
  expect(containerStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)')
  expect(containerStyle.boxShadow).toBe('none')
  const nextStyle = getComputedStyle(screen.container.querySelector('[aria-label="Next accolade"]'))
  expect(nextStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)')
  expect(nextStyle.boxShadow).toBe('none')
  expect(nextStyle.color).toBe(cardStyle.color)
  const cards = [...screen.container.querySelectorAll('article')]
  expect(getComputedStyle(cards[0]).zIndex).toBe('2')
  expect(getComputedStyle(cards[1]).zIndex).toBe('1')
  expect(cards[1].getBoundingClientRect().left).toBeLessThan(cards[0].getBoundingClientRect().right)
  // Layout width, unaffected by the neighbours' scale transform.
  expect(screen.container.querySelector('article').offsetWidth).toBeCloseTo(320 * 0.52, 0)
  const dots = screen.container.querySelectorAll('[data-carousel-dot]')
  expect(dots).toHaveLength(4)
  expect(dots[0].getAttribute('aria-current')).toBe('true')
  await screen.getByRole('button', { name: 'Go to accolade 3' }).click()
  await vi.waitFor(() => {
    expect(carousel.scrollLeft).toBeGreaterThan(0)
    expect(screen.container.querySelectorAll('[data-carousel-dot]')[2].getAttribute('aria-current')).toBe('true')
  })
  await screen.getByRole('button', { name: 'Go to accolade 1' }).click()
  await vi.waitFor(() => expect(carousel.scrollLeft).toBe(0))
  const link = screen.container.querySelector('a')
  expect(link.href).toBe('https://example.org/award')
  const linkBox = link.getBoundingClientRect()
  const articleBox = link.closest('article').getBoundingClientRect()
  expect(linkBox.width).toBe(articleBox.width)
  expect(linkBox.height).toBe(articleBox.height)
  link.addEventListener('click', (event) => event.preventDefault())
  link.click()
  expect(onLinkClick).toHaveBeenCalledWith('accolade:0')
  expect(screen.container.querySelectorAll('a')).toHaveLength(1)
})

it('hides the carousel controls for a single accolade', async () => {
  const accolades = [{ id: 1, description: 'Only one', date: '2026-09-01', url: null, imageUrl: null }]
  const screen = await render(<ThemeProvider theme={theme}><div style={{ width: 320 }}><AccoladesWidget widget={{ id: 'a', type: 'accolades', title: 'Awards', accolades }} onLinkClick={vi.fn()} /></div></ThemeProvider>)
  await expect.element(screen.getByText('Only one')).toBeVisible()
  expect(screen.container.querySelectorAll('[data-carousel-dot]')).toHaveLength(0)
  expect(screen.container.querySelector('[aria-label="Next accolade"]')).toBeNull()
  expect(screen.container.querySelector('[aria-label="Previous accolade"]')).toBeNull()
})

it('lets editors change the carousel title', async () => {
  const onChange = vi.fn()
  const widget = { id: 'a', type: 'accolades', title: 'Accolades' }
  const screen = await render(<ThemeProvider theme={theme}><WidgetEditor widget={widget} content={{}} onChange={onChange} onUnfurl={vi.fn()} /></ThemeProvider>)
  await screen.getByRole('textbox', { name: 'Accolades title' }).fill('Press and awards')
  expect(onChange).toHaveBeenLastCalledWith({ ...widget, title: 'Press and awards' })
})

it('stacks the selected card over its overlapping neighbours and keeps it centred', async () => {
  const accolades = Array.from({ length: 4 }, (_, id) => ({ id, description: `Award ${id}`, date: '2026-09-01', url: null, imageUrl: null }))
  const screen = await render(<ThemeProvider theme={theme}><div style={{ width: 320 }}><AccoladesWidget widget={{ id: 'a', type: 'accolades', title: 'Awards', accolades }} onLinkClick={vi.fn()} /></div></ThemeProvider>)
  const cards = [...screen.container.querySelectorAll('article')]
  const matrix = (index) => new DOMMatrixReadOnly(getComputedStyle(cards[index]).transform)
  await screen.getByRole('button', { name: 'Go to accolade 2' }).click()
  await vi.waitFor(() => {
    expect(matrix(1).m11).toBe(1)
    expect(matrix(0).m11).toBeLessThan(1)
    expect(matrix(2).m11).toBeLessThan(1)
  })
  // No tilt: cards are scaled in-plane only.
  cards.forEach((_, index) => {
    expect(matrix(index).m13).toBe(0)
    expect(matrix(index).m12).toBe(0)
  })
  expect(getComputedStyle(cards[1]).zIndex).toBe('2')
  expect(getComputedStyle(cards[0]).zIndex).toBe('1')
  expect(cards[1].getBoundingClientRect().left).toBeLessThan(cards[0].getBoundingClientRect().right)
  expect(getComputedStyle(cards[0]).transitionProperty).toContain('transform')
  await screen.getByRole('button', { name: 'Go to accolade 4' }).click()
  await vi.waitFor(() => expect(matrix(3).m11).toBe(1))
  const carousel = screen.container.querySelector('[aria-roledescription="carousel"]')
  const centre = carousel.getBoundingClientRect().left + carousel.clientWidth / 2
  const selected = cards[3].getBoundingClientRect()
  expect(Math.abs(selected.left + selected.width / 2 - centre)).toBeLessThan(2)
})

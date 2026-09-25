// Pure hit-testing for the Build tab's drag-to-reorder. A pointer over the middle
// of a row swaps with it; near a row's edge, in a gap, or beside a list it inserts
// into the nearest gap — so every pointer position resolves to a drop.

export interface ReorderSpot { list: string; index: number }
export interface DropTarget extends ReorderSpot { mode: 'insert' | 'swap' }
export interface ListGeometry { id: string; top: number; bottom: number; items: Array<{ top: number; bottom: number }> }

const MAX_EDGE = 16

function gapPositions(list: ListGeometry): Array<{ index: number; top: number; bottom: number }> {
  const { items } = list
  if (!items.length) return [{ index: 0, top: list.top, bottom: list.bottom }]
  return items.map((item, i) => {
    const y = i === 0 ? item.top : (items[i - 1].bottom + item.top) / 2
    return { index: i, top: y, bottom: y }
  }).concat({ index: items.length, top: items[items.length - 1].bottom, bottom: items[items.length - 1].bottom })
}

export function findDropTarget(y: number, lists: ListGeometry[]): DropTarget | null {
  for (const list of lists) {
    const index = list.items.findIndex((item) => y >= item.top && y <= item.bottom)
    if (index < 0) continue
    const { top, bottom } = list.items[index]
    const edge = Math.min(MAX_EDGE, (bottom - top) / 4)
    if (y < top + edge) return { mode: 'insert', list: list.id, index }
    if (y > bottom - edge) return { mode: 'insert', list: list.id, index: index + 1 }
    return { mode: 'swap', list: list.id, index }
  }

  let best: DropTarget | null = null
  let bestDistance = Infinity
  for (const list of lists) {
    for (const gap of gapPositions(list)) {
      const distance = Math.max(0, gap.top - y, y - gap.bottom)
      if (distance < bestDistance) {
        bestDistance = distance
        best = { mode: 'insert', list: list.id, index: gap.index }
      }
    }
  }
  return best
}

export function isNoopDrop(from: ReorderSpot, target: DropTarget): boolean {
  if (from.list !== target.list) return false
  if (target.mode === 'swap') return target.index === from.index
  return target.index === from.index || target.index === from.index + 1
}

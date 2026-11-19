// Splits a reply's markdown so paragraphs and lists holding inline code can be
// drawn by the mod (code in orange), and everything else by the app's Markdown.

export type Span =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'link'; text: string; href: string }

export type ListItem = { marker: string; depth: number; spans: Span[] }

export type Block =
  | { kind: 'markdown'; text: string }
  | { kind: 'paragraph'; spans: Span[] }
  | { kind: 'list'; items: ListItem[] }

const FENCE = /^\s*(```|~~~)/
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
// Lines the mod leaves to the app: headings, tables, quotes, rules, indented code.
const LEAVE_TO_APP = /^(\s*(#{1,6}\s|\||>|(-{3,}|\*{3,}|_{3,})\s*$)| {4,}(?![-*+]\s|\d+[.)]\s))/

const INLINE = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\[([^\]\n]+)\]\(([^)\s]+)\)|(?<![\w*])\*([^*\n]+)\*(?![\w*])|(?<![\w_])_([^_\n]+)_(?![\w_])/g

export const hasInlineCode = (text: string): boolean => /`[^`\n]+`/.test(text)

export function parseInline(text: string): Span[] {
  const spans: Span[] = []
  let last = 0

  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0

    if (at > last) {
      spans.push({ kind: 'text', text: text.slice(last, at) })
    }

    if (m[1] !== undefined) {
      spans.push({ kind: 'code', text: m[1] })
    } else if (m[2] !== undefined || m[3] !== undefined) {
      spans.push({ kind: 'bold', text: m[2] ?? m[3] ?? '' })
    } else if (m[4] !== undefined && m[5] !== undefined) {
      spans.push({ kind: 'link', text: m[4], href: m[5] })
    } else {
      spans.push({ kind: 'italic', text: m[6] ?? m[7] ?? '' })
    }

    last = at + m[0].length
  }

  if (last < text.length) {
    spans.push({ kind: 'text', text: text.slice(last) })
  }

  return spans
}

// A chunk (no blank lines, no fences) with inline code, as paragraph and list blocks,
// or undefined when it holds something the app should draw.
function drawChunk(lines: string[]): Block[] | undefined {
  if (lines.some(line => LEAVE_TO_APP.test(line))) {
    return undefined
  }

  const blocks: Block[] = []
  let paragraph: string[] = []
  let items: { marker: string; depth: number; text: string }[] = []

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', spans: parseInline(paragraph.join(' ')) })
      paragraph = []
    }
  }

  const flushList = () => {
    if (items.length > 0) {
      blocks.push({
        kind: 'list',
        items: items.map(item => ({ marker: item.marker, depth: item.depth, spans: parseInline(item.text) })),
      })
      items = []
    }
  }

  for (const line of lines) {
    const item = LIST_ITEM.exec(line)

    if (item !== null) {
      flushParagraph()
      const indent = item[1] ?? ''
      const marker = item[2] ?? '-'
      items.push({
        marker: /^\d/.test(marker) ? marker : '•',
        depth: Math.floor(indent.replace(/\t/g, '  ').length / 2),
        text: item[3] ?? '',
      })
      continue
    }

    const previous = items[items.length - 1]

    // A line under a list item continues it.
    if (previous !== undefined) {
      previous.text += ` ${line.trim()}`
      continue
    }

    paragraph.push(line.trim())
  }

  flushParagraph()
  flushList()

  return blocks
}

export function splitReply(text: string): Block[] {
  const blocks: Block[] = []
  let markdown: string[] = []

  const pushMarkdown = (chunk: string) => {
    markdown.push(chunk)
  }

  const flushMarkdown = () => {
    const joined = markdown.join('\n\n').trim()

    if (joined.length > 0) {
      blocks.push({ kind: 'markdown', text: joined })
    }

    markdown = []
  }

  // Cut into chunks at blank lines, keeping each fenced block whole.
  const chunks: { lines: string[]; isFence: boolean }[] = []
  let current: string[] = []
  let fence: string | undefined

  for (const line of text.split('\n')) {
    const opener = FENCE.exec(line)

    if (fence === undefined && opener !== null) {
      if (current.length > 0) {
        chunks.push({ lines: current, isFence: false })
      }
      current = [line]
      fence = opener[1]
      continue
    }

    if (fence !== undefined) {
      current.push(line)

      if (line.trim().startsWith(fence) && current.length > 1) {
        chunks.push({ lines: current, isFence: true })
        current = []
        fence = undefined
      }
      continue
    }

    if (line.trim() === '') {
      if (current.length > 0) {
        chunks.push({ lines: current, isFence: false })
      }
      current = []
      continue
    }

    current.push(line)
  }

  if (current.length > 0) {
    chunks.push({ lines: current, isFence: fence !== undefined })
  }

  for (const chunk of chunks) {
    const joined = chunk.lines.join('\n')

    if (chunk.isFence || !hasInlineCode(joined)) {
      pushMarkdown(joined)
      continue
    }

    const drawn = drawChunk(chunk.lines)

    if (drawn === undefined) {
      pushMarkdown(joined)
      continue
    }

    flushMarkdown()
    blocks.push(...drawn)
  }

  flushMarkdown()

  return blocks
}

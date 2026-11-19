import type { Register, ThemeSetArgs } from 'claude-code'

import { type Block, type Span, hasInlineCode, splitReply } from './inline.js'
import { makeColors } from './make-colors.js'

// Deep Material navy surfaces with its bright syntax hues; dark mode only.
const { theme, problems } = makeColors({
  label: 'Ocean Glass',
  only: 'dark',
  roles: {
    // Keywords are coloured from accent: Claude orange.
    accent: '#d97757',
    danger: '#f07178',
    success: '#c3e88d',
    warning: '#ffcb6b',
    pro: '#82aaff',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0f111a',
        // Panels (the sidebar among them) a step lighter and bluer than the chat.
        'surface-1': '#151a2c',
        'surface-2': '#181e32',
        'surface-3': '#1a2036',
        'text-primary': '#eeffff',
        'text-secondary': '#b0bec5',
        'text-muted': '#8f93a2',
      },
      // The app's see-through overlays are this light end over navy; blue-white
      // keeps them navy where pure white would wash them grey.
      stops: { 0: '#e6eeff', 10: '#e8f0ff', 20: '#eaf2ff', 30: '#ecf5ff', 40: '#edf9ff' },
    },
    git: {
      added: '#c3e88d',
      removed: '#f07178',
      modified: '#82aaff',
    },
  },
})

// Bubble colours: the glass is hex with alpha, so the page shows faintly through it.
const USER_FILL = '#2f5fb8'
const USER_EDGE = '#2f5fb8'
const USER_TEXT = '#ffffff'
const GLASS_FILL = '#0b0d12a6'
const GLASS_EDGE = '#ffffff24'

// The engine refuses a width on any Box above its own row, so an empty spacer
// takes the other third and the bubble keeps at most two thirds of the row.
const SPACER_WIDTH = '34%'

// Inline code in replies: Claude orange on a faint chip, as keywords are in code blocks.
const INLINE_CODE = '#d97757'
const INLINE_CODE_BG = '#ffffff12'

// A still backdrop in the chat's own navy. Desktop draws its panels (the sidebar)
// as glass over the backdrop, so the glass tint is what makes the sidebar navy.
const CHAT_NAVY = '#0f111a'
const PANEL_NAVY = '#151a2c'

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10" preserveAspectRatio="xMidYMid slice"><rect width="16" height="10" fill="${CHAT_NAVY}"/></svg>`

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'navy', glass: { blur: 0, tint: PANEL_NAVY, opacity: 1 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="" />
  })

  // Your prompts: the bubble itself is blue. The engine's own row brings a grey
  // bubble of its own, so the text is drawn here instead of wrapping that row.
  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    // Task notifications and other agents' messages keep the plain row.
    if (e.props.task !== undefined || e.props.from !== undefined) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" justifyContent="flex-end" marginY={1}>
        <Box width={SPACER_WIDTH} flexShrink={0} />
        <Box
          borderStyle="round"
          borderColor={USER_EDGE}
          backgroundColor={USER_FILL}
          paddingX={2}
          paddingY={1}
        >
          <Text color={USER_TEXT}>{e.props.text}</Text>
        </Box>
      </Box>
    )
  })

  // Each block of a reply (the text between tool calls): its own dark glass bubble, set to the left.
  // A block with inline code is drawn by the mod so the code can be orange; the rest keeps the app's row.
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }

    const { Box, Text, Link, Markdown } = $.ui.resolve(e)

    const drawSpan = (span: Span) => {
      switch (span.kind) {
        case 'code':
          return (
            <Text mono color={INLINE_CODE} backgroundColor={INLINE_CODE_BG}>
              {span.text}
            </Text>
          )
        case 'bold':
          return <Text weight="semibold">{span.text}</Text>
        case 'italic':
          return <Text italic>{span.text}</Text>
        case 'link':
          return <Link href={span.href}>{span.text}</Link>
        default:
          return span.text
      }
    }

    const drawBlock = (block: Block) => {
      if (block.kind === 'markdown') {
        return <Markdown text={block.text} />
      }

      if (block.kind === 'paragraph') {
        return <Text>{block.spans.map(drawSpan)}</Text>
      }

      return (
        <Box flexDirection="column" gap={0}>
          {block.items.map(item => (
            <Box flexDirection="row" marginLeft={item.depth * 2}>
              <Box width={item.marker.length + 1} flexShrink={0}>
                <Text>{item.marker}</Text>
              </Box>
              <Box flexShrink={1}>
                <Text>{item.spans.map(drawSpan)}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      )
    }

    const body = hasInlineCode(e.props.text) ? (
      <Box flexDirection="column" gap={1}>
        {splitReply(e.props.text).map(drawBlock)}
      </Box>
    ) : (
      await next(e)
    )

    return (
      <Box flexDirection="row" justifyContent="flex-start" marginY={1}>
        <Box
          borderStyle="round"
          borderColor={GLASS_EDGE}
          backgroundColor={GLASS_FILL}
          paddingX={2}
          paddingY={1}
        >
          {body}
        </Box>
        <Box width={SPACER_WIDTH} flexShrink={0} />
      </Box>
    )
  })
}

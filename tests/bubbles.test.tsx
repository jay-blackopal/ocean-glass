import { expect, test } from 'claude-code/testing'

const REPLY = {
  plugin: 'ocean-glass',
  surface: 'desktop',
  component: 'AssistantMessage',
} as const

test('inline code in a reply is drawn orange; the rest keeps its formatting', async $ => {
  const ui = await $.ui.mount({
    ...REPLY,
    props: {
      text: 'Run `claude plugin validate` **first**.\n\n- a `width` item\n\n## Heading\n\n```ts\nconst x = 1\n```',
      isFirstOfReply: true,
    },
  })

  await ui.drawn()
  const orange = (await ui.findAll({ type: 'Text' })).filter(t => t.props.color === '#d97757')
  expect(orange.map(t => t.text)).toEqual(['claude plugin validate', 'width'])
  expect(orange[0]?.props).toMatchObject({ mono: true })
  expect(await ui.find({ type: 'Markdown' })).toBeDefined()
  await ui.unmount()
})

test('your prompt is drawn as white text in a solid blue bubble', async $ => {
  const ui = await $.ui.mount({
    plugin: 'ocean-glass',
    surface: 'desktop',
    component: 'UserMessage',
    props: { text: 'make it purple', origin: { kind: 'composer' }, isExpanded: true },
  })

  const text = await ui.find({ type: 'Text', text: 'make it purple' })
  expect(text?.props).toMatchObject({ color: '#ffffff' })
  await ui.unmount()
})

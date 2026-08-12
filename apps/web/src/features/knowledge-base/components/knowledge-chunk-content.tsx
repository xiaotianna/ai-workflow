import { Fragment, type ReactNode } from 'react'

interface PlainContentBlock {
  kind: 'plain'
  lines: string[]
}

interface ListContentBlock {
  kind: 'ordered' | 'unordered'
  items: string[]
  start?: number
}

type ContentBlock = ListContentBlock | PlainContentBlock

const unorderedListPattern = /^\s*[-+*]\s+(.+)$/,
  orderedListPattern = /^\s*(\d+)[.)]\s+(.+)$/,
  inlineCodePattern = /(`[^`\n]+`)/g

function parseContentBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = []

  content.split('\n').forEach((line) => {
    const unorderedMatch = unorderedListPattern.exec(line),
      orderedMatch = orderedListPattern.exec(line),
      kind = unorderedMatch ? 'unordered' : orderedMatch ? 'ordered' : undefined,
      item = unorderedMatch?.[1] ?? orderedMatch?.[2]

    if (kind && item) {
      const currentBlock = blocks.at(-1)
      if (currentBlock?.kind === kind) {
        currentBlock.items.push(item)
        return
      }

      blocks.push({
        kind,
        items: [item],
        ...(kind === 'ordered' ? { start: Number(orderedMatch?.[1] ?? 1) } : {}),
      })
      return
    }

    const currentBlock = blocks.at(-1)
    if (currentBlock?.kind === 'plain') {
      currentBlock.lines.push(line)
    } else {
      blocks.push({ kind: 'plain', lines: [line] })
    }
  })

  return blocks
}

function renderInlineCode(content: string, keyPrefix: string): ReactNode[] {
  if (content.includes('``')) return [content]

  return content.split(inlineCodePattern).map((part, index) => {
    const key = `${keyPrefix}-${index}`
    return part.startsWith('`') && part.endsWith('`') ? (
      <code key={key}>{part.slice(1, -1)}</code>
    ) : (
      <Fragment key={key}>{part}</Fragment>
    )
  })
}

interface KnowledgeChunkContentProps {
  children: string
}

export function KnowledgeChunkContent({ children }: KnowledgeChunkContentProps) {
  const blocks = parseContentBlocks(children)

  return (
    <div className="prose prose-sm prose-no-margin text-foreground mt-0.5 line-clamp-2 max-w-none min-w-0 text-sm leading-6 [&_li]:my-0 [&_ol]:my-0 [&_ul]:my-0">
      {blocks.map((block, blockIndex) => {
        if (block.kind === 'plain') {
          return (
            <div key={`plain-${blockIndex}`} className="whitespace-pre-wrap">
              {block.lines.map((line, lineIndex) => (
                <Fragment key={`${blockIndex}-${lineIndex}`}>
                  {renderInlineCode(line, `${blockIndex}-${lineIndex}`)}
                  {lineIndex < block.lines.length - 1 ? <br /> : null}
                </Fragment>
              ))}
            </div>
          )
        }

        const items = block.items.map((item, itemIndex) => (
          <li key={`${blockIndex}-${itemIndex}`}>
            {renderInlineCode(item, `${blockIndex}-${itemIndex}`)}
          </li>
        ))

        return block.kind === 'ordered' ? (
          <ol key={`ordered-${blockIndex}`} start={block.start}>
            {items}
          </ol>
        ) : (
          <ul key={`unordered-${blockIndex}`}>{items}</ul>
        )
      })}
    </div>
  )
}

import type { CodeNodeConfig } from '@ai-workflow/core'

import type { NodeContentProps } from '../../contracts/node-content'
import { JavaScriptSyntaxLine } from './javascript-syntax-line'

const CODE_PREVIEW_LINE_COUNT = 3

export function CodeNodeContent({ node }: NodeContentProps<CodeNodeConfig>) {
  const codeLines = node.config.code.split(/\r?\n/)
  const previewLines = codeLines.slice(0, CODE_PREVIEW_LINE_COUNT)
  const remainingLineCount = codeLines.length - previewLines.length

  return (
    <div className="space-y-2.5">
      <div className="border-border/60 bg-muted/60 overflow-hidden rounded-lg border-[0.5px]">
        <div className="border-border/60 text-muted-foreground flex items-center justify-between border-b-[0.5px] px-2.5 py-1.5 text-[10px] leading-3 font-medium">
          <span>JavaScript</span>
          <span>{codeLines.length} 行</span>
        </div>

        <div className="space-y-0.5 px-2.5 py-2 font-mono text-[11px] leading-4">
          {previewLines.map((line, index) => (
            <div key={index} className="flex min-w-0 gap-2">
              <span className="text-muted-foreground/60 w-3 shrink-0 text-right select-none">
                {index + 1}
              </span>
              <code
                className="text-foreground min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-pre"
                style={{ tabSize: 2 }}
              >
                <JavaScriptSyntaxLine line={line} />
              </code>
            </div>
          ))}

          {remainingLineCount > 0 ? (
            <div className="text-muted-foreground pl-5 text-[10px]">
              还有 {remainingLineCount} 行
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

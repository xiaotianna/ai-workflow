import type { MDXContent } from 'mdx/types'

import { getMDXComponents } from '@/components/mdx'

interface DocsArticleProps {
  Content: MDXContent
}

export function DocsArticle({ Content }: DocsArticleProps) {
  return (
    <article className="text-foreground mx-auto w-full max-w-3xl px-6 py-10 text-base leading-8 sm:px-10 sm:py-12 lg:py-14">
      <Content components={getMDXComponents()} />
    </article>
  )
}

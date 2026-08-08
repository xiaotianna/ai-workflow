import { cn } from '@ai-workflow/ui/lib/utils'
import type { MDXComponents } from 'mdx/types'
import type { ComponentPropsWithoutRef } from 'react'
import { Link } from 'react-router-dom'

function MdxHeading1({ className, ...props }: ComponentPropsWithoutRef<'h1'>) {
  return (
    <h1
      className={cn(
        'text-foreground mb-5 scroll-mt-20 text-4xl leading-12 font-semibold',
        className,
      )}
      {...props}
    />
  )
}

function MdxHeading2({ className, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2
      className={cn(
        'border-border text-foreground mt-11 mb-4 scroll-mt-20 border-b pb-2 text-2xl leading-9 font-semibold',
        className,
      )}
      {...props}
    />
  )
}

function MdxHeading3({ className, ...props }: ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3
      className={cn(
        'text-foreground mt-9 mb-3 scroll-mt-20 text-xl leading-8 font-semibold',
        className,
      )}
      {...props}
    />
  )
}

function MdxHeading4({ className, ...props }: ComponentPropsWithoutRef<'h4'>) {
  return (
    <h4
      className={cn(
        'text-foreground mt-7 mb-2 scroll-mt-20 text-lg leading-7 font-semibold',
        className,
      )}
      {...props}
    />
  )
}

function MdxHeading5({ className, ...props }: ComponentPropsWithoutRef<'h5'>) {
  return (
    <h5
      className={cn(
        'text-foreground mt-7 mb-2 scroll-mt-20 text-base leading-7 font-semibold',
        className,
      )}
      {...props}
    />
  )
}

function MdxHeading6({ className, ...props }: ComponentPropsWithoutRef<'h6'>) {
  return (
    <h6
      className={cn(
        'text-muted-foreground mt-7 mb-2 scroll-mt-20 text-sm leading-6 font-semibold',
        className,
      )}
      {...props}
    />
  )
}

function MdxParagraph({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('text-foreground my-5 text-base leading-8', className)} {...props} />
}

function MdxLink({ className, href, ...props }: ComponentPropsWithoutRef<'a'>) {
  const linkClassName = cn(
    'text-primary decoration-primary/30 hover:decoration-primary focus-visible:bg-accent focus-visible:text-accent-foreground cursor-pointer rounded-sm underline underline-offset-4 transition-colors focus-visible:outline-none',
    className,
  )

  if (href?.startsWith('/')) {
    return <Link to={href} className={linkClassName} {...props} />
  }

  return <a className={linkClassName} href={href} {...props} />
}

function MdxUnorderedList({ className, ...props }: ComponentPropsWithoutRef<'ul'>) {
  return (
    <ul
      className={cn(
        'text-foreground my-5 list-disc space-y-2 pl-6 text-base leading-8 [&>li>p]:my-0',
        className,
      )}
      {...props}
    />
  )
}

function MdxOrderedList({ className, ...props }: ComponentPropsWithoutRef<'ol'>) {
  return (
    <ol
      className={cn(
        'text-foreground my-5 list-decimal space-y-2 pl-6 text-base leading-8 [&>li>p]:my-0',
        className,
      )}
      {...props}
    />
  )
}

function MdxListItem({ className, ...props }: ComponentPropsWithoutRef<'li'>) {
  return <li className={cn('marker:text-muted-foreground pl-1', className)} {...props} />
}

function MdxBlockquote({ className, ...props }: ComponentPropsWithoutRef<'blockquote'>) {
  return (
    <blockquote
      className={cn(
        'border-primary/40 bg-primary/5 text-muted-foreground my-6 rounded-r-lg border-l-2 py-3.5 pr-5 pl-4 text-base leading-8 [&>p]:my-0',
        className,
      )}
      {...props}
    />
  )
}

function MdxCode({ className, ...props }: ComponentPropsWithoutRef<'code'>) {
  return (
    <code
      className={cn(
        'bg-input text-foreground rounded-md px-1.5 py-0.5 font-mono text-[0.875em]',
        className,
      )}
      {...props}
    />
  )
}

function MdxPre({ className, style, ...props }: ComponentPropsWithoutRef<'pre'>) {
  return (
    <div className="border-border/80 bg-input my-5 overflow-hidden rounded-xl border-[0.5px] shadow-xs">
      <pre
        className={cn(
          'text-foreground m-0 overflow-x-auto bg-transparent px-4 py-3.5 font-mono text-sm leading-6 [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit',
          className,
        )}
        style={{ ...style, backgroundColor: 'transparent' }}
        {...props}
      />
    </div>
  )
}

function MdxTable({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="border-border/80 my-5 overflow-x-auto rounded-xl border-[0.5px]">
      <table
        className={cn('w-full min-w-120 border-collapse text-left text-base', className)}
        {...props}
      />
    </div>
  )
}

function MdxTableRow({ className, ...props }: ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr
      className={cn(
        'border-border hover:bg-input border-b transition-colors last:border-b-0',
        className,
      )}
      {...props}
    />
  )
}

function MdxTableHead({ className, ...props }: ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      className={cn(
        'bg-input text-muted-foreground h-10 px-3 text-left align-middle text-sm font-medium whitespace-nowrap',
        className,
      )}
      {...props}
    />
  )
}

function MdxTableCell({ className, ...props }: ComponentPropsWithoutRef<'td'>) {
  return (
    <td
      className={cn('text-foreground h-10 px-3 py-2 align-middle text-sm leading-6', className)}
      {...props}
    />
  )
}

function MdxImage({ className, alt = '', ...props }: ComponentPropsWithoutRef<'img'>) {
  return (
    <img
      className={cn('border-border my-5 rounded-xl border-[0.5px] shadow-xs', className)}
      alt={alt}
      loading="lazy"
      {...props}
    />
  )
}

const projectMdxComponents = {
  h1: MdxHeading1,
  h2: MdxHeading2,
  h3: MdxHeading3,
  h4: MdxHeading4,
  h5: MdxHeading5,
  h6: MdxHeading6,
  p: MdxParagraph,
  a: MdxLink,
  ul: MdxUnorderedList,
  ol: MdxOrderedList,
  li: MdxListItem,
  blockquote: MdxBlockquote,
  code: MdxCode,
  pre: MdxPre,
  table: MdxTable,
  tr: MdxTableRow,
  th: MdxTableHead,
  td: MdxTableCell,
  img: MdxImage,
  strong: ({ className, ...props }: ComponentPropsWithoutRef<'strong'>) => (
    <strong className={cn('text-foreground font-semibold', className)} {...props} />
  ),
  hr: ({ className, ...props }: ComponentPropsWithoutRef<'hr'>) => (
    <hr className={cn('border-border my-8', className)} {...props} />
  ),
} satisfies MDXComponents

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...projectMdxComponents,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}

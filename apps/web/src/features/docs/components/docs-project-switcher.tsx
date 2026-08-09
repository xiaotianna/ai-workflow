import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ai-workflow/ui/components/dropdown-menu'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Check, ChevronDown } from 'lucide-react'
import { motion, MotionConfig } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { DOCS_PROJECTS, type DocsProject } from '../projects'

interface DocsProjectSwitcherProps {
  activeProject: DocsProject
}

function DocsProjectIcon({ project }: { project: DocsProject }) {
  return <img src={project.logoSrc} alt="" className="size-10 shrink-0 object-contain" />
}

export function DocsProjectSwitcher({ activeProject }: DocsProjectSwitcherProps) {
  const [open, setOpen] = useState(false)

  return (
    <MotionConfig reducedMotion="user">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`切换文档项目，当前为${activeProject.name}`}
            className="hover:bg-muted focus-visible:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-xl p-2 text-left outline-hidden transition-colors"
          >
            <DocsProjectIcon project={activeProject} />
            <span className="min-w-0 flex-1">
              <span className="text-foreground block truncate text-base leading-6 font-semibold">
                {activeProject.name}
              </span>
              <span className="text-muted-foreground block truncate text-sm leading-5">
                {activeProject.description}
              </span>
            </span>
            <motion.span
              aria-hidden
              className="text-muted-foreground mr-1 flex shrink-0"
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <ChevronDown className="size-4" />
            </motion.span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="flex w-(--radix-dropdown-menu-trigger-width) min-w-60 flex-col gap-0.5 p-1.5"
        >
          {DOCS_PROJECTS.map((project) => {
            const isActive = project.id === activeProject.id

            return (
              <DropdownMenuItem
                key={project.id}
                asChild
                className={cn('rounded-lg p-0', isActive && 'bg-accent/70')}
              >
                <Link
                  to={project.path}
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2.5 px-2 py-2"
                >
                  <DocsProjectIcon project={project} />
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate text-sm leading-5 font-medium">
                      {project.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs leading-5">
                      {project.description}
                    </span>
                  </span>
                  {isActive ? <Check aria-hidden className="text-primary size-4" /> : undefined}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </MotionConfig>
  )
}

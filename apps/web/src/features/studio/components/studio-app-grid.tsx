import { ResourceCard } from '@/components/resource-card'

import type { StudioAppListItem } from '../types'

interface StudioAppGridProps {
  apps: StudioAppListItem[]
}

export function StudioAppGrid({ apps }: StudioAppGridProps) {
  return (
    <div className="2k:grid-cols-6 relative grid grow grid-cols-1 content-start gap-2.5 pt-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {apps.map((app) => (
        <ResourceCard
          key={app.id}
          title={app.title}
          kind={app.kind}
          kindLabel={app.kindLabel}
          author={app.author}
          editedAtLabel={app.editedAtLabel}
          description={app.description}
          icon={app.icon}
        />
      ))}
    </div>
  )
}

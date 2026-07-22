import { ResourceCard } from '@/components/resource-card'

import type { StudioAppActionHandler, StudioAppListItem } from '../types'
import { getStudioAppActions } from './studio-app-actions'

interface StudioAppGridProps {
  apps: StudioAppListItem[]
  onAppAction?: StudioAppActionHandler
}

export function StudioAppGrid({ apps, onAppAction }: StudioAppGridProps) {
  return (
    <div className="2k:grid-cols-6 relative grid grow grid-cols-1 content-start gap-2.5 pt-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {apps.map((app) => {
        const actions = getStudioAppActions(app, onAppAction)

        return (
          <ResourceCard
            key={app.id}
            title={app.title}
            kind={app.kind}
            kindLabel={app.kindLabel}
            author={app.author}
            editedAtLabel={app.editedAtLabel}
            description={app.description}
            icon={app.icon}
            to={`/app/${encodeURIComponent(app.id)}/workflow`}
            linkAriaLabel={`打开应用 ${app.title}`}
            actions={actions}
          />
        )
      })}
    </div>
  )
}

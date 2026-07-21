import { CircleHelpIcon, GitBranchIcon, LucideIcon, PlayIcon } from 'lucide-react'

export const NODE_ICONS = {
  'git-branch': GitBranchIcon,
  play: PlayIcon,
  unknown: CircleHelpIcon,
} satisfies Record<string, LucideIcon>

export type NodeIconName = keyof typeof NODE_ICONS

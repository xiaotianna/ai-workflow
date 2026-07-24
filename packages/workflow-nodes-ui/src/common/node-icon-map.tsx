import { BuiltinNodeType } from '@ai-workflow/core'
import {
  BookSearch,
  BrainCircuit,
  CircleHelpIcon,
  CirclePlay,
  CircleStop,
  Globe,
  LucideIcon,
  Network,
  Repeat,
  Split,
} from 'lucide-react'

export const NODE_ICONS = {
  [BuiltinNodeType.START]: CirclePlay,
  [BuiltinNodeType.END]: CircleStop,
  [BuiltinNodeType.LLM]: BrainCircuit,
  [BuiltinNodeType.RAG]: BookSearch,
  [BuiltinNodeType.HTTP]: Globe,
  [BuiltinNodeType.LOOP]: Repeat,
  [BuiltinNodeType.CONDITION]: Split,
  [BuiltinNodeType.WORKFLOW]: Network,
  unknown: CircleHelpIcon,
} satisfies Record<string, LucideIcon>

export type NodeIconName = keyof typeof NODE_ICONS

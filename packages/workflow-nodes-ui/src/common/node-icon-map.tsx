import { BuiltinNodeType } from '@ai-workflow/core'
import {
  BookSearch,
  BrainCircuit,
  CircleHelpIcon,
  CirclePlay,
  CircleStop,
  CodeXml,
  Globe,
  Network,
  Repeat,
  Split,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const NODE_ICONS = {
  [BuiltinNodeType.START]: CirclePlay,
  [BuiltinNodeType.END]: CircleStop,
  [BuiltinNodeType.LLM]: BrainCircuit,
  [BuiltinNodeType.RAG]: BookSearch,
  [BuiltinNodeType.CODE]: CodeXml,
  [BuiltinNodeType.HTTP]: Globe,
  [BuiltinNodeType.LOOP]: Repeat,
  [BuiltinNodeType.CONDITION]: Split,
  [BuiltinNodeType.SUB_WORKFLOW]: Network,
  unknown: CircleHelpIcon,
} satisfies Record<string, LucideIcon>

export type NodeIconName = keyof typeof NODE_ICONS

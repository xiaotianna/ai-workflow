import type { NodeContentProps } from '../contracts/node-content'

export const DefaultNodeContent = ({ definition }: NodeContentProps) => {
  return (
    <div className="space-y-2 text-xs">
      <div className="text-slate-500">{definition.description ?? '该节点没有专属预览组件'}</div>
    </div>
  )
}

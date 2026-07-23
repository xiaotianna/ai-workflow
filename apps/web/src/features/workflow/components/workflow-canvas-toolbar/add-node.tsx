import { Button } from '@ai-workflow/ui/components/button'
import { Plus } from 'lucide-react'

export const AddNode = () => {
  return (
    <>
      <Button size={'sm'}>
        <Plus size={3} />
        添加节点
      </Button>
    </>
  )
}

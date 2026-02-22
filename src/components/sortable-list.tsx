'use client'

import { type ReactNode, useId } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortableListProps<T> {
  items: T[]
  getItemId: (item: T) => string
  renderItem: (item: T, dragHandleProps: DragHandleProps) => ReactNode
  onReorder: (items: T[]) => void
  /** Optional id to disambiguate nested DndContexts */
  id?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface DragHandleProps {
  attributes: any
  listeners: any
}

function SortableItem({
  id,
  children,
}: {
  id: string
  children: (dragHandleProps: DragHandleProps) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-50')}
    >
      {children({ attributes, listeners })}
    </div>
  )
}

export function SortableList<T>({
  items,
  getItemId,
  renderItem,
  onReorder,
  id: externalId,
}: SortableListProps<T>) {
  const autoId = useId()
  const contextId = externalId ?? autoId
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(
        (item) => getItemId(item) === active.id
      )
      const newIndex = items.findIndex(
        (item) => getItemId(item) === over.id
      )
      const reordered = arrayMove(items, oldIndex, newIndex)
      onReorder(reordered)
    }
  }

  return (
    <DndContext
      id={contextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(getItemId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid gap-2">
          {items.map((item) => (
            <SortableItem key={getItemId(item)} id={getItemId(item)}>
              {(dragHandleProps) => renderItem(item, dragHandleProps)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

/**
 * A drag handle button to be placed inside renderItem.
 * Pass the dragHandleProps from the render callback.
 */
export function DragHandle({
  attributes,
  listeners,
}: DragHandleProps) {
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none p-2 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )
}

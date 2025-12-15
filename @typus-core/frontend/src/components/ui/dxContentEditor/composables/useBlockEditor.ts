import { ref, computed, type Ref } from 'vue'
import type { Block, LayoutConfig } from '../types/block'

export function useBlockEditor(initialBlocks: Block[] = []) {
  const blocks: Ref<Block[]> = ref([...initialBlocks])

  const blockCount = computed(() => blocks.value.length)

  const addBlock = (block: Block): void => {
    blocks.value.push(block)
  }

  const updateBlock = (id: string, patch: Partial<Omit<Block, 'id'>>): void => {
    const existing = blocks.value.find((b) => b.id === id)
    if (!existing) return
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    ) as Partial<Omit<Block, 'id'>>
    const next: Block = { ...(existing as Block), ...(cleaned as any), id }
    blocks.value = blocks.value.map((b) => (b.id === id ? next : b))
  }

  const updateLayout = (id: string, layout: Partial<LayoutConfig>): void => {
    const existing = blocks.value.find((b) => b.id === id)
    if (!existing) return
    const next: Block = {
      ...existing,
      id,
      layout: { ...existing.layout, ...layout },
    }
    blocks.value = blocks.value.map((b) => (b.id === id ? next : b))
  }

  const deleteBlock = (id: string): void => {
    blocks.value = blocks.value.filter((b) => b.id !== id)
  }

  return { blocks, blockCount, addBlock, updateBlock, updateLayout, deleteBlock }
}


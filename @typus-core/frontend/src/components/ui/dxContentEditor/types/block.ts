export type BlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'text-image'
  | 'list'
  | 'table'
  | 'quote'
  | 'code'

export type AlignMode = 'left' | 'center' | 'right'

export interface LayoutConfig {
  width: 25 | 33 | 50 | 66 | 75 | 100
  alignRow: AlignMode
  contentAlign?: 'left' | 'center' | 'right' | 'justify'
  height?: number
  aspectRatio?: 'free' | '16:9' | '4:3' | '1:1'
  fontSize?: number
}

export interface Block {
  id: string
  type: BlockType
  content: string
  layout: LayoutConfig
}

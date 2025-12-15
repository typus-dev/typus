export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ResponsiveValue<T> = Partial<Record<Breakpoint, T>>
export type Direction = 'row' | 'column'
export type Alignment = 'start' | 'center' | 'end' | 'stretch'
export type Justify = 'start' | 'center' | 'end' | 'between' | 'around'
export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
export type ResponsiveCol = {
  xs?: ColSpan
  sm?: ColSpan
  md?: ColSpan
  lg?: ColSpan
  xl?: ColSpan
}
type LayoutContext = 'grid' | 'flex' | 'row'
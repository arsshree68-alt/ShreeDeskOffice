declare module 'papaparse' {
  export interface ParseResult<T> {
    data: T[]
    errors: any[]
    meta: any
  }

  export interface ParseConfig<T> {
    delimiter?: string
    newline?: string
    quoteChar?: string
    escapeChar?: string
    header?: boolean
    dynamicTyping?: boolean | ((field: string) => boolean)
    preview?: number
    fastMode?: boolean
    skipEmptyLines?: boolean | 'greedy'
    comments?: boolean | string
    download?: boolean
    worker?: boolean
    complete?: (results: ParseResult<T>) => void
    error?: (error: any) => void
    step?: (results: ParseResult<T>, parser: any) => void
  }

  export function parse<T>(input: File | string, config?: ParseConfig<T>): void
  const Papa: {
    parse: typeof parse
  }

  export default Papa
}

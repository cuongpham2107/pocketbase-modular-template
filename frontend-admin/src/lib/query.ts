/**
 * Chuẩn hoá query string theo `pkg/query` của backend:
 *   page, per_page, sort, order, q, filter[<tên>]=<giá trị>
 *
 * Không dùng `limit`/`search` ad-hoc nữa — backend chỉ đọc các khoá này.
 */
export interface QueryParams {
  page?: number
  perPage?: number
  sort?: string
  order?: 'asc' | 'desc'
  q?: string
  filters?: Record<string, string | number | boolean | null | undefined>
}

const CONTROL_KEYS = new Set(['page', 'per_page', 'sort', 'order', 'q'])

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  return false
}
/** Bỏ các tham số rỗng để backend dùng tiếp giá trị mặc định của nó. */
export function buildQuery(params: QueryParams = {}): string {
  const search = new URLSearchParams()

  if (!isBlank(params.page) && Number(params.page) > 0) {
    search.set('page', String(Math.trunc(Number(params.page))))
  }
  if (!isBlank(params.perPage) && Number(params.perPage) > 0) {
    search.set('per_page', String(Math.trunc(Number(params.perPage))))
  }
  if (!isBlank(params.sort)) {
    search.set('sort', String(params.sort).trim())
  }
  if (params.order === 'asc' || params.order === 'desc') {
    search.set('order', params.order)
  }
  if (!isBlank(params.q)) {
    search.set('q', String(params.q).trim())
  }

  for (const [key, value] of Object.entries(params.filters ?? {})) {
    if (CONTROL_KEYS.has(key) || isBlank(value)) continue
    search.set(`filter[${key}]`, String(value))
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

/** Ghép query vào path có sẵn (giữ nguyên query cũ nếu có). */
export function withQuery(path: string, params: QueryParams = {}): string {
  const query = buildQuery(params)
  if (!query) return path
  return path.includes('?') ? `${path}&${query.slice(1)}` : `${path}${query}`
}

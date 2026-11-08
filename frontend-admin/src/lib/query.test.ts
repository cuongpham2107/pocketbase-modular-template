import { describe, expect, it } from 'vitest'

import { buildQuery, withQuery } from '@/lib/query'

describe('buildQuery', () => {
  it('trả chuỗi rỗng khi không có tham số', () => {
    expect(buildQuery()).toBe('')
    expect(buildQuery({})).toBe('')
  })

  it('map đúng tên khoá của backend (per_page, filter[...])', () => {
    const query = buildQuery({
      page: 2,
      perPage: 50,
      sort: 'created_at',
      order: 'asc',
      q: 'admin',
      filters: { status: 'success', resource_id: 7 },
    })
    expect(query).toBe(
      '?page=2&per_page=50&sort=created_at&order=asc&q=admin&filter%5Bstatus%5D=success&filter%5Bresource_id%5D=7',
    )
  })

  it('bỏ giá trị rỗng để backend dùng mặc định', () => {
    expect(buildQuery({ page: 0, perPage: Number.NaN, q: '   ', sort: '' })).toBe('')
  })

  it('bỏ filter rỗng và filter trùng khoá điều khiển', () => {
    const query = buildQuery({
      filters: { status: '', type: null, page: '9', unread: false },
    })
    // `page` là khoá điều khiển → không được đẩy vào filter[].
    expect(query).toBe('?filter%5Bunread%5D=false')
  })

  it('chỉ nhận order asc|desc', () => {
    expect(buildQuery({ order: 'desc' })).toBe('?order=desc')
    // @ts-expect-error — giá trị sai kiểu từ URL do người dùng nhập
    expect(buildQuery({ order: 'random' })).toBe('')
  })

  it('cắt phần thập phân của page/per_page', () => {
    expect(buildQuery({ page: 2.9, perPage: 33.7 })).toBe('?page=2&per_page=33')
  })
})

describe('withQuery', () => {
  it('ghép query vào path không có sẵn query', () => {
    expect(withQuery('/api/v1/audit-logs', { page: 2 })).toBe('/api/v1/audit-logs?page=2')
  })

  it('giữ nguyên query cũ', () => {
    expect(withQuery('/api/v1/audit-logs?x=1', { page: 2 })).toBe('/api/v1/audit-logs?x=1&page=2')
  })

  it('trả path gốc khi không có tham số', () => {
    expect(withQuery('/api/v1/users')).toBe('/api/v1/users')
  })
})

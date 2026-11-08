import { describe, expect, it } from 'vitest'

import { matchesPermissions } from '@/lib/permissions'

describe('matchesPermissions', () => {
  const granted = new Set(['roles:view', 'users:view', 'audit:view'])

  it('không truyền mã nào = chỉ cần đăng nhập', () => {
    expect(matchesPermissions(granted, [])).toBe(true)
    expect(matchesPermissions(new Set(), [])).toBe(true)
  })

  it('một mã: đúng khi được cấp', () => {
    expect(matchesPermissions(granted, ['users:view'])).toBe(true)
    expect(matchesPermissions(granted, ['media:view'])).toBe(false)
  })

  it('nhiều mã: cần TẤT CẢ', () => {
    expect(matchesPermissions(granted, ['roles:view', 'users:view'])).toBe(true)
    expect(matchesPermissions(granted, ['roles:view', 'media:view'])).toBe(false)
  })

  it('admin nhận đủ catalog từ backend nên mọi mã đều đúng', () => {
    const admin = new Set(['roles:view', 'roles:create', 'audit:export', 'notifications:send'])
    expect(matchesPermissions(admin, ['roles:create', 'audit:export'])).toBe(true)
  })

  it('phân biệt hoa thường (mã quyền là chính xác)', () => {
    expect(matchesPermissions(granted, ['Users:view'])).toBe(false)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearSession,
  getAccessToken,
  getCurrentUser,
  isGuest,
  notifyUnauthorized,
  refreshAccessToken,
  setAccessToken,
  setCurrentUser,
  setGuest,
} from '@/lib/session'
import type { User } from '@/types'

const demoUser: User = { id: 1, email: 'demo@example.com', full_name: 'Demo' }

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 401,
    json: async () => body,
  } as unknown as Response
}

describe('session state', () => {
  beforeEach(() => {
    clearSession()
    setGuest(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('giữ access token và user trong memory', () => {
    setAccessToken('jwt-1')
    setCurrentUser(demoUser)

    expect(getAccessToken()).toBe('jwt-1')
    expect(getCurrentUser()).toEqual(demoUser)
  })

  it('clearSession xoá cả token lẫn user', () => {
    setAccessToken('jwt-1')
    setCurrentUser(demoUser)

    clearSession()

    expect(getAccessToken()).toBeNull()
    expect(getCurrentUser()).toBeNull()
  })

  it('không ghi access token vào localStorage/sessionStorage', () => {
    setAccessToken('jwt-1')

    expect(localStorage.getItem('token')).toBeNull()
    expect(JSON.stringify(sessionStorage)).not.toContain('jwt-1')
  })

  it('lưu cờ guest trong sessionStorage', () => {
    expect(isGuest()).toBe(false)
    setGuest(true)
    expect(isGuest()).toBe(true)
    setGuest(false)
    expect(isGuest()).toBe(false)
  })

  it('notifyUnauthorized xoá phiên và phát sự kiện', () => {
    setAccessToken('jwt-1')
    const listener = vi.fn()
    window.addEventListener('auth:unauthorized', listener)

    notifyUnauthorized()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()
    window.removeEventListener('auth:unauthorized', listener)
  })
})

describe('refreshAccessToken', () => {
  beforeEach(() => {
    clearSession()
    // Backend đặt cookie gợi ý này cùng refresh cookie khi đăng nhập.
    document.cookie = 'has_session=1; path=/'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'has_session=; path=/; max-age=0'
  })

  it('không gọi mạng khi chưa từng đăng nhập (không có cookie has_session)', async () => {
    document.cookie = 'has_session=; path=/; max-age=0'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(refreshAccessToken()).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gửi cookie (credentials: include) và lưu access token mới', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { access_token: 'jwt-new' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(refreshAccessToken()).resolves.toBe('jwt-new')
    expect(getAccessToken()).toBe('jwt-new')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/auth/refresh')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
  })

  it('single-flight: nhiều lời gọi đồng thời chỉ tạo một request', async () => {
    let release: ((value: Response) => void) | undefined
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        release = resolve
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const first = refreshAccessToken()
    const second = refreshAccessToken()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    release?.(jsonResponse({ data: { access_token: 'jwt-shared' } }))

    await expect(first).resolves.toBe('jwt-shared')
    await expect(second).resolves.toBe('jwt-shared')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('trả null khi refresh thất bại', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: {} }, false)))

    await expect(refreshAccessToken()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()
  })

  it('trả null khi mạng lỗi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(refreshAccessToken()).resolves.toBeNull()
  })
})

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api"
import type { User } from "@/types"

import { ThemeProvider } from "./ThemeCustomizerContext"
import { DEFAULT_THEME_SETTINGS } from "./theme-config"
import { useThemeCustomizer } from "./theme-context"

function makeUser(id: string, themeSettings?: string): User {
  return {
    id,
    email: `${id}@example.com`,
    full_name: id,
    name: id,
    role: "user",
    roles: ["user"],
    permissions: [],
    theme_settings: themeSettings,
    created_at: "2026-01-01T00:00:00Z",
  }
}

function Probe() {
  const { settings, isAuthenticated, hasUserOverride, syncStatus, updateSetting, resetToDefault } =
    useThemeCustomizer()
  return (
    <div>
      <span data-testid="mode">{settings.mode}</span>
      <span data-testid="palette">{settings.palette}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="override">{String(hasUserOverride)}</span>
      <span data-testid="sync">{syncStatus}</span>
      <button data-testid="set-teal" type="button" onClick={() => updateSetting("palette", "teal")}>
        set-teal
      </button>
      <button data-testid="reset" type="button" onClick={() => resetToDefault()}>
        reset
      </button>
    </div>
  )
}

describe("ThemeProvider system + per-account layering", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear()
    vi.restoreAllMocks()
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.useRealTimers()
  })

  const text = (id: string) =>
    container.querySelector(`[data-testid="${id}"]`)?.textContent

  it("uses system default for users without custom settings and keeps user overrides isolated", () => {
    const updateSpy = vi.spyOn(api, "updateThemeSettings").mockResolvedValue(makeUser("u1"))
    vi.spyOn(api, "getToken").mockReturnValue("tok")

    act(() => {
      root.render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      )
    })

    // Global system theme loads (dark + rose)
    act(() => {
      window.dispatchEvent(
        new CustomEvent("theme:system-sync", {
          detail: JSON.stringify({ mode: "dark", palette: "rose" }),
        }),
      )
    })

    expect(text("mode")).toBe("dark")
    expect(text("palette")).toBe("rose")
    expect(updateSpy).not.toHaveBeenCalled()

    // User 1 (no custom settings) logs in -> inherits system default (dark + rose)
    act(() => {
      window.dispatchEvent(new CustomEvent("theme:user-sync", { detail: makeUser("u1") }))
    })
    expect(text("auth")).toBe("true")
    expect(text("override")).toBe("false")
    expect(text("mode")).toBe("dark")
    expect(text("palette")).toBe("rose")

    // User 2 (has personal override: light + violet) logs in -> sees their own setting
    act(() => {
      window.dispatchEvent(
        new CustomEvent("theme:user-sync", {
          detail: makeUser("u2", JSON.stringify({ mode: "light", palette: "violet" })),
        }),
      )
    })
    expect(text("override")).toBe("true")
    expect(text("mode")).toBe("light")
    expect(text("palette")).toBe("violet")

    // System theme changes while User 2 is logged in -> User 2 keeps personal override
    act(() => {
      window.dispatchEvent(
        new CustomEvent("theme:system-sync", {
          detail: JSON.stringify({ mode: "dark", palette: "amber" }),
        }),
      )
    })
    expect(text("mode")).toBe("light")
    expect(text("palette")).toBe("violet")

    // User 2 logs out -> reverts to updated system default (dark + amber)
    act(() => {
      window.dispatchEvent(new CustomEvent("theme:user-logout"))
    })
    expect(text("auth")).toBe("false")
    expect(text("mode")).toBe("dark")
    expect(text("palette")).toBe("amber")
  })

  it("edits user's own theme without touching system and resets back to system default", async () => {
    vi.useFakeTimers()
    const updated = makeUser("u1", JSON.stringify({ ...DEFAULT_THEME_SETTINGS, palette: "teal" }))
    const updateSpy = vi.spyOn(api, "updateThemeSettings").mockResolvedValue(updated)
    vi.spyOn(api, "getToken").mockReturnValue("tok")

    act(() => {
      root.render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      )
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent("theme:system-sync", {
          detail: JSON.stringify({ mode: "dark", palette: "blue" }),
        }),
      )
      window.dispatchEvent(new CustomEvent("theme:user-sync", { detail: makeUser("u1") }))
    })

    // User edits palette -> starts from system theme (dark) + new palette (teal)
    act(() => {
      ;(container.querySelector('[data-testid="set-teal"]') as HTMLButtonElement).click()
    })

    expect(text("override")).toBe("true")
    expect(text("mode")).toBe("dark")
    expect(text("palette")).toBe("teal")

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(updateSpy).toHaveBeenCalledTimes(1)
    const savedPayload = JSON.parse(updateSpy.mock.calls[0][0]) as { mode: string; palette: string }
    expect(savedPayload.mode).toBe("dark")
    expect(savedPayload.palette).toBe("teal")
    expect(text("sync")).toBe("saved")

    // Resetting clears user's override back to system default ("")
    act(() => {
      ;(container.querySelector('[data-testid="reset"]') as HTMLButtonElement).click()
    })
    expect(text("override")).toBe("false")
    expect(text("mode")).toBe("dark")
    expect(text("palette")).toBe("blue")

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(updateSpy).toHaveBeenCalledTimes(2)
    expect(updateSpy.mock.calls[1][0]).toBe("")
  })
})

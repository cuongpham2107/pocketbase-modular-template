import { describe, expect, it } from "vitest"

import { isModuleEnabled } from "@/lib/modules"

describe("isModuleEnabled", () => {
  it("ẩn module khi danh sách đang tải", () => {
    expect(isModuleEnabled(null, "audit")).toBe(false)
  })

  it("chỉ hiện module có trong danh sách backend trả về", () => {
    const enabled = new Set(["audit", "media"])
    expect(isModuleEnabled(enabled, "audit")).toBe(true)
    expect(isModuleEnabled(enabled, "notifications")).toBe(false)
  })

  it("hiện mọi module khi không đọc được danh sách (backend vẫn tự chặn)", () => {
    expect(isModuleEnabled("all", "mcp")).toBe(true)
  })
})

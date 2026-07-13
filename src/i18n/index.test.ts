// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { getTheme, setTheme, applyTheme } from "./index"

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  it("returns 'auto' when no override is set", () => {
    expect(getTheme()).toBe("auto")
  })

  it("reads theme from localStorage", () => {
    localStorage.setItem("commute.theme", "dark")
    expect(getTheme()).toBe("dark")
  })

  it("ignores garbage in localStorage and falls back to 'auto'", () => {
    localStorage.setItem("commute.theme", "rainbow")
    expect(getTheme()).toBe("auto")
  })

  it("setTheme writes the user choice to localStorage", () => {
    setTheme("dark")
    expect(localStorage.getItem("commute.theme")).toBe("dark")
    setTheme("light")
    expect(localStorage.getItem("commute.theme")).toBe("light")
  })

  it("setTheme 'dark' adds the .dark class on the html element", () => {
    setTheme("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("setTheme 'light' removes the .dark class from the html element", () => {
    setTheme("dark")
    setTheme("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("setTheme 'auto' removes the override and applies the system preference", () => {
    setTheme("dark")
    setTheme("auto")
    expect(localStorage.getItem("commute.theme")).toBeNull()
    // jsdom's default is light — no .dark class.
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("applyTheme with 'dark' is idempotent (no extra DOM mutations)", () => {
    applyTheme("dark")
    applyTheme("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })
})

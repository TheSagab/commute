// Polyfills for jsdom. Newer jsdom versions don't install
// `localStorage` or `matchMedia` on the window even with a URL set;
// the real browsers always have them. These polyfills kick in only
// if the platform doesn't provide them.

if (typeof window !== "undefined" && typeof window.localStorage === "undefined") {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size },
  }
  Object.defineProperty(window, "localStorage", { value: localStorage, configurable: true })
}

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated
      removeListener: () => {}, // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    configurable: true,
  })
}

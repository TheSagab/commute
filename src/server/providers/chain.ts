/**
 * Provider chain.
 *
 * The chain resolves the active provider per mode and routes queries to
 * it. The static-JSON provider is the default; live providers (GTFS,
 * third-party) can be added later and will take precedence per mode
 * when active. See `docs/adr/0001-pluggable-provider-chain.md`.
 *
 * For "for now" only the static-JSON provider is wired up — the chain
 * is a single-element list. The interface is what matters: callers ask
 * the chain for data, not the provider directly.
 */

import { createStaticJsonProvider } from "./static-json"
import type { Provider, StopWithArrivals } from "./types"
import type { ModeId } from "../../data/types"

export type Chain = {
  providers: Provider[]
  /** True if at least one provider is active for the given mode. */
  isModeActive: (mode: ModeId) => Promise<boolean>
  /** Resolve the active provider for a mode. Throws if none are active. */
  resolve: (mode: ModeId) => Promise<Provider>
  listStops: Provider["listStops"]
  getUpcoming: (mode: ModeId, stopId: string, now: Date) => Promise<StopWithArrivals>
}

export function createChain(providers: Provider[]): Chain {
  // For "for now" we trust the order: first provider wins per mode.
  // Future: when adding live providers, give them higher precedence.
  async function resolve(mode: ModeId): Promise<Provider> {
    for (const p of providers) {
      if (!p.modes.includes(mode)) continue
      if (await p.isActive()) return p
    }
    throw new Error(`No active provider for mode: ${mode}`)
  }

  return {
    providers,
    async isModeActive(mode) {
      try {
        await resolve(mode)
        return true
      } catch {
        return false
      }
    },
    resolve,
    async listStops() {
      // Aggregate stops from every active provider. For "for now" this
      // is just the static-JSON provider, but the chain-level call
      // means future providers are picked up automatically.
      const seen = new Set<string>()
      const all: { stop: import("../../data/types").Stop; mode: ModeId }[] = []
      for (const p of providers) {
        if (!(await p.isActive())) continue
        for (const entry of await p.listStops()) {
          const key = `${entry.mode}::${entry.stop.id}`
          if (seen.has(key)) continue
          seen.add(key)
          all.push(entry)
        }
      }
      return all
    },
    async getUpcoming(mode, stopId, now) {
      const provider = await resolve(mode)
      return provider.getUpcoming(mode, stopId, now)
    },
  }
}

export const defaultChain: Chain = createChain([createStaticJsonProvider()])

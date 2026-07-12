/**
 * Server function: text search for a place (Nominatim fallback).
 *
 * Used when the user denies the geolocation prompt. Returns the
 * top Nominatim hit's lat/lon + display name. The client passes
 * those coordinates into `getNearbyStops`.
 *
 * Nominatim's free usage policy requires a descriptive User-Agent
 * and a strict 1 req/s rate. We don't enforce the rate here — the
 * client is a single-user hobby app, so the limit is not a concern.
 */

import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"

const inputSchema = z.object({
  query: z.string().min(1).max(200),
})

export type PlaceResult = {
  lat: number
  lon: number
  displayName: string
}

export const searchPlace = createServerFn({ method: "GET" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<PlaceResult | null> => {
    const params = new URLSearchParams({
      q: data.query,
      format: "json",
      limit: "1",
      "accept-language": "en",
    })
    const url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "commute (https://github.com/example/commute)",
        Accept: "application/json",
      },
    })
    if (!res.ok) return null
    const body = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
    const hit = body[0]
    if (!hit) return null
    return {
      lat: Number(hit.lat),
      lon: Number(hit.lon),
      displayName: hit.display_name,
    }
  })

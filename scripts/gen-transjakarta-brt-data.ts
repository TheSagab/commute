/**
 * Hand-curated Transjakarta BRT data.
 *
 * All 14 main BRT corridors, each with a stop sequence (approximate
 * lat/lon based on general Jakarta geography — the CI scraper will
 * refine to authoritative coordinates). One corridor (Corridor 9,
 * Pinang Ranti ↔ Pluit) is marked as 24-hour to validate the
 * per-route service-hours override; the rest use the mode-level
 * default of 05:00–22:00.
 *
 * Run with `pnpm tsx scripts/gen-transjakarta-brt-data.ts`.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

type StopSpec = {
  id: string
  nameEn: string
  nameId: string
  code: string
  lat: number
  lon: number
}

type CorridorSpec = {
  id: string
  nameEn: string
  nameId: string
  headsignAEn: string
  headsignAId: string
  headsignBEn: string
  headsignBId: string
  /** BRT brand red — uniform across corridors for now. The CI scraper
   *  can introduce per-corridor colors when the official palette
   *  stabilises. */
  color: string
  /** When true, the route runs 24 hours. Overrides the mode-level
   *  service hours for both directions of this corridor. */
  isAlwaysOpen?: boolean
  stops: StopSpec[]
}

const MODE_START = "05:00"
const MODE_END = "22:00"
const HEADWAY_MIN = 8
const TRIP_TRAVEL_MIN = 3
const TRIP_DWELL_MIN = 1

const CORRIDORS: CorridorSpec[] = [
  {
    id: "corridor-1",
    nameEn: "Corridor 1 (Blok M ↔ Kota)",
    nameId: "Koridor 1 (Blok M ↔ Kota)",
    headsignAEn: "Kota",
    headsignAId: "Kota",
    headsignBEn: "Blok M",
    headsignBId: "Blok M",
    color: "#E53935",
    stops: [
      { id: "c1-blm", nameEn: "Blok M",                nameId: "Blok M",                code: "C1-BLM", lat: -6.3037, lon: 106.8200 },
      { id: "c1-mpr", nameEn: "Mampang Prapatan",      nameId: "Mampang Prapatan",      code: "C1-MPR", lat: -6.2920, lon: 106.8260 },
      { id: "c1-krd", nameEn: "Karet",                 nameId: "Karet",                 code: "C1-KRD", lat: -6.2810, lon: 106.8310 },
      { id: "c1-sdb", nameEn: "Sudirman",              nameId: "Sudirman",              code: "C1-SDB", lat: -6.2088, lon: 106.8226 },
      { id: "c1-bnd", nameEn: "Bendungan Hilir",       nameId: "Bendungan Hilir",       code: "C1-BND", lat: -6.3155, lon: 106.8480 },
      { id: "c1-ist", nameEn: "Istora",                nameId: "Istora",                code: "C1-IST", lat: -6.3125, lon: 106.8410 },
      { id: "c1-sny", nameEn: "Senayan",               nameId: "Senayan",               code: "C1-SNY", lat: -6.3095, lon: 106.8340 },
      { id: "c1-asn", nameEn: "ASEAN",                 nameId: "ASEAN",                 code: "C1-ASN", lat: -6.3065, lon: 106.8270 },
      { id: "c1-ptj", nameEn: "Petojo",                nameId: "Petojo",                code: "C1-PTJ", lat: -6.1660, lon: 106.8105 },
      { id: "c1-hrm", nameEn: "Harmoni",               nameId: "Harmoni",               code: "C1-HRM", lat: -6.1780, lon: 106.8230 },
      { id: "c1-kta", nameEn: "Kota",                  nameId: "Kota",                  code: "C1-KTA", lat: -6.1372, lon: 106.8147 },
    ],
  },
  {
    id: "corridor-2",
    nameEn: "Corridor 2 (Pulo Gadung ↔ Harmoni)",
    nameId: "Koridor 2 (Pulo Gadung ↔ Harmoni)",
    headsignAEn: "Harmoni",
    headsignAId: "Harmoni",
    headsignBEn: "Pulo Gadung",
    headsignBId: "Pulo Gadung",
    color: "#E53935",
    stops: [
      { id: "c2-plg", nameEn: "Pulo Gadung",           nameId: "Pulo Gadung",           code: "C2-PLG", lat: -6.1870, lon: 106.9110 },
      { id: "c2-ppg", nameEn: "Pasar Pulo Gadung",     nameId: "Pasar Pulo Gadung",     code: "C2-PPG", lat: -6.1885, lon: 106.9050 },
      { id: "c2-pmd", nameEn: "Pemuda",                nameId: "Pemuda",                code: "C2-PMD", lat: -6.1880, lon: 106.8910 },
      { id: "c2-prk", nameEn: "Pramuka",               nameId: "Pramuka",               code: "C2-PRK", lat: -6.1930, lon: 106.8740 },
      { id: "c2-mtr", nameEn: "Matraman",              nameId: "Matraman",              code: "C2-MTR", lat: -6.1950, lon: 106.8620 },
      { id: "c2-slb", nameEn: "Salemba",               nameId: "Salemba",               code: "C2-SLB", lat: -6.1940, lon: 106.8550 },
      { id: "c2-krt", nameEn: "Kramat",                nameId: "Kramat",                code: "C2-KRT", lat: -6.1840, lon: 106.8430 },
      { id: "c2-snn", nameEn: "Senen",                 nameId: "Senen",                 code: "C2-SNN", lat: -6.1760, lon: 106.8380 },
      { id: "c2-gmb", nameEn: "Gambir",                nameId: "Gambir",                code: "C2-GMB", lat: -6.1770, lon: 106.8310 },
      { id: "c2-hrm", nameEn: "Harmoni",               nameId: "Harmoni",               code: "C2-HRM", lat: -6.1780, lon: 106.8230 },
    ],
  },
  {
    id: "corridor-3",
    nameEn: "Corridor 3 (Kalideres ↔ Pasar Baru)",
    nameId: "Koridor 3 (Kalideres ↔ Pasar Baru)",
    headsignAEn: "Pasar Baru",
    headsignAId: "Pasar Baru",
    headsignBEn: "Kalideres",
    headsignBId: "Kalideres",
    color: "#E53935",
    stops: [
      { id: "c3-kld", nameEn: "Kalideres",             nameId: "Kalideres",             code: "C3-KLD", lat: -6.1540, lon: 106.6650 },
      { id: "c3-psg", nameEn: "Pesing",                nameId: "Pesing",                code: "C3-PSG", lat: -6.1660, lon: 106.6850 },
      { id: "c3-grg", nameEn: "Grogol",                nameId: "Grogol",                code: "C3-GRG", lat: -6.1660, lon: 106.7040 },
      { id: "c3-rxy", nameEn: "Roxy",                  nameId: "Roxy",                  code: "C3-RXY", lat: -6.1670, lon: 106.7320 },
      { id: "c3-ptj", nameEn: "Petojo",                nameId: "Petojo",                code: "C3-PTJ", lat: -6.1660, lon: 106.8105 },
      { id: "c3-cdg", nameEn: "Cideng",                nameId: "Cideng",                code: "C3-CDG", lat: -6.1660, lon: 106.8000 },
      { id: "c3-kwt", nameEn: "Kwitang",               nameId: "Kwitang",               code: "C3-KWT", lat: -6.1700, lon: 106.8310 },
      { id: "c3-psb", nameEn: "Pasar Baru",            nameId: "Pasar Baru",            code: "C3-PSB", lat: -6.1660, lon: 106.8400 },
    ],
  },
  {
    id: "corridor-4",
    nameEn: "Corridor 4 (Pulo Gadung ↔ Dukuh Atas)",
    nameId: "Koridor 4 (Pulo Gadung ↔ Dukuh Atas)",
    headsignAEn: "Dukuh Atas",
    headsignAId: "Dukuh Atas",
    headsignBEn: "Pulo Gadung",
    headsignBId: "Pulo Gadung",
    color: "#E53935",
    stops: [
      { id: "c4-plg", nameEn: "Pulo Gadung",           nameId: "Pulo Gadung",           code: "C4-PLG", lat: -6.1870, lon: 106.9110 },
      { id: "c4-snt", nameEn: "Sunter",                nameId: "Sunter",                code: "C4-SNT", lat: -6.1530, lon: 106.8900 },
      { id: "c4-kpg", nameEn: "Kelapa Gading",         nameId: "Kelapa Gading",         code: "C4-KPG", lat: -6.1620, lon: 106.9020 },
      { id: "c4-prm", nameEn: "Podomoro",              nameId: "Podomoro",              code: "C4-PRM", lat: -6.1810, lon: 106.8850 },
      { id: "c4-psk", nameEn: "Pegangsaan",            nameId: "Pegangsaan",            code: "C4-PSK", lat: -6.1900, lon: 106.8810 },
      { id: "c4-psu", nameEn: "Pulo Mas",              nameId: "Pulo Mas",              code: "C4-PSU", lat: -6.1900, lon: 106.8740 },
      { id: "c4-cpr", nameEn: "Cempaka Putih",         nameId: "Cempaka Putih",         code: "C4-CPR", lat: -6.1840, lon: 106.8660 },
      { id: "c4-rsd", nameEn: "Rawasari",              nameId: "Rawasari",              code: "C4-RSD", lat: -6.1850, lon: 106.8610 },
      { id: "c4-prk", nameEn: "Pramuka",               nameId: "Pramuka",               code: "C4-PRK", lat: -6.1930, lon: 106.8740 },
      { id: "c4-mtr", nameEn: "Matraman",              nameId: "Matraman",              code: "C4-MTR", lat: -6.1950, lon: 106.8620 },
      { id: "c4-duc", nameEn: "Dukuh Atas",            nameId: "Dukuh Atas",            code: "C4-DUC", lat: -6.2210, lon: 106.8620 },
    ],
  },
  {
    id: "corridor-5",
    nameEn: "Corridor 5 (Ancol ↔ Kampung Melayu)",
    nameId: "Koridor 5 (Ancol ↔ Kampung Melayu)",
    headsignAEn: "Kampung Melayu",
    headsignAId: "Kampung Melayu",
    headsignBEn: "Ancol",
    headsignBId: "Ancol",
    color: "#E53935",
    stops: [
      { id: "c5-anl", nameEn: "Ancol",                 nameId: "Ancol",                 code: "C5-ANL", lat: -6.1240, lon: 106.8330 },
      { id: "c5-psu", nameEn: "Pulo Mas",              nameId: "Pulo Mas",              code: "C5-PSU", lat: -6.1900, lon: 106.8740 },
      { id: "c5-prk", nameEn: "Pramuka",               nameId: "Pramuka",               code: "C5-PRK", lat: -6.1930, lon: 106.8740 },
      { id: "c5-kmb", nameEn: "Kampung Melayu",        nameId: "Kampung Melayu",        code: "C5-KMB", lat: -6.2240, lon: 106.8660 },
    ],
  },
  {
    id: "corridor-6",
    nameEn: "Corridor 6 (Ragunan ↔ Senen)",
    nameId: "Koridor 6 (Ragunan ↔ Senen)",
    headsignAEn: "Senen",
    headsignAId: "Senen",
    headsignBEn: "Ragunan",
    headsignBId: "Ragunan",
    color: "#E53935",
    stops: [
      { id: "c6-rgn", nameEn: "Ragunan",               nameId: "Ragunan",               code: "C6-RGN", lat: -6.3110, lon: 106.8420 },
      { id: "c6-psm", nameEn: "Pasar Minggu",          nameId: "Pasar Minggu",          code: "C6-PSM", lat: -6.2860, lon: 106.8430 },
      { id: "c6-pcn", nameEn: "Pancoran",              nameId: "Pancoran",              code: "C6-PCN", lat: -6.2580, lon: 106.8400 },
      { id: "c6-cwg", nameEn: "Cawang",                nameId: "Cawang",                code: "C6-CWG", lat: -6.2460, lon: 106.8580 },
      { id: "c6-prk", nameEn: "Pramuka",               nameId: "Pramuka",               code: "C6-PRK", lat: -6.1930, lon: 106.8740 },
      { id: "c6-snn", nameEn: "Senen",                 nameId: "Senen",                 code: "C6-SNN", lat: -6.1760, lon: 106.8380 },
    ],
  },
  {
    id: "corridor-7",
    nameEn: "Corridor 7 (Kampung Rambutan ↔ Kampung Melayu)",
    nameId: "Koridor 7 (Kampung Rambutan ↔ Kampung Melayu)",
    headsignAEn: "Kampung Melayu",
    headsignAId: "Kampung Melayu",
    headsignBEn: "Kampung Rambutan",
    headsignBId: "Kampung Rambutan",
    color: "#E53935",
    stops: [
      { id: "c7-kmr", nameEn: "Kampung Rambutan",      nameId: "Kampung Rambutan",      code: "C7-KMR", lat: -6.3070, lon: 106.8615 },
      { id: "c7-tpb", nameEn: "Tanjung Barat",         nameId: "Tanjung Barat",         code: "C7-TPB", lat: -6.2990, lon: 106.8470 },
      { id: "c7-psm", nameEn: "Pasar Minggu",          nameId: "Pasar Minggu",          code: "C7-PSM", lat: -6.2860, lon: 106.8430 },
      { id: "c7-kmb", nameEn: "Kampung Melayu",        nameId: "Kampung Melayu",        code: "C7-KMB", lat: -6.2240, lon: 106.8660 },
    ],
  },
  {
    id: "corridor-8",
    nameEn: "Corridor 8 (Lebak Bulus ↔ Harmoni)",
    nameId: "Koridor 8 (Lebak Bulus ↔ Harmoni)",
    headsignAEn: "Harmoni",
    headsignAId: "Harmoni",
    headsignBEn: "Lebak Bulus",
    headsignBId: "Lebak Bulus",
    color: "#E53935",
    stops: [
      { id: "c8-lbb", nameEn: "Lebak Bulus",            nameId: "Lebak Bulus",            code: "C8-LBB", lat: -6.2885, lon: 106.7745 },
      { id: "c8-fkb", nameEn: "Fatmawati",             nameId: "Fatmawati",             code: "C8-FKB", lat: -6.2925, lon: 106.7910 },
      { id: "c8-cpr", nameEn: "Cipete Raya",           nameId: "Cipete Raya",           code: "C8-CPR", lat: -6.2952, lon: 106.7990 },
      { id: "c8-blk", nameEn: "Blok A",                nameId: "Blok A",                code: "C8-BLK", lat: -6.3005, lon: 106.8130 },
      { id: "c8-blm", nameEn: "Blok M",                nameId: "Blok M",                code: "C8-BLM", lat: -6.3037, lon: 106.8200 },
      { id: "c8-mpr", nameEn: "Mampang Prapatan",      nameId: "Mampang Prapatan",      code: "C8-MPR", lat: -6.2920, lon: 106.8260 },
      { id: "c8-krd", nameEn: "Karet",                 nameId: "Karet",                 code: "C8-KRD", lat: -6.2810, lon: 106.8310 },
      { id: "c8-sdb", nameEn: "Sudirman",              nameId: "Sudirman",              code: "C8-SDB", lat: -6.2088, lon: 106.8226 },
      { id: "c8-hrm", nameEn: "Harmoni",               nameId: "Harmoni",               code: "C8-HRM", lat: -6.1780, lon: 106.8230 },
    ],
  },
  {
    id: "corridor-9",
    nameEn: "Corridor 9 (Pinang Ranti ↔ Pluit)",
    nameId: "Koridor 9 (Pinang Ranti ↔ Pluit)",
    headsignAEn: "Pluit",
    headsignAId: "Pluit",
    headsignBEn: "Pinang Ranti",
    headsignBId: "Pinang Ranti",
    color: "#E53935",
    /** 24-hour service. Overrides the mode-level 05:00–22:00 default.
     *  This is the route that has run Transjakarta's 24h pilot for
     *  the longest stretch. */
    isAlwaysOpen: true,
    stops: [
      { id: "c9-pnr", nameEn: "Pinang Ranti",          nameId: "Pinang Ranti",          code: "C9-PNR", lat: -6.2920, lon: 106.8870 },
      { id: "c9-psk", nameEn: "Pegangsaan",            nameId: "Pegangsaan",            code: "C9-PSK", lat: -6.1900, lon: 106.8810 },
      { id: "c9-cpr", nameEn: "Cempaka Putih",         nameId: "Cempaka Putih",         code: "C9-CPR", lat: -6.1840, lon: 106.8660 },
      { id: "c9-sdb", nameEn: "Sudirman",              nameId: "Sudirman",              code: "C9-SDB", lat: -6.2088, lon: 106.8226 },
      { id: "c9-bnd", nameEn: "Bendungan Hilir",       nameId: "Bendungan Hilir",       code: "C9-BND", lat: -6.3155, lon: 106.8480 },
      { id: "c9-ist", nameEn: "Istora",                nameId: "Istora",                code: "C9-IST", lat: -6.3125, lon: 106.8410 },
      { id: "c9-sny", nameEn: "Senayan",               nameId: "Senayan",               code: "C9-SNY", lat: -6.3095, lon: 106.8340 },
      { id: "c9-plt", nameEn: "Pluit",                 nameId: "Pluit",                 code: "C9-PLT", lat: -6.1240, lon: 106.7900 },
    ],
  },
  {
    id: "corridor-10",
    nameEn: "Corridor 10 (Tanjung Priok ↔ PGC)",
    nameId: "Koridor 10 (Tanjung Priok ↔ PGC)",
    headsignAEn: "Pulo Gadung",
    headsignAId: "Pulo Gadung",
    headsignBEn: "Tanjung Priok",
    headsignBId: "Tanjung Priok",
    color: "#E53935",
    stops: [
      { id: "c10-tpj", nameEn: "Tanjung Priok",         nameId: "Tanjung Priok",         code: "C10-TPJ", lat: -6.1050, lon: 106.8800 },
      { id: "c10-kpg", nameEn: "Kelapa Gading",         nameId: "Kelapa Gading",         code: "C10-KPG", lat: -6.1620, lon: 106.9020 },
      { id: "c10-plg", nameEn: "Pulo Gadung",           nameId: "Pulo Gadung",           code: "C10-PLG", lat: -6.1870, lon: 106.9110 },
    ],
  },
  {
    id: "corridor-11",
    nameEn: "Corridor 11 (Kampung Melayu ↔ Pulo Gadung)",
    nameId: "Koridor 11 (Kampung Melayu ↔ Pulo Gadung)",
    headsignAEn: "Pulo Gadung",
    headsignAId: "Pulo Gadung",
    headsignBEn: "Kampung Melayu",
    headsignBId: "Kampung Melayu",
    color: "#E53935",
    stops: [
      { id: "c11-kmb", nameEn: "Kampung Melayu",        nameId: "Kampung Melayu",        code: "C11-KMB", lat: -6.2240, lon: 106.8660 },
      { id: "c11-pmd", nameEn: "Pemuda",                nameId: "Pemuda",                code: "C11-PMD", lat: -6.1880, lon: 106.8910 },
      { id: "c11-plg", nameEn: "Pulo Gadung",           nameId: "Pulo Gadung",           code: "C11-PLG", lat: -6.1870, lon: 106.9110 },
    ],
  },
  {
    id: "corridor-12",
    nameEn: "Corridor 12 (Pluit ↔ Tanjung Priok)",
    nameId: "Koridor 12 (Pluit ↔ Tanjung Priok)",
    headsignAEn: "Tanjung Priok",
    headsignAId: "Tanjung Priok",
    headsignBEn: "Pluit",
    headsignBId: "Pluit",
    color: "#E53935",
    stops: [
      { id: "c12-plt", nameEn: "Pluit",                 nameId: "Pluit",                 code: "C12-PLT", lat: -6.1240, lon: 106.7900 },
      { id: "c12-psg", nameEn: "Pesing",                nameId: "Pesing",                code: "C12-PSG", lat: -6.1660, lon: 106.6850 },
      { id: "c12-gns", nameEn: "Gedung Panjang",        nameId: "Gedung Panjang",        code: "C12-GNS", lat: -6.1370, lon: 106.8200 },
      { id: "c12-ptj", nameEn: "Petojo",                nameId: "Petojo",                code: "C12-PTJ", lat: -6.1660, lon: 106.8105 },
      { id: "c12-tpj", nameEn: "Tanjung Priok",         nameId: "Tanjung Priok",         code: "C12-TPJ", lat: -6.1050, lon: 106.8800 },
    ],
  },
  {
    id: "corridor-13",
    nameEn: "Corridor 13 (Pangkep ↔ Tanah Abang)",
    nameId: "Koridor 13 (Pangkep ↔ Tanah Abang)",
    headsignAEn: "Tanah Abang",
    headsignAId: "Tanah Abang",
    headsignBEn: "Pangkep",
    headsignBId: "Pangkep",
    color: "#E53935",
    stops: [
      { id: "c13-pkp", nameEn: "Pangkep",               nameId: "Pangkep",               code: "C13-PKP", lat: -6.3100, lon: 106.8340 },
      { id: "c13-cwg", nameEn: "Cawang",                nameId: "Cawang",                code: "C13-CWG", lat: -6.2460, lon: 106.8580 },
      { id: "c13-prk", nameEn: "Pramuka",               nameId: "Pramuka",               code: "C13-PRK", lat: -6.1930, lon: 106.8740 },
      { id: "c13-sdb", nameEn: "Sudirman",              nameId: "Sudirman",              code: "C13-SDB", lat: -6.2088, lon: 106.8226 },
      { id: "c13-tnb", nameEn: "Tanah Abang",           nameId: "Tanah Abang",           code: "C13-TNB", lat: -6.1865, lon: 106.8115 },
    ],
  },
  {
    id: "corridor-14",
    nameEn: "Corridor 14 (JIExpo ↔ Senen)",
    nameId: "Koridor 14 (JIExpo ↔ Senen)",
    headsignAEn: "Senen",
    headsignAId: "Senen",
    headsignBEn: "JIExpo",
    headsignBId: "JIExpo",
    color: "#E53935",
    stops: [
      { id: "c14-jie", nameEn: "JIExpo",                nameId: "JIExpo",                code: "C14-JIE", lat: -6.1490, lon: 106.8570 },
      { id: "c14-psk", nameEn: "Pegangsaan",            nameId: "Pegangsaan",            code: "C14-PSK", lat: -6.1900, lon: 106.8810 },
      { id: "c14-cpr", nameEn: "Cempaka Putih",         nameId: "Cempaka Putih",         code: "C14-CPR", lat: -6.1840, lon: 106.8660 },
      { id: "c14-snn", nameEn: "Senen",                 nameId: "Senen",                 code: "C14-SNN", lat: -6.1760, lon: 106.8380 },
    ],
  },
]

function parseClock(c: string): number { return parseInt(c.slice(0, 2)) * 60 + parseInt(c.slice(3, 5)) }
function formatClock(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

function generateTimetable(
  stops: StopSpec[],
  startClock: string,
  endClock: string,
): Map<string, string[]> {
  const timetable = new Map<string, string[]>()
  for (const s of stops) timetable.set(s.id, [])

  for (let t = parseClock(startClock); t < parseClock(endClock); t += HEADWAY_MIN) {
    for (let i = 0; i < stops.length; i++) {
      const minutes = t + i * (TRIP_TRAVEL_MIN + TRIP_DWELL_MIN)
      timetable.get(stops[i].id)!.push(formatClock(minutes))
    }
  }
  return timetable
}

function main() {
  const allStops: StopSpec[] = []
  const routes: object[] = []
  const timetables: Record<string, Record<string, string[]>> = {}

  for (const c of CORRIDORS) {
    // Stop IDs in this corridor might collide with stop IDs in other
    // corridors (e.g. "Harmoni" is shared by Corridor 1, 2, 8, 9).
    // For the static-JSON provider this is fine — stops are looked up
    // by `(mode, stopId)` and the chain unifies at the operator
    // level for shared physical locations. To avoid silent collisions
    // inside one bundle, we *don't* dedupe here; the IDs here are
    // corridor-scoped.
    for (const s of c.stops) allStops.push(s)

    const startClock = c.isAlwaysOpen ? "00:00" : MODE_START
    // Always-on: 24h, written as 00:00 → 24:00 so the time math in
    // static-json.ts treats it as "always running".
    const endClock = c.isAlwaysOpen ? "24:00" : MODE_END

    const forward = generateTimetable(c.stops, startClock, endClock)
    const reverse = generateTimetable(
      [...c.stops].reverse(),
      startClock,
      endClock,
    )

    const routeAId = `${c.id}.${c.headsignAEn.toLowerCase().replace(/\s+/g, "-")}`
    const routeBId = `${c.id}.${c.headsignBEn.toLowerCase().replace(/\s+/g, "-")}`

    timetables[routeAId] = {}
    timetables[routeBId] = {}
    for (const s of c.stops) {
      timetables[routeAId][s.id] = forward.get(s.id)!
      timetables[routeBId][s.id] = reverse.get(s.id)!
    }

    const baseRoute: {
      id: string
      name: { en: string; id: string }
      headsign: { en: string; id: string }
      color: string
      serviceHours?: { start: string; end: string }
    } = {
      id: "",
      name: { en: "", id: "" },
      headsign: { en: "", id: "" },
      color: c.color,
    }
    if (c.isAlwaysOpen) {
      baseRoute.serviceHours = { start: "00:00", end: "24:00" }
    }

    routes.push({
      ...baseRoute,
      id: routeAId,
      name: { en: `${c.nameEn} (→ ${c.headsignAEn})`, id: `${c.nameId} (Menuju ${c.headsignAId})` },
      headsign: { en: c.headsignAEn, id: c.headsignAId },
    })
    routes.push({
      ...baseRoute,
      id: routeBId,
      name: { en: `${c.nameEn} (→ ${c.headsignBEn})`, id: `${c.nameId} (Menuju ${c.headsignBId})` },
      headsign: { en: c.headsignBEn, id: c.headsignBId },
    })
  }

  const bundle = {
    mode: "transjakarta-brt",
    operator: "transjakarta",
    name: { en: "Transjakarta BRT", id: "Transjakarta BRT" },
    serviceHours: { start: MODE_START, end: MODE_END },
    stops: allStops.map((s) => ({
      id: s.id, name: { en: s.nameEn, id: s.nameId }, code: s.code,
      lat: s.lat, lon: s.lon,
    })),
    routes,
    timetables,
  }

  const outPath = resolve(__dirname, "../src/data/transjakarta-brt.json")
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
  console.log(`Wrote ${outPath}`)
  console.log(`  ${CORRIDORS.length} corridors, ${allStops.length} stops, ${routes.length} routes`)
  console.log(`  24h corridor: ${CORRIDORS.find((c) => c.isAlwaysOpen)?.id ?? "(none)"}`)
}

main()

/**
 * Hand-curated Transjakarta Non-BRT data ("Angkutan Pengumpan" feeder
 * buses — the section on transjakarta.co.id/rute between BRT and
 * Mikrotrans).
 *
 * All ~60 routes from the page. Uses BRT stop ids for shared physical
 * halte (e.g. `c1-blm` for Blok M) so the chain unifies them into one
 * card per physical stop, with all three sub-services rendered as
 * badges. New stops that don't exist as BRT halte (universities,
 * residential areas, train stations) get the `np-` prefix.
 *
 * Stops are approximate (~10 m). The CI scraper will refine them to
 * authoritative coordinates.
 *
 * Run with `pnpm tsx scripts/gen-transjakarta-non-brt-data.ts`.
 */

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

type Stop = {
  "id": string
  nameEn: string
  nameId: string
  "code": string
  "lat": number
  "lon": number
}

type Route = {
  "id": string
  nameEn: string
  nameId: string
  headsignAEn: string
  headsignAId: string
  headsignBEn: string
  headsignBId: string
  "stops": string[] // stop ids
}

const COLOR = "#2E7D32"
const START = "05:00"
const END = "22:00"
const HEADWAY_MIN = 15
const TRIP_TRAVEL_MIN = 4
const TRIP_DWELL_MIN = 1

/**
 * BRT stops reused as Non-BRT halte. Declared inline so the bundle is
 * self-contained (the chain unifies by id, not by re-importing the
 * BRT JSON).
 */
const BRT: Record<string, Stop> = {
  "c1-blm":   { id: "c1-blm",   nameEn: "Blok M",                nameId: "Blok M",                code: "C1-BLM", lat: -6.3037, lon: 106.8200 },
  "c1-krd":   { id: "c1-krd",   nameEn: "Karet",                 nameId: "Karet",                 code: "C1-KRD", lat: -6.2810, lon: 106.8310 },
  "c1-hrm":   { id: "c1-hrm",   nameEn: "Harmoni",               nameId: "Harmoni",               code: "C1-HRM", lat: -6.1780, lon: 106.8230 },
  "c1-kta":   { id: "c1-kta",   nameEn: "Kota",                  nameId: "Kota",                  code: "C1-KTA", lat: -6.1372, lon: 106.8147 },
  "c1-sdb":   { id: "c1-sdb",   nameEn: "Sudirman",              nameId: "Sudirman",              code: "C1-SDB", lat: -6.2088, lon: 106.8226 },
  "c1-ptj":   { id: "c1-ptj",   nameEn: "Petojo",                nameId: "Petojo",                code: "C1-PTJ", lat: -6.1660, lon: 106.8105 },
  "c2-plg":   { id: "c2-plg",   nameEn: "Pulo Gadung",           nameId: "Pulo Gadung",           code: "C2-PLG", lat: -6.1870, lon: 106.9110 },
  "c2-snn":   { id: "c2-snn",   nameEn: "Senen",                 nameId: "Senen",                 code: "C2-SNN", lat: -6.1760, lon: 106.8380 },
  "c2-gmb":   { id: "c2-gmb",   nameEn: "Gambir",                nameId: "Gambir",                code: "C2-GMB", lat: -6.1770, lon: 106.8310 },
  "c2-mtr":   { id: "c2-mtr",   nameEn: "Matraman",              nameId: "Matraman",              code: "C2-MTR", lat: -6.1950, lon: 106.8620 },
  "c3-kld":   { id: "c3-kld",   nameEn: "Kalideres",             nameId: "Kalideres",             code: "C3-KLD", lat: -6.1540, lon: 106.6650 },
  "c3-grg":   { id: "c3-grg",   nameEn: "Grogol",                nameId: "Grogol",                code: "C3-GRG", lat: -6.1660, lon: 106.7040 },
  "c4-duc":   { id: "c4-duc",   nameEn: "Dukuh Atas",            nameId: "Dukuh Atas",            code: "C4-DUC", lat: -6.2210, lon: 106.8620 },
  "c4-cpr":   { id: "c4-cpr",   nameEn: "Cempaka Putih",         nameId: "Cempaka Putih",         code: "C4-CPR", lat: -6.1840, lon: 106.8660 },
  "c5-kmb":   { id: "c5-kmb",   nameEn: "Kampung Melayu",        nameId: "Kampung Melayu",        code: "C5-KMB", lat: -6.2240, lon: 106.8660 },
  "c5-anl":   { id: "c5-anl",   nameEn: "Ancol",                 nameId: "Ancol",                 code: "C5-ANL", lat: -6.1240, lon: 106.8330 },
  "c6-rgn":   { id: "c6-rgn",   nameEn: "Ragunan",               nameId: "Ragunan",               code: "C6-RGN", lat: -6.3110, lon: 106.8420 },
  "c6-psm":   { id: "c6-psm",   nameEn: "Pasar Minggu",          nameId: "Pasar Minggu",          code: "C6-PSM", lat: -6.2860, lon: 106.8430 },
  "c6-pcn":   { id: "c6-pcn",   nameEn: "Pancoran",              nameId: "Pancoran",              code: "C6-PCN", lat: -6.2580, lon: 106.8400 },
  "c6-cwg":   { id: "c6-cwg",   nameEn: "Cawang",                nameId: "Cawang",                code: "C6-CWG", lat: -6.2460, lon: 106.8580 },
  "c6-psb":   { id: "c6-psb",   nameEn: "Pasar Baru",            nameId: "Pasar Baru",            code: "C6-PSB", lat: -6.1660, lon: 106.8400 },
  "c7-kmr":   { id: "c7-kmr",   nameEn: "Kampung Rambutan",      nameId: "Kampung Rambutan",      code: "C7-KMR", lat: -6.3070, lon: 106.8615 },
  "c8-lbb":   { id: "c8-lbb",   nameEn: "Lebak Bulus",            nameId: "Lebak Bulus",            code: "C8-LBB", lat: -6.2885, lon: 106.7745 },
  "c8-blk":   { id: "c8-blk",   nameEn: "Blok A",                nameId: "Blok A",                code: "C8-BLK", lat: -6.3005, lon: 106.8130 },
  "c9-pnr":   { id: "c9-pnr",   nameEn: "Pinang Ranti",          nameId: "Pinang Ranti",          code: "C9-PNR", lat: -6.2920, lon: 106.8870 },
  "c9-bnd":   { id: "c9-bnd",   nameEn: "Bendungan Hilir",       nameId: "Bendungan Hilir",       code: "C9-BND", lat: -6.3155, lon: 106.8480 },
  "c9-ist":   { id: "c9-ist",   nameEn: "Istora",                nameId: "Istora",                code: "C9-IST", lat: -6.3125, lon: 106.8410 },
  "c9-sny":   { id: "c9-sny",   nameEn: "Senayan",               nameId: "Senayan",               code: "C9-SNY", lat: -6.3095, lon: 106.8340 },
  "c9-plt":   { id: "c9-plt",   nameEn: "Pluit",                 nameId: "Pluit",                 code: "C9-PLT", lat: -6.1240, lon: 106.7900 },
  "c10-tpj":  { id: "c10-tpj",  nameEn: "Tanjung Priok",         nameId: "Tanjung Priok",         code: "C10-TPJ", lat: -6.1050, lon: 106.8800 },
  "c12-plt":  { id: "c12-plt",  nameEn: "Pluit",                 nameId: "Pluit",                 code: "C12-PLT", lat: -6.1240, lon: 106.7900 },
  "c13-tnb":  { id: "c13-tnb",  nameEn: "Tanah Abang",           nameId: "Tanah Abang",           code: "C13-TNB", lat: -6.1865, lon: 106.8115 },
  "c14-jie":  { id: "c14-jie",  nameEn: "JIExpo",                nameId: "JIExpo",                code: "C14-JIE", lat: -6.1490, lon: 106.8570 },
}

/**
 * Non-BRT stops that don't exist as BRT halte. Coordinates are
 * approximate (general area of the named place).
 */
const NP: Record<string, Stop> = {
  "np-pantai-maju":      { id: "np-pantai-maju",      nameEn: "Pantai Maju",            nameId: "Pantai Maju",            code: "NP-PMJ", lat: -6.1050, lon: 106.7400 },
  "np-st-palmerah":      { id: "np-st-palmerah",      nameEn: "Stasiun Palmerah",       nameId: "Stasiun Palmerah",       code: "NP-SPL", lat: -6.2080, lon: 106.7990 },
  "np-pesanggrahan":     { id: "np-pesanggrahan",     nameEn: "Pesanggrahan",           nameId: "Pesanggrahan",           code: "NP-PSG", lat: -6.2490, lon: 106.7790 },
  "np-pondok-labu":      { id: "np-pondok-labu",      nameEn: "Pondok Labu",            nameId: "Pondok Labu",            code: "NP-PLB", lat: -6.3110, lon: 106.7900 },
  "np-st-gondangdia":    { id: "np-st-gondangdia",    nameEn: "Stasiun Gondangdia",     nameId: "Stasiun Gondangdia",     code: "NP-SGD", lat: -6.1850, lon: 106.8320 },
  "np-meruya":           { id: "np-meruya",           nameEn: "Meruya",                 nameId: "Meruya",                 code: "NP-MRY", lat: -6.1900, lon: 106.7170 },
  "np-rempoa":           { id: "np-rempoa",           nameEn: "Rempoa",                 nameId: "Rempoa",                 code: "NP-RMP", lat: -6.2820, lon: 106.7610 },
  "np-harapan-indah":    { id: "np-harapan-indah",    nameEn: "Harapan Indah",          nameId: "Harapan Indah",          code: "NP-HIN", lat: -6.1580, lon: 106.9760 },
  "np-taman-kota":       { id: "np-taman-kota",       nameEn: "Taman Kota",             nameId: "Taman Kota",             code: "NP-TKT", lat: -6.1370, lon: 106.6730 },
  "np-penjaringan":      { id: "np-penjaringan",      nameEn: "Penjaringan",            nameId: "Penjaringan",            code: "NP-PJG", lat: -6.1350, lon: 106.7800 },
  "np-sentraland":       { id: "np-sentraland",       nameEn: "Sentraland Cengkareng",  nameId: "Sentraland Cengkareng",  code: "NP-SNK", lat: -6.1430, lon: 106.7230 },
  "np-puri-kembangan":   { id: "np-puri-kembangan",   nameEn: "Puri Kembangan",         nameId: "Puri Kembangan",         code: "NP-PKM", lat: -6.1370, lon: 106.7240 },
  "np-st-manggarai":     { id: "np-st-manggarai",     nameEn: "Stasiun Manggarai",      nameId: "Stasiun Manggarai",      code: "NP-SMG", lat: -6.2097, lon: 106.8501 },
  "np-ui":               { id: "np-ui",               nameEn: "Universitas Indonesia",  nameId: "Universitas Indonesia",  code: "NP-UI ", lat: -6.3620, lon: 106.8290 },
  "np-jiep":             { id: "np-jiep",             nameEn: "JIEP",                   nameId: "JIEP",                   code: "NP-JEP", lat: -6.1620, lon: 106.9540 },
  "np-bundaran-senayan": { id: "np-bundaran-senayan", nameEn: "Bundaran Senayan",       nameId: "Bundaran Senayan",       code: "NP-BSN", lat: -6.2250, lon: 106.8060 },
  "np-kejaksaan":        { id: "np-kejaksaan",        nameEn: "Kejaksaan Agung",        nameId: "Kejaksaan Agung",        code: "NP-KJK", lat: -6.1730, lon: 106.8310 },
  "np-st-tebet":         { id: "np-st-tebet",         nameEn: "Stasiun Tebet",          nameId: "Stasiun Tebet",          code: "NP-STB", lat: -6.2400, lon: 106.8490 },
  "np-bidara-cina":      { id: "np-bidara-cina",      nameEn: "Bidara Cina",            nameId: "Bidara Cina",            code: "NP-BDC", lat: -6.2300, lon: 106.8700 },
  "np-kuningan":         { id: "np-kuningan",         nameEn: "Kuningan",               nameId: "Kuningan",               code: "NP-KNG", lat: -6.2230, lon: 106.8260 },
  "np-casablanca":       { id: "np-casablanca",       nameEn: "Casablanca",             nameId: "Casablanca",             code: "NP-CSB", lat: -6.2240, lon: 106.8400 },
  "np-velbak":           { id: "np-velbak",           nameEn: "Velbak",                 nameId: "Velbak",                 code: "NP-VBK", lat: -6.2210, lon: 106.7850 },
  "np-duren-tiga":       { id: "np-duren-tiga",       nameEn: "Duren Tiga",             nameId: "Duren Tiga",             code: "NP-DRT", lat: -6.2360, lon: 106.8390 },
  "np-cibubur":          { id: "np-cibubur",          nameEn: "Cibubur",                nameId: "Cibubur",                code: "NP-CBR", lat: -6.3640, lon: 106.8860 },
  "np-cawang-cililitan": { id: "np-cawang-cililitan", nameEn: "Cawang Cililitan",       nameId: "Cawang Cililitan",       code: "NP-CCL", lat: -6.2610, lon: 106.8720 },
  "np-tmii":             { id: "np-tmii",             nameEn: "TMII",                   nameId: "TMII",                   code: "NP-TMI", lat: -6.3020, lon: 106.8900 },
  "np-pondok-kelapa":    { id: "np-pondok-kelapa",    nameEn: "Pondok Kelapa",          nameId: "Pondok Kelapa",          code: "NP-PKL", lat: -6.2480, lon: 106.9260 },
  "np-st-kcjb-halim":    { id: "np-st-kcjb-halim",    nameEn: "Stasiun KCJB Halim",     nameId: "Stasiun KCJB Halim",     code: "NP-SKH", lat: -6.2650, lon: 106.8800 },
  "np-kebayoran-lama":   { id: "np-kebayoran-lama",   nameEn: "Kebayoran Lama",         nameId: "Kebayoran Lama",         code: "NP-KBL", lat: -6.2410, lon: 106.7760 },
  "np-meruya-selatan":   { id: "np-meruya-selatan",   nameEn: "Meruya Selatan",         nameId: "Meruya Selatan",         code: "NP-MRS", lat: -6.1970, lon: 106.7130 },
  "np-bintaro":          { id: "np-bintaro",          nameEn: "Bintaro",                nameId: "Bintaro",                code: "NP-BTR", lat: -6.2750, lon: 106.7670 },
  "np-batusari":         { id: "np-batusari",         nameEn: "Batusari",               nameId: "Batusari",               code: "NP-BTS", lat: -6.1530, lon: 106.7130 },
  "np-tanjung-duren":    { id: "np-tanjung-duren",    nameEn: "Tanjung Duren",          nameId: "Tanjung Duren",          code: "NP-TDR", lat: -6.1680, lon: 106.7860 },
  "np-petamburan":       { id: "np-petamburan",       nameEn: "Petamburan",             nameId: "Petamburan",             code: "NP-PTB", lat: -6.1960, lon: 106.8090 },
  "np-jelambar":         { id: "np-jelambar",         nameEn: "Jelambar",               nameId: "Jelambar",               code: "NP-JLB", lat: -6.1450, lon: 106.7900 },
  "np-cipedak":          { id: "np-cipedak",          nameEn: "Cipedak",                nameId: "Cipedak",                code: "NP-CPD", lat: -6.2910, lon: 106.8180 },
  "np-pulo-gebang":      { id: "np-pulo-gebang",      nameEn: "Pulo Gebang",            nameId: "Pulo Gebang",            code: "NP-PGB", lat: -6.1900, lon: 106.9600 },
  "np-pik":              { id: "np-pik",              nameEn: "PIK",                    nameId: "PIK",                    code: "NP-PIK", lat: -6.1050, lon: 106.7400 },
  "np-st-klender":       { id: "np-st-klender",       nameEn: "Stasiun Klender",        nameId: "Stasiun Klender",        code: "NP-SKL", lat: -6.2140, lon: 106.9390 },
  "np-kaliadem":         { id: "np-kaliadem",         nameEn: "Kaliadem",               nameId: "Kaliadem",               code: "NP-KAD", lat: -6.1300, lon: 106.8400 },
  "np-st-lrt-pegangsaan":{ id: "np-st-lrt-pegangsaan",nameEn: "Stasiun LRT Pegangsaan",nameId: "Stasiun LRT Pegangsaan",code: "NP-SLP", lat: -6.1465, lon: 106.8868 },
  "np-jis":              { id: "np-jis",              nameEn: "Jakarta International Stadium (JIS)", nameId: "Jakarta International Stadium (JIS)", code: "NP-JIS", lat: -6.1250, lon: 106.8530 },
  "np-monumen-nasional": { id: "np-monumen-nasional", nameEn: "Monumen Nasional",       nameId: "Monumen Nasional",       code: "NP-MNS", lat: -6.1750, lon: 106.8270 },
}

const ROUTES: Route[] = [
  { id: "1A", nameEn: "1A (Pantai Maju ↔ Balai Kota)", nameId: "1A (Pantai Maju ↔ Balai Kota)", headsignAEn: "Pantai Maju", headsignAId: "Pantai Maju", headsignBEn: "Balai Kota", headsignBId: "Balai Kota", stops: ["np-pantai-maju", "c14-jie", "c2-gmb"] },
  { id: "1B", nameEn: "1B (Stasiun Palmerah ↔ Dukuh Atas)", nameId: "1B (Stasiun Palmerah ↔ Dukuh Atas)", headsignAEn: "Stasiun Palmerah", headsignAId: "Stasiun Palmerah", headsignBEn: "Dukuh Atas", headsignBId: "Dukuh Atas", stops: ["np-st-palmerah", "c1-sdb", "c4-duc"] },
  { id: "1C", nameEn: "1C (Pesanggrahan ↔ Blok M)", nameId: "1C (Pesanggrahan ↔ Blok M)", headsignAEn: "Pesanggrahan", headsignAId: "Pesanggrahan", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["np-pesanggrahan", "c8-lbb", "c1-blm"] },
  { id: "1E", nameEn: "1E (Pondok Labu ↔ Blok M)", nameId: "1E (Pondok Labu ↔ Blok M)", headsignAEn: "Pondok Labu", headsignAId: "Pondok Labu", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["np-pondok-labu", "c8-lbb", "c1-blm"] },
  { id: "1F", nameEn: "1F (Stasiun Palmerah ↔ Bundaran Senayan)", nameId: "1F (Stasiun Palmerah ↔ Bundaran Senayan)", headsignAEn: "Stasiun Palmerah", headsignAId: "Stasiun Palmerah", headsignBEn: "Bundaran Senayan", headsignBId: "Bundaran Senayan", stops: ["np-st-palmerah", "c9-sny", "np-bundaran-senayan"] },
  { id: "1H", nameEn: "1H (Tanah Abang ↔ Stasiun Gondangdia)", nameId: "1H (Tanah Abang ↔ Stasiun Gondangdia)", headsignAEn: "Tanah Abang", headsignAId: "Tanah Abang", headsignBEn: "Stasiun Gondangdia", headsignBId: "Stasiun Gondangdia", stops: ["c13-tnb", "c1-sdb", "np-st-gondangdia"] },
  { id: "1M", nameEn: "1M (Meruya ↔ Blok M)", nameId: "1M (Meruya ↔ Blok M)", headsignAEn: "Meruya", headsignAId: "Meruya", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["np-meruya", "c3-kld", "c1-blm"] },
  { id: "1P", nameEn: "1P (Senen ↔ Blok M)", nameId: "1P (Senen ↔ Blok M)", headsignAEn: "Senen", headsignAId: "Senen", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["c2-snn", "c1-ptj", "c1-blm"] },
  { id: "1Q", nameEn: "1Q (Rempoa ↔ Blok M)", nameId: "1Q (Rempoa ↔ Blok M)", headsignAEn: "Rempoa", headsignAId: "Rempoa", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["np-rempoa", "c8-lbb", "c1-blm"] },
  { id: "1R", nameEn: "1R (Senen ↔ Tanah Abang)", nameId: "1R (Senen ↔ Tanah Abang)", headsignAEn: "Senen", headsignAId: "Senen", headsignBEn: "Tanah Abang", headsignBId: "Tanah Abang", stops: ["c2-snn", "c1-sdb", "c13-tnb"] },
  { id: "1W", nameEn: "1W (Blok M ↔ Ancol)", nameId: "1W (Blok M ↔ Ancol)", headsignAEn: "Blok M", headsignAId: "Blok M", headsignBEn: "Ancol", headsignBId: "Ancol", stops: ["c1-blm", "c9-ist", "c5-anl"] },
  { id: "2B", nameEn: "2B (Harapan Indah ↔ Pulo Gadung)", nameId: "2B (Harapan Indah ↔ Pulo Gadung)", headsignAEn: "Harapan Indah", headsignAId: "Harapan Indah", headsignBEn: "Pulo Gadung", headsignBId: "Pulo Gadung", stops: ["np-harapan-indah", "np-pulo-gebang", "c2-plg"] },
  { id: "2P", nameEn: "2P (Stasiun Gondangdia ↔ Pasar Senen)", nameId: "2P (Stasiun Gondangdia ↔ Pasar Senen)", headsignAEn: "Stasiun Gondangdia", headsignAId: "Stasiun Gondangdia", headsignBEn: "Pasar Senen", headsignBId: "Pasar Senen", stops: ["np-st-gondangdia", "c1-sdb", "c2-snn"] },
  { id: "2Q", nameEn: "2Q (Gondangdia ↔ Balaikota)", nameId: "2Q (Gondangdia ↔ Balaikota)", headsignAEn: "Gondangdia", headsignAId: "Gondangdia", headsignBEn: "Balaikota", headsignBId: "Balaikota", stops: ["np-st-gondangdia", "c2-gmb", "c1-kta"] },
  { id: "3D", nameEn: "3D (Taman Kota ↔ Penjaringan)", nameId: "3D (Taman Kota ↔ Penjaringan)", headsignAEn: "Taman Kota", headsignAId: "Taman Kota", headsignBEn: "Penjaringan", headsignBId: "Penjaringan", stops: ["np-taman-kota", "c3-kld", "np-penjaringan"] },
  { id: "3E", nameEn: "3E (Sentraland Cengkareng ↔ Puri Kembangan)", nameId: "3E (Sentraland Cengkareng ↔ Puri Kembangan)", headsignAEn: "Sentraland Cengkareng", headsignAId: "Sentraland Cengkareng", headsignBEn: "Puri Kembangan", headsignBId: "Puri Kembangan", stops: ["np-sentraland", "c3-kld", "np-puri-kembangan"] },
  { id: "4B", nameEn: "4B (Stasiun Manggarai ↔ Universitas Indonesia)", nameId: "4B (Stasiun Manggarai ↔ Universitas Indonesia)", headsignAEn: "Stasiun Manggarai", headsignAId: "Stasiun Manggarai", headsignBEn: "Universitas Indonesia", headsignBId: "Universitas Indonesia", stops: ["np-st-manggarai", "c9-pnr", "np-cibubur", "np-ui"] },
  { id: "4C", nameEn: "4C (JIEP ↔ Bundaran Senayan)", nameId: "4C (JIEP ↔ Bundaran Senayan)", headsignAEn: "JIEP", headsignAId: "JIEP", headsignBEn: "Bundaran Senayan", headsignBId: "Bundaran Senayan", stops: ["np-jiep", "c2-plg", "c4-cpr", "c1-sdb", "np-bundaran-senayan"] },
  { id: "4F", nameEn: "4F (Pinang Ranti ↔ Pulo Gadung)", nameId: "4F (Pinang Ranti ↔ Pulo Gadung)", headsignAEn: "Pinang Ranti", headsignAId: "Pinang Ranti", headsignBEn: "Pulo Gadung", headsignBId: "Pulo Gadung", stops: ["c9-pnr", "c2-mtr", "c2-plg"] },
  { id: "4K", nameEn: "4K (Pulo Gadung ↔ Kejaksaan Agung)", nameId: "4K (Pulo Gadung ↔ Kejaksaan Agung)", headsignAEn: "Pulo Gadung", headsignAId: "Pulo Gadung", headsignBEn: "Kejaksaan Agung", headsignBId: "Kejaksaan Agung", stops: ["c2-plg", "c2-snn", "np-kejaksaan"] },
  { id: "5B", nameEn: "5B (Stasiun Tebet ↔ Bidara Cina)", nameId: "5B (Stasiun Tebet ↔ Bidara Cina)", headsignAEn: "Stasiun Tebet", headsignAId: "Stasiun Tebet", headsignBEn: "Bidara Cina", headsignBId: "Bidara Cina", stops: ["np-st-tebet", "c6-cwg", "np-bidara-cina"] },
  { id: "5F", nameEn: "5F (Kampung Melayu ↔ Tanah Abang)", nameId: "5F (Kampung Melayu ↔ Tanah Abang)", headsignAEn: "Kampung Melayu", headsignAId: "Kampung Melayu", headsignBEn: "Tanah Abang", headsignBId: "Tanah Abang", stops: ["c5-kmb", "c1-krd", "c13-tnb"] },
  { id: "5M", nameEn: "5M (Kampung Melayu ↔ Tanah Abang)", nameId: "5M (Kampung Melayu ↔ Tanah Abang)", headsignAEn: "Kampung Melayu", headsignAId: "Kampung Melayu", headsignBEn: "Tanah Abang", headsignBId: "Tanah Abang", stops: ["c5-kmb", "c6-pcn", "c13-tnb"] },
  { id: "5N", nameEn: "5N (Ragunan ↔ Kampung Melayu)", nameId: "5N (Ragunan ↔ Kampung Melayu)", headsignAEn: "Ragunan", headsignAId: "Ragunan", headsignBEn: "Kampung Melayu", headsignBId: "Kampung Melayu", stops: ["c6-rgn", "c5-kmb"] },
  { id: "6C", nameEn: "6C (Stasiun Tebet ↔ Kuningan)", nameId: "6C (Stasiun Tebet ↔ Kuningan)", headsignAEn: "Stasiun Tebet", headsignAId: "Stasiun Tebet", headsignBEn: "Kuningan", headsignBId: "Kuningan", stops: ["np-st-tebet", "np-kuningan"] },
  { id: "6D", nameEn: "6D (Stasiun Tebet ↔ Bundaran Senayan)", nameId: "6D (Stasiun Tebet ↔ Bundaran Senayan)", headsignAEn: "Stasiun Tebet", headsignAId: "Stasiun Tebet", headsignBEn: "Bundaran Senayan", headsignBId: "Bundaran Senayan", stops: ["np-st-tebet", "c1-sdb", "np-bundaran-senayan"] },
  { id: "6H", nameEn: "6H (Senen ↔ Lebak Bulus)", nameId: "6H (Senen ↔ Lebak Bulus)", headsignAEn: "Senen", headsignAId: "Senen", headsignBEn: "Lebak Bulus", headsignBId: "Lebak Bulus", stops: ["c2-snn", "c1-sdb", "c8-lbb"] },
  { id: "6K", nameEn: "6K (Kuningan ↔ Karet)", nameId: "6K (Kuningan ↔ Karet)", headsignAEn: "Kuningan", headsignAId: "Kuningan", headsignBEn: "Karet", headsignBId: "Karet", stops: ["np-kuningan", "c1-krd"] },
  { id: "6M", nameEn: "6M (Stasiun Manggarai ↔ Blok M)", nameId: "6M (Stasiun Manggarai ↔ Blok M)", headsignAEn: "Stasiun Manggarai", headsignAId: "Stasiun Manggarai", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["np-st-manggarai", "c1-sdb", "c1-blm"] },
  { id: "6N", nameEn: "6N (Ragunan ↔ Blok M via Kemang)", nameId: "6N (Ragunan ↔ Blok M via Kemang)", headsignAEn: "Ragunan", headsignAId: "Ragunan", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["c6-rgn", "c6-psm", "c1-blm"] },
  { id: "6Q", nameEn: "6Q (Dukuh Atas ↔ Casablanca)", nameId: "6Q (Dukuh Atas ↔ Casablanca)", headsignAEn: "Dukuh Atas", headsignAId: "Dukuh Atas", headsignBEn: "Casablanca", headsignBId: "Casablanca", stops: ["c4-duc", "np-casablanca"] },
  { id: "6T", nameEn: "6T (Pasar Minggu ↔ Velbak via Kebon Jeruk)", nameId: "6T (Pasar Minggu ↔ Velbak via Kebon Jeruk)", headsignAEn: "Pasar Minggu", headsignAId: "Pasar Minggu", headsignBEn: "Velbak", headsignBId: "Velbak", stops: ["c6-psm", "c1-sdb", "np-velbak"] },
  { id: "6U", nameEn: "6U (Blok M ↔ Pasar Minggu)", nameId: "6U (Blok M ↔ Pasar Minggu)", headsignAEn: "Blok M", headsignAId: "Blok M", headsignBEn: "Pasar Minggu", headsignBId: "Pasar Minggu", stops: ["c1-blm", "c6-psm"] },
  { id: "6W", nameEn: "6W (Duren Tiga ↔ Blok M via Bangka Raya)", nameId: "6W (Duren Tiga ↔ Blok M via Bangka Raya)", headsignAEn: "Duren Tiga", headsignAId: "Duren Tiga", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["np-duren-tiga", "c8-blk", "c1-blm"] },
  { id: "7A", nameEn: "7A (Kampung Rambutan ↔ Lebak Bulus)", nameId: "7A (Kampung Rambutan ↔ Lebak Bulus)", headsignAEn: "Kampung Rambutan", headsignAId: "Kampung Rambutan", headsignBEn: "Lebak Bulus", headsignBId: "Lebak Bulus", stops: ["c7-kmr", "c6-psm", "c8-lbb"] },
  { id: "7B", nameEn: "7B (Kampung Rambutan ↔ Blok M)", nameId: "7B (Kampung Rambutan ↔ Blok M)", headsignAEn: "Kampung Rambutan", headsignAId: "Kampung Rambutan", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["c7-kmr", "c8-blk", "c1-blm"] },
  { id: "7C", nameEn: "7C (Cibubur ↔ Cawang Cililitan)", nameId: "7C (Cibubur ↔ Cawang Cililitan)", headsignAEn: "Cibubur", headsignAId: "Cibubur", headsignBEn: "Cawang Cililitan", headsignBId: "Cawang Cililitan", stops: ["np-cibubur", "c7-kmr", "np-cawang-cililitan"] },
  { id: "7D", nameEn: "7D (TMII ↔ Pancoran)", nameId: "7D (TMII ↔ Pancoran)", headsignAEn: "TMII", headsignAId: "TMII", headsignBEn: "Pancoran", headsignBId: "Pancoran", stops: ["np-tmii", "c7-kmr", "c6-pcn"] },
  { id: "7E", nameEn: "7E (Kampung Rambutan ↔ Ragunan)", nameId: "7E (Kampung Rambutan ↔ Ragunan)", headsignAEn: "Kampung Rambutan", headsignAId: "Kampung Rambutan", headsignBEn: "Ragunan", headsignBId: "Ragunan", stops: ["c7-kmr", "c6-rgn"] },
  { id: "7P", nameEn: "7P (Pondok Kelapa ↔ Cawang Cililitan)", nameId: "7P (Pondok Kelapa ↔ Cawang Cililitan)", headsignAEn: "Pondok Kelapa", headsignAId: "Pondok Kelapa", headsignBEn: "Cawang Cililitan", headsignBId: "Cawang Cililitan", stops: ["np-pondok-kelapa", "c6-cwg", "np-cawang-cililitan"] },
  { id: "7Q", nameEn: "7Q (Blok M ↔ Cawang Cililitan)", nameId: "7Q (Blok M ↔ Cawang Cililitan)", headsignAEn: "Blok M", headsignAId: "Blok M", headsignBEn: "Cawang Cililitan", headsignBId: "Cawang Cililitan", stops: ["c1-blm", "c1-sdb", "c6-cwg", "np-cawang-cililitan"] },
  { id: "7R", nameEn: "7R (Cibubur ↔ Pluit)", nameId: "7R (Cibubur ↔ Pluit)", headsignAEn: "Cibubur", headsignAId: "Cibubur", headsignBEn: "Pluit", headsignBId: "Pluit", stops: ["np-cibubur", "c9-bnd", "c9-plt"] },
  { id: "7T", nameEn: "7T (Cibubur ↔ Tanjung Priok)", nameId: "7T (Cibubur ↔ Tanjung Priok)", headsignAEn: "Cibubur", headsignAId: "Cibubur", headsignBEn: "Tanjung Priok", headsignBId: "Tanjung Priok", stops: ["np-cibubur", "c2-plg", "c10-tpj"] },
  { id: "7U", nameEn: "7U (Cibubur ↔ Ancol)", nameId: "7U (Cibubur ↔ Ancol)", headsignAEn: "Cibubur", headsignAId: "Cibubur", headsignBEn: "Ancol", headsignBId: "Ancol", stops: ["np-cibubur", "c9-bnd", "c5-anl"] },
  { id: "7V", nameEn: "7V (Cibubur ↔ Kampung Rambutan)", nameId: "7V (Cibubur ↔ Kampung Rambutan)", headsignAEn: "Cibubur", headsignAId: "Cibubur", headsignBEn: "Kampung Rambutan", headsignBId: "Kampung Rambutan", stops: ["np-cibubur", "c7-kmr"] },
  { id: "7W", nameEn: "7W (Cawang ↔ Stasiun KCJB Halim)", nameId: "7W (Cawang ↔ Stasiun KCJB Halim)", headsignAEn: "Cawang", headsignAId: "Cawang", headsignBEn: "Stasiun KCJB Halim", headsignBId: "Stasiun KCJB Halim", stops: ["c6-cwg", "np-st-kcjb-halim"] },
  { id: "8C", nameEn: "8C (Kebayoran Lama ↔ Tanah Abang)", nameId: "8C (Kebayoran Lama ↔ Tanah Abang)", headsignAEn: "Kebayoran Lama", headsignAId: "Kebayoran Lama", headsignBEn: "Tanah Abang", headsignBId: "Tanah Abang", stops: ["np-kebayoran-lama", "c8-blk", "c13-tnb"] },
  { id: "8D", nameEn: "8D (Meruya Selatan ↔ Blok M)", nameId: "8D (Meruya Selatan ↔ Blok M)", headsignAEn: "Meruya Selatan", headsignAId: "Meruya Selatan", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["np-meruya-selatan", "c3-kld", "c1-blm"] },
  { id: "8E", nameEn: "8E (Bintaro ↔ Blok M)", nameId: "8E (Bintaro ↔ Blok M)", headsignAEn: "Bintaro", headsignAId: "Bintaro", headsignBEn: "Blok M", headsignBId: "Blok M", stops: ["np-bintaro", "c8-lbb", "c1-blm"] },
  { id: "8K", nameEn: "8K (Batusari ↔ Grogol)", nameId: "8K (Batusari ↔ Grogol)", headsignAEn: "Batusari", headsignAId: "Batusari", headsignBEn: "Grogol", headsignBId: "Grogol", stops: ["np-batusari", "c3-grg"] },
  { id: "8M", nameEn: "8M (Tanah Abang ↔ Tanjung Duren)", nameId: "8M (Tanah Abang ↔ Tanjung Duren)", headsignAEn: "Tanah Abang", headsignAId: "Tanah Abang", headsignBEn: "Tanjung Duren", headsignBId: "Tanjung Duren", stops: ["c13-tnb", "c1-sdb", "np-tanjung-duren"] },
  { id: "8N", nameEn: "8N (Kebayoran ↔ Petamburan via Asia Afrika)", nameId: "8N (Kebayoran ↔ Petamburan via Asia Afrika)", headsignAEn: "Kebayoran", headsignAId: "Kebayoran", headsignBEn: "Petamburan", headsignBId: "Petamburan", stops: ["np-kebayoran-lama", "c1-sdb", "np-petamburan"] },
  { id: "9D", nameEn: "9D (Pasar Minggu ↔ Tanah Abang)", nameId: "9D (Pasar Minggu ↔ Tanah Abang)", headsignAEn: "Pasar Minggu", headsignAId: "Pasar Minggu", headsignBEn: "Tanah Abang", headsignBId: "Tanah Abang", stops: ["c6-psm", "c1-sdb", "c13-tnb"] },
  { id: "9E", nameEn: "9E (Kebayoran ↔ Jelambar)", nameId: "9E (Kebayoran ↔ Jelambar)", headsignAEn: "Kebayoran", headsignAId: "Kebayoran", headsignBEn: "Jelambar", headsignBId: "Jelambar", stops: ["np-kebayoran-lama", "c9-plt", "np-jelambar"] },
  { id: "9H", nameEn: "9H (Pasar Minggu ↔ Cipedak)", nameId: "9H (Pasar Minggu ↔ Cipedak)", headsignAEn: "Pasar Minggu", headsignAId: "Pasar Minggu", headsignBEn: "Cipedak", headsignBId: "Cipedak", stops: ["c6-psm", "c6-rgn", "np-cipedak"] },
  { id: "11D", nameEn: "11D (Pulo Gebang ↔ Pulo Gadung via PIK)", nameId: "11D (Pulo Gebang ↔ Pulo Gadung via PIK)", headsignAEn: "Pulo Gebang", headsignAId: "Pulo Gebang", headsignBEn: "Pulo Gadung", headsignBId: "Pulo Gadung", stops: ["np-pulo-gebang", "np-pik", "c2-plg"] },
  { id: "11Q", nameEn: "11Q (Kampung Melayu ↔ Pulo Gebang via BKT)", nameId: "11Q (Kampung Melayu ↔ Pulo Gebang via BKT)", headsignAEn: "Kampung Melayu", headsignAId: "Kampung Melayu", headsignBEn: "Pulo Gebang", headsignBId: "Pulo Gebang", stops: ["c5-kmb", "c2-plg", "np-pulo-gebang"] },
  { id: "11W", nameEn: "11W (Stasiun Klender ↔ Pulo Gadung)", nameId: "11W (Stasiun Klender ↔ Pulo Gadung)", headsignAEn: "Stasiun Klender", headsignAId: "Stasiun Klender", headsignBEn: "Pulo Gadung", headsignBId: "Pulo Gadung", stops: ["np-st-klender", "c2-plg"] },
  { id: "12A", nameEn: "12A (Kota ↔ Kaliadem)", nameId: "12A (Kota ↔ Kaliadem)", headsignAEn: "Kota", headsignAId: "Kota", headsignBEn: "Kaliadem", headsignBId: "Kaliadem", stops: ["c1-kta", "c1-ptj", "np-kaliadem"] },
  { id: "12B", nameEn: "12B (Pluit ↔ Senen)", nameId: "12B (Pluit ↔ Senen)", headsignAEn: "Pluit", headsignAId: "Pluit", headsignBEn: "Senen", headsignBId: "Senen", stops: ["c12-plt", "c1-sdb", "c2-snn"] },
  { id: "12P", nameEn: "12P (Stasiun LRT Pegangsaan ↔ JIS)", nameId: "12P (Stasiun LRT Pegangsaan ↔ JIS)", headsignAEn: "Stasiun LRT Pegangsaan", headsignAId: "Stasiun LRT Pegangsaan", headsignBEn: "JIS", headsignBId: "JIS", stops: ["np-st-lrt-pegangsaan", "c1-ptj", "np-jis"] },
  { id: "14A", nameEn: "14A (Monumen Nasional ↔ JIS)", nameId: "14A (Monumen Nasional ↔ JIS)", headsignAEn: "Monumen Nasional", headsignAId: "Monumen Nasional", headsignBEn: "JIS", headsignBId: "JIS", stops: ["np-monumen-nasional", "c1-sdb", "np-jis"] },
  { id: "14B", nameEn: "14B (Tanjung Priok ↔ Senen via JIS)", nameId: "14B (Tanjung Priok ↔ Senen via JIS)", headsignAEn: "Tanjung Priok", headsignAId: "Tanjung Priok", headsignBEn: "Senen", headsignBId: "Senen", stops: ["c10-tpj", "np-jis", "c2-snn"] },
]

function parseClock(c: string): number { return parseInt(c.slice(0, 2)) * 60 + parseInt(c.slice(3, 5)) }
function formatClock(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

function generateTimetable(stopIds: string[]): Map<string, string[]> {
  const timetable = new Map<string, string[]>()
  for (const id of stopIds) timetable.set(id, [])

  for (let t = parseClock(START); t < parseClock(END); t += HEADWAY_MIN) {
    for (let i = 0; i < stopIds.length; i++) {
      const minutes = t + i * (TRIP_TRAVEL_MIN + TRIP_DWELL_MIN)
      timetable.get(stopIds[i])!.push(formatClock(minutes))
    }
  }
  return timetable
}

function main() {
  // Build the combined stop catalog: every BRT stop that's referenced,
  // plus every NP stop that's referenced.
  const referencedIds = new Set<string>()
  for (const r of ROUTES) for (const id of r.stops) referencedIds.add(id)

  const allStops: Stop[] = []
  for (const id of referencedIds) {
    if (BRT[id]) allStops.push(BRT[id])
    else if (NP[id]) allStops.push(NP[id])
    else throw new Error(`Unknown stop id "${id}" referenced in a route`)
  }

  const routes: object[] = []
  const timetables: Record<string, Record<string, string[]>> = {}

  for (const r of ROUTES) {
    const forward = generateTimetable(r.stops)
    const reverse = generateTimetable([...r.stops].reverse())

    const aSlug = r.headsignAEn.toLowerCase().replace(/\s+/g, "-")
    const bSlug = r.headsignBEn.toLowerCase().replace(/\s+/g, "-")
    const routeAId = `np.${r.id}.${aSlug}`
    const routeBId = `np.${r.id}.${bSlug}`

    timetables[routeAId] = {}
    timetables[routeBId] = {}
    for (const id of r.stops) {
      timetables[routeAId][id] = forward.get(id)!
      timetables[routeBId][id] = reverse.get(id)!
    }

    routes.push({
      "id": routeAId,
      "name": { en: `${r.nameEn} (→ ${r.headsignAEn})`, id: `${r.nameId} (Menuju ${r.headsignAId})` },
      "headsign": { en: r.headsignAEn, id: r.headsignAId },
      "color": COLOR,
    })
    routes.push({
      "id": routeBId,
      "name": { en: `${r.nameEn} (→ ${r.headsignBEn})`, id: `${r.nameId} (Menuju ${r.headsignBId})` },
      "headsign": { en: r.headsignBEn, id: r.headsignBId },
      "color": COLOR,
    })
  }

  const bundle = {
    "mode": "transjakarta-non-brt",
    "operator": "transjakarta",
    "name": { en: "Transjakarta Non-BRT", id: "Transjakarta Non-BRT" },
    serviceHours: { start: START, end: END },
    "stops": allStops.map((s) => ({
      "id": s.id, name: { en: s.nameEn, id: s.nameId }, code: s.code,
      "lat": s.lat, lon: s.lon,
    })),
    routes,
    timetables,
  }

  const outPath = resolve(__dirname, "../src/data/transjakarta-non-brt.json")
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
  console.log(`Wrote ${outPath}`)
  console.log(`  ${ROUTES.length} routes, ${allStops.length} stops, ${routes.length} route-directions`)
  const sharedBrt = allStops.filter((s) => BRT[s.id]).length
  const npOnly = allStops.filter((s) => NP[s.id]).length
  console.log(`  ${sharedBrt} stops shared with BRT, ${npOnly} Non-BRT-only stops`)
}

main()

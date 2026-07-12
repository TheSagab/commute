/**
 * Hand-curated Transjakarta Mikrotrans data.
 *
 * 25 representative routes, primarily as feeders to BRT corridors.
 * Routes use BRT stop IDs for shared physical locations (e.g. a
 * Mikrotrans route that terminates at Blok M uses the BRT id
 * `c1-blm` for that stop, not a Mikrotrans-specific one) so the
 * chain unifies the two bundles into one card per physical stop.
 * Mikrotrans-only stops use the `mk-` prefix.
 *
 * Run with `pnpm tsx scripts/gen-transjakarta-mikrotrans-data.ts`.
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

type RouteSpec = {
  id: string
  nameEn: string
  nameId: string
  headsignAEn: string
  headsignAId: string
  headsignBEn: string
  headsignBId: string
  color: string
  stops: StopSpec[]
}

const START = "05:30"
const END = "21:00"
const HEADWAY_MIN = 15
const TRIP_TRAVEL_MIN = 4
const TRIP_DWELL_MIN = 1

/**
 * BRT stops that Mikrotrans routes share. We re-declare them here
 * (not import) so the Mikrotrans bundle is self-contained — the
 * chain unifies the two at query time, not the JSON loader.
 */
const BRT = {
  c1_blm:   { id: "c1-blm",   nameEn: "Blok M",                nameId: "Blok M",                code: "C1-BLM", lat: -6.3037, lon: 106.8200 },
  c1_mpr:   { id: "c1-mpr",   nameEn: "Mampang Prapatan",      nameId: "Mampang Prapatan",      code: "C1-MPR", lat: -6.2920, lon: 106.8260 },
  c1_krd:   { id: "c1-krd",   nameEn: "Karet",                 nameId: "Karet",                 code: "C1-KRD", lat: -6.2810, lon: 106.8310 },
  c1_sdb:   { id: "c1-sdb",   nameEn: "Sudirman",              nameId: "Sudirman",              code: "C1-SDB", lat: -6.2088, lon: 106.8226 },
  c1_bnd:   { id: "c1-bnd",   nameEn: "Bendungan Hilir",       nameId: "Bendungan Hilir",       code: "C1-BND", lat: -6.3155, lon: 106.8480 },
  c1_ist:   { id: "c1-ist",   nameEn: "Istora",                nameId: "Istora",                code: "C1-IST", lat: -6.3125, lon: 106.8410 },
  c1_sny:   { id: "c1-sny",   nameEn: "Senayan",               nameId: "Senayan",               code: "C1-SNY", lat: -6.3095, lon: 106.8340 },
  c1_asn:   { id: "c1-asn",   nameEn: "ASEAN",                 nameId: "ASEAN",                 code: "C1-ASN", lat: -6.3065, lon: 106.8270 },
  c1_hrm:   { id: "c1-hrm",   nameEn: "Harmoni",               nameId: "Harmoni",               code: "C1-HRM", lat: -6.1780, lon: 106.8230 },
  c1_kta:   { id: "c1-kta",   nameEn: "Kota",                  nameId: "Kota",                  code: "C1-KTA", lat: -6.1372, lon: 106.8147 },
  c1_ptj:   { id: "c1-ptj",   nameEn: "Petojo",                nameId: "Petojo",                code: "C1-PTJ", lat: -6.1660, lon: 106.8105 },
  c2_plg:   { id: "c2-plg",   nameEn: "Pulo Gadung",           nameId: "Pulo Gadung",           code: "C2-PLG", lat: -6.1870, lon: 106.9110 },
  c2_ppg:   { id: "c2-ppg",   nameEn: "Pasar Pulo Gadung",     nameId: "Pasar Pulo Gadung",     code: "C2-PPG", lat: -6.1885, lon: 106.9050 },
  c2_pmd:   { id: "c2-pmd",   nameEn: "Pemuda",                nameId: "Pemuda",                code: "C2-PMD", lat: -6.1880, lon: 106.8910 },
  c2_prk:   { id: "c2-prk",   nameEn: "Pramuka",               nameId: "Pramuka",               code: "C2-PRK", lat: -6.1930, lon: 106.8740 },
  c2_mtr:   { id: "c2-mtr",   nameEn: "Matraman",              nameId: "Matraman",              code: "C2-MTR", lat: -6.1950, lon: 106.8620 },
  c2_slb:   { id: "c2-slb",   nameEn: "Salemba",               nameId: "Salemba",               code: "C2-SLB", lat: -6.1940, lon: 106.8550 },
  c2_snn:   { id: "c2-snn",   nameEn: "Senen",                 nameId: "Senen",                 code: "C2-SNN", lat: -6.1760, lon: 106.8380 },
  c2_gmb:   { id: "c2-gmb",   nameEn: "Gambir",                nameId: "Gambir",                code: "C2-GMB", lat: -6.1770, lon: 106.8310 },
  c3_kld:   { id: "c3-kld",   nameEn: "Kalideres",             nameId: "Kalideres",             code: "C3-KLD", lat: -6.1540, lon: 106.6650 },
  c3_psg:   { id: "c3-psg",   nameEn: "Pesing",                nameId: "Pesing",                code: "C3-PSG", lat: -6.1660, lon: 106.6850 },
  c3_grg:   { id: "c3-grg",   nameEn: "Grogol",                nameId: "Grogol",                code: "C3-GRG", lat: -6.1660, lon: 106.7040 },
  c3_psb:   { id: "c3-psb",   nameEn: "Pasar Baru",            nameId: "Pasar Baru",            code: "C3-PSB", lat: -6.1660, lon: 106.8400 },
  c4_cpr:   { id: "c4-cpr",   nameEn: "Cempaka Putih",         nameId: "Cempaka Putih",         code: "C4-CPR", lat: -6.1840, lon: 106.8660 },
  c4_duc:   { id: "c4-duc",   nameEn: "Dukuh Atas",            nameId: "Dukuh Atas",            code: "C4-DUC", lat: -6.2210, lon: 106.8620 },
  c5_kmb:   { id: "c5-kmb",   nameEn: "Kampung Melayu",        nameId: "Kampung Melayu",        code: "C5-KMB", lat: -6.2240, lon: 106.8660 },
  c6_rgn:   { id: "c6-rgn",   nameEn: "Ragunan",               nameId: "Ragunan",               code: "C6-RGN", lat: -6.3110, lon: 106.8420 },
  c6_psm:   { id: "c6-psm",   nameEn: "Pasar Minggu",          nameId: "Pasar Minggu",          code: "C6-PSM", lat: -6.2860, lon: 106.8430 },
  c6_pcn:   { id: "c6-pcn",   nameEn: "Pancoran",              nameId: "Pancoran",              code: "C6-PCN", lat: -6.2580, lon: 106.8400 },
  c6_cwg:   { id: "c6-cwg",   nameEn: "Cawang",                nameId: "Cawang",                code: "C6-CWG", lat: -6.2460, lon: 106.8580 },
  c7_kmr:   { id: "c7-kmr",   nameEn: "Kampung Rambutan",      nameId: "Kampung Rambutan",      code: "C7-KMR", lat: -6.3070, lon: 106.8615 },
  c8_lbb:   { id: "c8-lbb",   nameEn: "Lebak Bulus",            nameId: "Lebak Bulus",            code: "C8-LBB", lat: -6.2885, lon: 106.7745 },
  c8_blk:   { id: "c8-blk",   nameEn: "Blok A",                nameId: "Blok A",                code: "C8-BLK", lat: -6.3005, lon: 106.8130 },
  c8_blm:   { id: "c8-blm",   nameEn: "Blok M",                nameId: "Blok M",                code: "C8-BLM", lat: -6.3037, lon: 106.8200 },
  c9_bnd:   { id: "c9-bnd",   nameEn: "Bendungan Hilir",       nameId: "Bendungan Hilir",       code: "C9-BND", lat: -6.3155, lon: 106.8480 },
  c9_cpr:   { id: "c9-cpr",   nameEn: "Cempaka Putih",         nameId: "Cempaka Putih",         code: "C9-CPR", lat: -6.1840, lon: 106.8660 },
  c11_kmb:  { id: "c11-kmb",  nameEn: "Kampung Melayu",        nameId: "Kampung Melayu",        code: "C11-KMB", lat: -6.2240, lon: 106.8660 },
  c13_cwg:  { id: "c13-cwg",  nameEn: "Cawang",                nameId: "Cawang",                code: "C13-CWG", lat: -6.2460, lon: 106.8580 },
  c13_tnb:  { id: "c13-tnb",  nameEn: "Tanah Abang",           nameId: "Tanah Abang",           code: "C13-TNB", lat: -6.1865, lon: 106.8115 },
}

const ROUTES: RouteSpec[] = [
  {
    id: "m1",
    nameEn: "Mikrotrans M1 (Blok M ↔ Monas)",
    nameId: "Mikrotrans M1 (Blok M ↔ Monas)",
    headsignAEn: "Monas", headsignAId: "Monas",
    headsignBEn: "Blok M", headsignBId: "Blok M",
    color: "#FB8C00",
    stops: [BRT.c8_blm, BRT.c1_blm, BRT.c1_mpr, BRT.c1_krd, BRT.c1_sdb, BRT.c1_hrm],
  },
  {
    id: "m2",
    nameEn: "Mikrotrans M2 (Kalideres ↔ Grogol)",
    nameId: "Mikrotrans M2 (Kalideres ↔ Grogol)",
    headsignAEn: "Grogol", headsignAId: "Grogol",
    headsignBEn: "Kalideres", headsignBId: "Kalideres",
    color: "#FB8C00",
    stops: [BRT.c3_kld, BRT.c3_psg, BRT.c3_grg],
  },
  {
    id: "m3",
    nameEn: "Mikrotrans M3 (Pulo Gadung ↔ Cakung)",
    nameId: "Mikrotrans M3 (Pulo Gadung ↔ Cakung)",
    headsignAEn: "Cakung", headsignAId: "Cakung",
    headsignBEn: "Pulo Gadung", headsignBId: "Pulo Gadung",
    color: "#FB8C00",
    stops: [BRT.c2_plg, BRT.c2_ppg, { id: "mk-ckg", nameEn: "Cakung", nameId: "Cakung", code: "MK-CKG", lat: -6.2010, lon: 106.9420 }],
  },
  {
    id: "m4",
    nameEn: "Mikrotrans M4 (Ragunan ↔ Cibubur)",
    nameId: "Mikrotrans M4 (Ragunan ↔ Cibubur)",
    headsignAEn: "Cibubur", headsignAId: "Cibubur",
    headsignBEn: "Ragunan", headsignBId: "Ragunan",
    color: "#FB8C00",
    stops: [BRT.c6_rgn, BRT.c7_kmr, { id: "mk-cbr", nameEn: "Cibubur Junction", nameId: "Cibubur Junction", code: "MK-CBR", lat: -6.3640, lon: 106.8860 }],
  },
  {
    id: "m5",
    nameEn: "Mikrotrans M5 (Pasar Minggu ↔ Depok)",
    nameId: "Mikrotrans M5 (Pasar Minggu ↔ Depok)",
    headsignAEn: "Depok", headsignAId: "Depok",
    headsignBEn: "Pasar Minggu", headsignBId: "Pasar Minggu",
    color: "#FB8C00",
    stops: [BRT.c6_psm, BRT.c7_kmr, { id: "mk-dpk", nameEn: "Depok", nameId: "Depok", code: "MK-DPK", lat: -6.4040, lon: 106.8190 }],
  },
  {
    id: "m6",
    nameEn: "Mikrotrans M6 (Tanah Abang ↔ Kebon Jeruk)",
    nameId: "Mikrotrans M6 (Tanah Abang ↔ Kebon Jeruk)",
    headsignAEn: "Kebon Jeruk", headsignAId: "Kebon Jeruk",
    headsignBEn: "Tanah Abang", headsignBId: "Tanah Abang",
    color: "#FB8C00",
    stops: [BRT.c13_tnb, BRT.c8_lbb, BRT.c8_blk, { id: "mk-kjr", nameEn: "Kebon Jeruk", nameId: "Kebon Jeruk", code: "MK-KJR", lat: -6.1940, lon: 106.7680 }],
  },
  {
    id: "m7",
    nameEn: "Mikrotrans M7 (Manggarai ↔ Condet)",
    nameId: "Mikrotrans M7 (Manggarai ↔ Condet)",
    headsignAEn: "Condet", headsignAId: "Condet",
    headsignBEn: "Manggarai", headsignBId: "Manggarai",
    color: "#FB8C00",
    stops: [BRT.c2_slb, BRT.c2_mtr, { id: "mk-cnd", nameEn: "Condet", nameId: "Condet", code: "MK-CND", lat: -6.2650, lon: 106.8710 }],
  },
  {
    id: "m8",
    nameEn: "Mikrotrans M8 (Kampung Melayu ↔ Pondok Gede)",
    nameId: "Mikrotrans M8 (Kampung Melayu ↔ Pondok Gede)",
    headsignAEn: "Pondok Gede", headsignAId: "Pondok Gede",
    headsignBEn: "Kampung Melayu", headsignBId: "Kampung Melayu",
    color: "#FB8C00",
    stops: [BRT.c11_kmb, BRT.c5_kmb, { id: "mk-pdg", nameEn: "Pondok Gede", nameId: "Pondok Gede", code: "MK-PDG", lat: -6.2920, lon: 106.9110 }],
  },
  {
    id: "m9",
    nameEn: "Mikrotrans M9 (Cawang ↔ UKI)",
    nameId: "Mikrotrans M9 (Cawang ↔ UKI)",
    headsignAEn: "UKI", headsignAId: "UKI",
    headsignBEn: "Cawang", headsignBId: "Cawang",
    color: "#FB8C00",
    stops: [BRT.c6_cwg, BRT.c13_cwg, { id: "mk-uki", nameEn: "UKI Cawang", nameId: "UKI Cawang", code: "MK-UKI", lat: -6.2620, lon: 106.8810 }],
  },
  {
    id: "m10",
    nameEn: "Mikrotrans M10 (Grogol ↔ Daan Mogot)",
    nameId: "Mikrotrans M10 (Grogol ↔ Daan Mogot)",
    headsignAEn: "Daan Mogot", headsignAId: "Daan Mogot",
    headsignBEn: "Grogol", headsignBId: "Grogol",
    color: "#FB8C00",
    stops: [BRT.c3_grg, BRT.c3_psg, { id: "mk-dmt", nameEn: "Daan Mogot", nameId: "Daan Mogot", code: "MK-DMT", lat: -6.1480, lon: 106.6850 }],
  },
  {
    id: "m11",
    nameEn: "Mikrotrans M11 (Pulo Gadung ↔ Pulomas)",
    nameId: "Mikrotrans M11 (Pulo Gadung ↔ Pulomas)",
    headsignAEn: "Pulomas", headsignAId: "Pulomas",
    headsignBEn: "Pulo Gadung", headsignBId: "Pulo Gadung",
    color: "#FB8C00",
    stops: [BRT.c2_plg, BRT.c2_pmd, { id: "mk-plm", nameEn: "Pulomas", nameId: "Pulomas", code: "MK-PLM", lat: -6.1900, lon: 106.8740 }],
  },
  {
    id: "m12",
    nameEn: "Mikrotrans M12 (Kalideres ↔ Cengkareng)",
    nameId: "Mikrotrans M12 (Kalideres ↔ Cengkareng)",
    headsignAEn: "Cengkareng", headsignAId: "Cengkareng",
    headsignBEn: "Kalideres", headsignBId: "Kalideres",
    color: "#FB8C00",
    stops: [BRT.c3_kld, { id: "mk-cgk", nameEn: "Cengkareng", nameId: "Cengkareng", code: "MK-CGK", lat: -6.1490, lon: 106.6540 }],
  },
  {
    id: "m13",
    nameEn: "Mikrotrans M13 (Cempaka Putih ↔ Cempaka Mas)",
    nameId: "Mikrotrans M13 (Cempaka Putih ↔ Cempaka Mas)",
    headsignAEn: "Cempaka Mas", headsignAId: "Cempaka Mas",
    headsignBEn: "Cempaka Putih", headsignBId: "Cempaka Putih",
    color: "#FB8C00",
    stops: [BRT.c4_cpr, BRT.c9_cpr, { id: "mk-cms", nameEn: "Cempaka Mas", nameId: "Cempaka Mas", code: "MK-CMS", lat: -6.1720, lon: 106.8730 }],
  },
  {
    id: "m14",
    nameEn: "Mikrotrans M14 (Gambir ↔ Kota)",
    nameId: "Mikrotrans M14 (Gambir ↔ Kota)",
    headsignAEn: "Kota", headsignAId: "Kota",
    headsignBEn: "Gambir", headsignBId: "Gambir",
    color: "#FB8C00",
    stops: [BRT.c2_gmb, BRT.c1_hrm, BRT.c1_ptj, BRT.c1_kta],
  },
  {
    id: "m15",
    nameEn: "Mikrotrans M15 (Bendungan Hilir ↔ Senopati)",
    nameId: "Mikrotrans M15 (Bendungan Hilir ↔ Senopati)",
    headsignAEn: "Senopati", headsignAId: "Senopati",
    headsignBEn: "Bendungan Hilir", headsignBId: "Bendungan Hilir",
    color: "#FB8C00",
    stops: [BRT.c1_bnd, BRT.c9_bnd, BRT.c1_ist, { id: "mk-snp", nameEn: "Senopati", nameId: "Senopati", code: "MK-SNP", lat: -6.2240, lon: 106.8300 }],
  },
  {
    id: "m16",
    nameEn: "Mikrotrans M16 (Ragunan ↔ Cibubur Junction)",
    nameId: "Mikrotrans M16 (Ragunan ↔ Cibubur Junction)",
    headsignAEn: "Cibubur Junction", headsignAId: "Cibubur Junction",
    headsignBEn: "Ragunan", headsignBId: "Ragunan",
    color: "#FB8C00",
    stops: [BRT.c6_rgn, BRT.c7_kmr, { id: "mk-cbj", nameEn: "Cibubur Junction", nameId: "Cibubur Junction", code: "MK-CBJ", lat: -6.3640, lon: 106.8860 }],
  },
  {
    id: "m17",
    nameEn: "Mikrotrans M17 (Harmoni ↔ Pasar Baru)",
    nameId: "Mikrotrans M17 (Harmoni ↔ Pasar Baru)",
    headsignAEn: "Pasar Baru", headsignAId: "Pasar Baru",
    headsignBEn: "Harmoni", headsignBId: "Harmoni",
    color: "#FB8C00",
    stops: [BRT.c1_hrm, BRT.c2_gmb, BRT.c2_snn, BRT.c3_psb],
  },
  {
    id: "m18",
    nameEn: "Mikrotrans M18 (Blok M ↔ Radio Dalam)",
    nameId: "Mikrotrans M18 (Blok M ↔ Radio Dalam)",
    headsignAEn: "Radio Dalam", headsignAId: "Radio Dalam",
    headsignBEn: "Blok M", headsignBId: "Blok M",
    color: "#FB8C00",
    stops: [BRT.c1_blm, BRT.c1_asn, BRT.c1_sny, { id: "mk-rdl", nameEn: "Radio Dalam", nameId: "Radio Dalam", code: "MK-RDL", lat: -6.2620, lon: 106.7990 }],
  },
  {
    id: "m19",
    nameEn: "Mikrotrans M19 (Cawang ↔ Salemba)",
    nameId: "Mikrotrans M19 (Cawang ↔ Salemba)",
    headsignAEn: "Salemba", headsignAId: "Salemba",
    headsignBEn: "Cawang", headsignBId: "Cawang",
    color: "#FB8C00",
    stops: [BRT.c6_cwg, BRT.c2_mtr, BRT.c2_slb],
  },
  {
    id: "m20",
    nameEn: "Mikrotrans M20 (Ragunan ↔ Pasar Minggu)",
    nameId: "Mikrotrans M20 (Ragunan ↔ Pasar Minggu)",
    headsignAEn: "Pasar Minggu", headsignAId: "Pasar Minggu",
    headsignBEn: "Ragunan", headsignBId: "Ragunan",
    color: "#FB8C00",
    stops: [BRT.c6_rgn, BRT.c7_kmr, BRT.c6_psm],
  },
  {
    id: "m21",
    nameEn: "Mikrotrans M21 (Pancoran ↔ Kalibata)",
    nameId: "Mikrotrans M21 (Pancoran ↔ Kalibata)",
    headsignAEn: "Kalibata", headsignAId: "Kalibata",
    headsignBEn: "Pancoran", headsignBId: "Pancoran",
    color: "#FB8C00",
    stops: [BRT.c6_pcn, { id: "mk-klb", nameEn: "Kalibata", nameId: "Kalibata", code: "MK-KLB", lat: -6.2620, lon: 106.8510 }],
  },
  {
    id: "m22",
    nameEn: "Mikrotrans M22 (Kampung Melayu ↔ Kramat Jati)",
    nameId: "Mikrotrans M22 (Kampung Melayu ↔ Kramat Jati)",
    headsignAEn: "Kramat Jati", headsignAId: "Kramat Jati",
    headsignBEn: "Kampung Melayu", headsignBId: "Kampung Melayu",
    color: "#FB8C00",
    stops: [BRT.c11_kmb, BRT.c5_kmb, { id: "mk-kj", nameEn: "Kramat Jati", nameId: "Kramat Jati", code: "MK-KJ", lat: -6.2560, lon: 106.8800 }],
  },
  {
    id: "m23",
    nameEn: "Mikrotrans M23 (Cawang ↔ Halim)",
    nameId: "Mikrotrans M23 (Cawang ↔ Halim)",
    headsignAEn: "Halim", headsignAId: "Halim",
    headsignBEn: "Cawang", headsignBId: "Cawang",
    color: "#FB8C00",
    stops: [BRT.c6_cwg, BRT.c13_cwg, { id: "mk-hlm", nameEn: "Halim", nameId: "Halim", code: "MK-HLM", lat: -6.2650, lon: 106.8910 }],
  },
  {
    id: "m24",
    nameEn: "Mikrotrans M24 (Dukuh Atas ↔ Bendungan Hilir)",
    nameId: "Mikrotrans M24 (Dukuh Atas ↔ Bendungan Hilir)",
    headsignAEn: "Bendungan Hilir", headsignAId: "Bendungan Hilir",
    headsignBEn: "Dukuh Atas", headsignBId: "Dukuh Atas",
    color: "#FB8C00",
    stops: [BRT.c4_duc, BRT.c1_sdb, BRT.c1_bnd, BRT.c9_bnd],
  },
  {
    id: "m25",
    nameEn: "Mikrotrans M25 (Tanah Abang ↔ Petamburan)",
    nameId: "Mikrotrans M25 (Tanah Abang ↔ Petamburan)",
    headsignAEn: "Petamburan", headsignAId: "Petamburan",
    headsignBEn: "Tanah Abang", headsignBId: "Tanah Abang",
    color: "#FB8C00",
    stops: [BRT.c13_tnb, { id: "mk-ptb", nameEn: "Petamburan", nameId: "Petamburan", code: "MK-PTB", lat: -6.1960, lon: 106.8090 }],
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
  // Collect every unique stop. Stops that share an id with a BRT
  // stop (e.g. "c1-blm") are written as-is — same id, same lat/lon.
  // Mikrotrans-only stops (e.g. "mk-ckg") are added fresh.
  const stopMap = new Map<string, StopSpec>()
  for (const r of ROUTES) {
    for (const s of r.stops) {
      if (!stopMap.has(s.id)) stopMap.set(s.id, s)
    }
  }
  const allStops = [...stopMap.values()]

  const routes: object[] = []
  const timetables: Record<string, Record<string, string[]>> = {}

  for (const r of ROUTES) {
    const forward = generateTimetable(r.stops, START, END)
    const reverse = generateTimetable([...r.stops].reverse(), START, END)

    const routeAId = `${r.id}.${r.headsignAEn.toLowerCase().replace(/\s+/g, "-")}`
    const routeBId = `${r.id}.${r.headsignBEn.toLowerCase().replace(/\s+/g, "-")}`

    timetables[routeAId] = {}
    timetables[routeBId] = {}
    for (const s of r.stops) {
      timetables[routeAId][s.id] = forward.get(s.id)!
      timetables[routeBId][s.id] = reverse.get(s.id)!
    }

    routes.push({
      id: routeAId,
      name: { en: `${r.nameEn} (→ ${r.headsignAEn})`, id: `${r.nameId} (Menuju ${r.headsignAId})` },
      headsign: { en: r.headsignAEn, id: r.headsignAId },
      color: r.color,
    })
    routes.push({
      id: routeBId,
      name: { en: `${r.nameEn} (→ ${r.headsignBEn})`, id: `${r.nameId} (Menuju ${r.headsignBId})` },
      headsign: { en: r.headsignBEn, id: r.headsignBId },
      color: r.color,
    })
  }

  const bundle = {
    mode: "transjakarta-mikrotrans",
    operator: "transjakarta",
    name: { en: "Transjakarta Mikrotrans", id: "Transjakarta Mikrotrans" },
    serviceHours: { start: START, end: END },
    stops: allStops.map((s) => ({
      id: s.id, name: { en: s.nameEn, id: s.nameId }, code: s.code,
      lat: s.lat, lon: s.lon,
    })),
    routes,
    timetables,
  }

  const outPath = resolve(__dirname, "../src/data/transjakarta-mikrotrans.json")
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8")
  console.log(`Wrote ${outPath}`)
  console.log(`  ${ROUTES.length} routes, ${allStops.length} stops, ${routes.length} route-directions`)
  const mikrotransOnlyStops = allStops.filter((s) => s.id.startsWith("mk-")).length
  const sharedBrtStops = allStops.length - mikrotransOnlyStops
  console.log(`  ${sharedBrtStops} stops shared with BRT, ${mikrotransOnlyStops} Mikrotrans-only stops`)
}

main()

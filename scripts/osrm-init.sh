#!/bin/sh
# Initialize the OSRM data directory and start the router.
#
# Steps:
#   1. Ensure curl or wget is available (install wget via apt-get
#      on first run if neither is in the image).
#   2. Download the Java OSM extract from Geofabrik (skipped on
#      subsequent starts; the .osm.pbf lives in the named volume).
#   3. Run osrm-extract / osrm-partition / osrm-customize on the
#      .osm.pbf (skipped on subsequent starts; the .osrm.* artifacts
#      live in the named volume).
#   4. exec osrm-routed so the server becomes PID 1 and receives
#      signals from docker stop / docker compose down.

set -eu

DATA_DIR=/data
PBF="$DATA_DIR/java-latest.osm.pbf"
OSRM_BASE="$DATA_DIR/java-latest.osrm"
PROFILE=/opt/foot.lua
# Geofabrik's Indonesia index does not publish a `jakarta-latest.osm.pbf`
# — Jakarta is part of the `java-latest.osm.pbf` extract (which also
# covers Bogor, Depok, Tangerang, Bekasi, the rest of the KRL
# network's reach). 853 MB; cached in the named volume.
PBF_URL="https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf"

log() { printf '[osrm-init] %s\n' "$*"; }
fail() { printf '[osrm-init] ERROR: %s\n' "$*" >&2; exit 1; }

# --- 1. ensure a downloader is present -----------------------------
if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
  log "No curl or wget found; installing wget via apt-get..."
  apt-get update -qq
  apt-get install -y -qq wget
fi

# --- 2. download the PBF (if not already cached) --------------------
if [ ! -f "$PBF" ]; then
  log "Downloading $PBF_URL"
  if command -v curl >/dev/null 2>&1; then
    curl -fL --retry 3 --retry-delay 5 -o "$PBF" "$PBF_URL"
  else
    wget --tries=3 --retry-connrefused -O "$PBF" "$PBF_URL"
  fi

  # Sanity check: a valid PBF starts with the bytes "\x00\x00\x00\x00"
  # (BlobHeader length = 0) or has a recognizable header. Geofabrik
  # returns an HTML 404 page when the URL is wrong; an empty file
  # means the download was interrupted. Either way, osrm-extract
  # will explode with "invalid BlobHeader size" — better to catch it
  # here with a clear message.
  if [ ! -s "$PBF" ]; then
    fail "$PBF is empty — download was interrupted"
  fi
  # The PBF magic is the first 4 bytes being 0x00000000 followed by
  # a non-empty BlobHeader. We just check the first byte: a real PBF
  # starts with NUL; HTML/XML/JSON all start with '<' or '{'/'['.
  firstbyte=$(head -c 1 "$PBF" | od -An -tx1 | tr -d ' ')
  if [ "$firstbyte" != "00" ]; then
    log "First 200 bytes of $PBF (likely not a PBF):"
    head -c 200 "$PBF" | sed 's/^/  /' >&2
    fail "$PBF does not look like a PBF (first byte: 0x$firstbyte)"
  fi
  size_mb=$(du -m "$PBF" | cut -f1)
  log "Downloaded $PBF (${size_mb} MB)"
fi

# --- 3. extract / partition / customize (if not already cached) -----
# `osrm-routed` complains if the .osrm base is missing any of its
# companion files, so check the partition/customize step via the
# .edges canary.
if [ ! -f "${OSRM_BASE}.edges" ]; then
  log "Extracting (foot profile) — first run, this can take a while..."
  osrm-extract -p "$PROFILE" "$PBF"
  log "Partitioning..."
  osrm-partition "$OSRM_BASE"
  log "Customizing..."
  osrm-customize "$OSRM_BASE"
  log "Preprocessing complete"
fi

# --- 4. start the router (replaces the shell with osrm-routed) ------
log "Starting OSRM router on :5000 (mld, $(du -h "$PBF" | cut -f1) source)"
exec osrm-routed --algorithm mld "$OSRM_BASE"

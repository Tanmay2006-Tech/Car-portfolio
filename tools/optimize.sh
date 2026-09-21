#!/usr/bin/env bash
# tools/optimize.sh
#
# Runs the gltf-transform chain: dedup, prune, weld, a per-role texture
# resize pass, WebP conversion, meshopt. Desktop reads raw/porsche-split.glb;
# mobile reads raw/porsche-split-mobile.glb, the interior-stripped source
# prepare-model.mjs also writes (mobile never shows the cabin — CLAUDE.md
# section 7 — so ~44% of the triangles in the shared source are dead weight
# there). Produces public/models/porsche-desktop.glb and porsche-mobile.glb,
# then generates a typed R3F component with gltfjsx.
#
# KTX-Software (needed for the KTX2/uastc GPU-texture path CLAUDE.md section
# 3 describes) isn't installed on this machine and is a native binary, not
# an npm package — so this hits the <=8MB / <=3MB file-size budget a
# different way: WebP instead of PNG/JPEG (uses `sharp`, a real npm
# dependency, no external binary), plus resizing each texture by its role
# instead of one global cap, since occlusion/metallicRoughness data holds up
# fine much smaller than a normal or baseColor map does. This does NOT close
# the GPU-VRAM gap — WebP still decodes to full uncompressed RGBA on the
# GPU, same as PNG — only KTX2 fixes that. See the estimated-VRAM section
# printed at the end.
#
# Run with: bash tools/optimize.sh

set -euo pipefail

SRC_DESKTOP="raw/porsche-split.glb"
SRC_MOBILE="raw/porsche-split-mobile.glb"
OUT_DIR="public/models"
COMPONENT_OUT="src/components/Porsche.tsx"

for src in "$SRC_DESKTOP" "$SRC_MOBILE"; do
  if [ ! -f "$src" ]; then
    echo "Missing $src — run 'node tools/prepare-model.mjs' first." >&2
    exit 1
  fi
done

mkdir -p "$OUT_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

GT=(npx --yes @gltf-transform/cli)

# Resize never increases a texture past its original size, so applying the
# broad role-based rule first and a narrower per-texture override after is
# safe regardless of order — the override just wins because it's smaller.
resize_by_role() {
  local in="$1" out="$2" label="$3"; shift 3
  local current="$in" i=0
  for rule in "$@"; do
    local pattern="${rule%%:*}" size="${rule##*:}"
    i=$((i + 1))
    local next="$TMP_DIR/${label}_resize_${i}.glb"
    echo "  [resize $pattern -> ${size}px]"
    "${GT[@]}" resize --pattern "$pattern" --width "$size" --height "$size" "$current" "$next"
    current="$next"
  done
  cp "$current" "$out"
}

run_chain() {
  local label="$1" src="$2" out="$3"; shift 3
  local a="$TMP_DIR/${label}_1.glb" b="$TMP_DIR/${label}_2.glb" c="$TMP_DIR/${label}_3.glb"
  local resized="$TMP_DIR/${label}_resized.glb" webp="$TMP_DIR/${label}_webp.glb"

  echo "--- $label chain (source: $src) ---"
  echo "[dedup]"
  "${GT[@]}" dedup "$src" "$a"
  echo "[prune]"
  "${GT[@]}" prune "$a" "$b"
  echo "[weld]"
  "${GT[@]}" weld "$b" "$c"

  echo "[resize by role]"
  resize_by_role "$c" "$resized" "$label" "$@"

  echo "[webp]"
  "${GT[@]}" webp "$resized" "$webp"

  echo "[meshopt]"
  # --quantize-normal: the CLI's own default is 10 bits, not the 8 that
  # would visibly facet a curved, clearcoat-glossy panel like body_main
  # (checked directly — rendered raw/porsche-split.glb against a build off
  # this chain at the same angle; a pixel diff showed the difference was
  # sub-perceptual, consistent with 10 bits already being adequate). Raised
  # to 12 here anyway, the top of CLAUDE.md section 3's own "10-12" range,
  # as cheap insurance: a couple of extra bits per vertex on ~250k exterior
  # triangles is negligible against the file-size budget, and it rules out
  # quantization as a cause of any future banding report without having to
  # re-diagnose it.
  "${GT[@]}" meshopt --quantize-normal 12 "$webp" "$out"
  echo "-> $out"
  echo
}

# Desktop: occlusion/metallicRoughness (packed into one ORM texture in this
# file, so one rule covers both) hold up at 512; normal maps need 1024;
# baseColor at 1024 except the near-flat ones CLAUDE.md section 3 calls out
# by exact size (leather_int_baseColor 12.6KB, number_plate1_baseColor
# 18KB at 1024 — both compress to noise, so there's no detail to lose going
# smaller). Then the named per-mesh cuts: belts (2,932 tris) and
# hedlights_grid (80 tris) are far too small on screen to carry a full-size
# normal map; Discs sit mostly hidden behind the rims.
#
# rim_black/rim_chrome/tires/LOGO1 are named OUT of the two broad rules
# below rather than resized down with everything else: the desktop GLB sits
# at 4.77MB of an 8MB budget (verified with tools/count-triangles.mjs and
# a real build), and these four are exactly the textures on the parts a
# visitor's eye actually lands on — the wheels spin in frame for the whole
# site, the tyre sidewall is close to camera on the low-camera GridSense
# leg (section 1's leg 4), and the badge is the one piece of brand detail
# on an otherwise flat-coloured body. Spending the spare ~3MB there (their
# ORIGINAL resolution: rim_black/rim_chrome/LOGO1 metallicRoughness at
# 1024, tires_normal at 2048) buys more visible crispness per byte than
# shaving already-small textures (rug, leather seam, etc.) further down
# would ever cost. resize never upscales past a texture's real resolution,
# so naming them here just means "skip this rule for these" — the CLI
# leaves them at whatever they already are.
run_chain "desktop" "$SRC_DESKTOP" "$OUT_DIR/porsche-desktop.glb" \
  "{reisin,bl_pl_M_ext,carbon_int,body_main,brakes,invisible_all,pipes_chrom,pl_leather_int,dynamics,upholstery,belts,rug_interior,leather_int,leather_seam,leather_perforated,bl_pl_M_int}*metallicRoughness*:512" \
  "{headlights_pattern,reflectors,pl_leather_int,dynamics,upholstery,LOGO1,belts,hedlights_grid,headlights_plastic_ring,rug_interior,leather_seam,leather_perforated}*normal*:1024" \
  "*baseColor*:1024" \
  "*leather_int_baseColor*:256" \
  "*number_plate1_baseColor*:256" \
  "*belts_normal*:512" \
  "*hedlights_grid_normal*:256" \
  "*Discs_baseColor*:512"

# Mobile: interior-stripped source (see header), same role split, every
# resize number halved.
run_chain "mobile" "$SRC_MOBILE" "$OUT_DIR/porsche-mobile.glb" \
  "*metallicRoughness*:256" \
  "*normal*:512" \
  "*baseColor*:512" \
  "*leather_int_baseColor*:128" \
  "*number_plate1_baseColor*:128" \
  "*belts_normal*:256" \
  "*hedlights_grid_normal*:128" \
  "*Discs_baseColor*:256"

size_mb() {
  local bytes
  bytes=$(stat -c%s "$1" 2>/dev/null || stat -f%z "$1")
  awk -v b="$bytes" 'BEGIN { printf "%.2f", b / (1024*1024) }'
}

echo "=== File sizes ==="
echo "raw/porsche-split.glb (desktop input):        $(size_mb "$SRC_DESKTOP") MB"
echo "raw/porsche-split-mobile.glb (mobile input):  $(size_mb "$SRC_MOBILE") MB"
echo "public/models/porsche-desktop.glb:  $(size_mb "$OUT_DIR/porsche-desktop.glb") MB  (budget: <= 8 MB)"
echo "public/models/porsche-mobile.glb:   $(size_mb "$OUT_DIR/porsche-mobile.glb") MB  (budget: <= 3 MB)"
echo

echo "=== Triangle counts ==="
node tools/count-triangles.mjs "$OUT_DIR/porsche-desktop.glb"
node tools/count-triangles.mjs "$OUT_DIR/porsche-mobile.glb"
echo

echo "=== Estimated GPU texture memory ==="
echo "-- desktop --"
node tools/estimate-vram.mjs "$OUT_DIR/porsche-desktop.glb"
echo
echo "-- mobile --"
node tools/estimate-vram.mjs "$OUT_DIR/porsche-mobile.glb"
echo

echo "=== gltfjsx ==="
# CLAUDE.md section 3 says "-t -T", but -T runs gltfjsx's own separate
# draco/prune/resize pass on top of the model we already optimised above —
# and empirically, that pass flattens every group node, including
# wheel_FL/FR/RL/RR, door_1 and door_2. Those groups are the entire point
# of prepare-model.mjs (rotate one node to spin a wheel, one node to swing
# a door); losing them would silently break section 5. So this runs without
# -T against our already-optimised porsche-desktop.glb instead, with -K to
# make gltfjsx keep group nodes rather than pruning them. Verified against
# the actual output: wheel_FL etc. come through as proper <group> wrappers.
mkdir -p "$(dirname "$COMPONENT_OUT")"
# -r public tells gltfjsx the model is served from public/, so the
# generated useGLTF() call resolves to /models/porsche-desktop.glb instead
# of a bare /porsche-desktop.glb that Vite would 404 on.
npx --yes gltfjsx "$OUT_DIR/porsche-desktop.glb" -t -K -r public -o "$COMPONENT_OUT"

# gltfjsx@6.5.3 has two TS issues on a model with no animations (ours has
# none — confirmed in CLAUDE.md section 3): it imports React unused (the
# react-jsx runtime doesn't need it), and references a GLTFAction type it
# never defines when the animations array is empty. Patch both so `tsc`
# passes; re-running this script regenerates the file, so the patch has to
# be re-applied here rather than by hand.
sed -i "/^import React from 'react'$/d" "$COMPONENT_OUT"
sed -i 's/animations: GLTFAction\[\]/animations: THREE.AnimationClip[]/' "$COMPONENT_OUT"

echo "-> $COMPONENT_OUT"

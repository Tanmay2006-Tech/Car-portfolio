import * as THREE from 'three'

// CLAUDE.md section 2 tokens that reach three.js. Every one of these is an
// sRGB hex string, but glTF baseColorFactor and THREE.Color's internal
// working space are LINEAR — feeding a raw hex to a Color without an
// explicit sRGB->linear conversion renders about one gamma step too bright
// (this is exactly how the car ended up hot pink: the paint hex reached
// baseColorFactor unconverted). `srgb()` is the one place that conversion
// happens, so nothing downstream can skip it by accident.
export const GUARDS = '#d0111b'; // Guards Red — the car's paint, and one CTA. Nothing else.
export const DAWN_HIGH = '#a9bfd6'; // cool pale blue — sky overhead, still holding night
export const DAWN_LOW = '#f7dcc2'; // warm apricot — horizon, low sun
export const ASPHALT = '#3d3c4c'; // slate — the road ribbon, dark so the risk layer and lane paint glow on it
export const VERGE = '#36544f'; // deep teal field before sunrise
export const INK = '#2b2733'; // deep plum-black — all text, never pure black

export function srgb(hex: string): THREE.Color {
  return new THREE.Color().setStyle(hex, THREE.SRGBColorSpace);
}

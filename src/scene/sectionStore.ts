import { create } from 'zustand'

// CLAUDE.md section 5: "Push the section index into Zustand only when it
// changes — that's the one thing React needs." Written by ScrollSetup,
// read by anything that mounts or unmounts per leg (the lazy risk layer,
// the telemetry gauge, the contact panel).
//
//   -2 hero, -1 cold start, 0-5 route legs (LEG_START), 6 = cabin reached
interface SectionState {
  section: number
  set: (section: number) => void
}

export const useSection = create<SectionState>((set) => ({
  section: -2,
  set: (section) => set((s) => (s.section === section ? s : { section })),
}))

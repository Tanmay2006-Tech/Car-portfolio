import { create } from 'zustand'

// Whether the car is currently parked (leg 0 or leg 5 — CLAUDE.md section
// 1's route map: "the car is stationary only at leg 0 and leg 5"). App.tsx
// reads this to spend extra render quality (full DPR, real multisampling,
// AdaptiveDpr's own downgrade disabled) while there's nothing moving to pay
// a frame-time cost for, and back off the instant scroll starts driving.
//
// A zustand store, not a plain mutable object like scrollState.ts/carPose.ts:
// this value is read OUTSIDE the Canvas (App.tsx sets Canvas/EffectComposer
// props from it), where there's no useFrame to poll a mutable object every
// frame — it needs a real subscription. CLAUDE.md section 4 names zustand
// for exactly this: "push into Zustand only when it changes... the one
// thing React needs."
interface QualityState {
  isStationary: boolean
  setStationary: (value: boolean) => void
}

export const useQuality = create<QualityState>((set) => ({
  isStationary: true, // matches scroll.progress's own initial 0 — leg 0, before any scroll
  setStationary: (value) =>
    set((state) => (state.isStationary === value ? state : { isStationary: value })),
}))

import { useSyncExternalStore } from "react";

export type SimState = {
  thermal: boolean;
  wiring: boolean;
  diesel: boolean;
};

let state: SimState = { thermal: false, wiring: false, diesel: false };
const listeners = new Set<() => void>();

export const simStore = {
  get: () => state,
  set: (patch: Partial<SimState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  toggle: (key: keyof SimState) => simStore.set({ [key]: !state[key] } as Partial<SimState>),
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useSim(): SimState {
  return useSyncExternalStore(simStore.subscribe, simStore.get, simStore.get);
}

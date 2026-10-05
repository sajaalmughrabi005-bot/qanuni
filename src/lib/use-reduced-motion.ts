"use client";
import { useSyncExternalStore } from "react";
const media=()=>window.matchMedia("(prefers-reduced-motion: reduce)");
const subscribe=(callback:()=>void)=>{const query=media();query.addEventListener("change",callback);return()=>query.removeEventListener("change",callback);};
const snapshot=()=>media().matches;
// Conservative server snapshot avoids motion before preference hydration.
const serverSnapshot=()=>true;
export function useReducedMotion(){return useSyncExternalStore(subscribe,snapshot,serverSnapshot);}

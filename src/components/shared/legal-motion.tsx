"use client";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Scale, FileText } from "lucide-react";
export function LegalMotion({processing=false}:{processing?:boolean}) {
 const reduced=useReducedMotion();
 return <div aria-hidden="true" data-legal-motion={reduced?"reduced":"active"} className="relative mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-gold/30 bg-gold/5 text-gold">
  <motion.div animate={reduced?undefined:{rotate:processing?[-2,2,-2]:[-1,1,-1]}} transition={{duration:5,repeat:Infinity,ease:"easeInOut"}}><Scale className="h-10 w-10"/></motion.div>
  {processing&&<><FileText className="absolute end-1 bottom-1 h-5 w-5"/><motion.div className="absolute inset-x-2 h-px bg-gold/60" initial={{top:12}} animate={reduced?undefined:{top:[12,66,12]}} transition={{duration:4,repeat:Infinity,ease:"easeInOut"}}/></>}
 </div>;
}

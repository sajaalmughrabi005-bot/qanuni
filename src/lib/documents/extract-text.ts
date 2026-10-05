"use server";
import { headers } from "next/headers";
import { getProfessionalAccessContext } from "@/lib/auth/access";
import { consumeRateLimit, privateRateKey } from "@/lib/ai/limits";
import { ingestFile, ingestionFailure, type IngestResult } from "./ingestion";
export async function extractTextFromFileAction(formData:FormData):Promise<IngestResult> {
 const access=await getProfessionalAccessContext();
 if(access.level==="none"||!access.id||!access.role||!["citizen","lawyer"].includes(access.role)) throw new Error("unauthenticated");
 consumeRateLimit(`extract:${access.level}:${access.id}`,access.level==="demo"?6:12);
 if(access.level==="demo") {
  consumeRateLimit("demo-extract:worker",12);
  const h=await headers();consumeRateLimit(`extract-ip:${privateRateKey(h.get("x-forwarded-for")?.split(",")[0]?.trim()||"local")}`,12);
 }
 const file=formData.get("file");
 if(!(file instanceof File)) return ingestionFailure("unsupported_type");
 return ingestFile(file);
}

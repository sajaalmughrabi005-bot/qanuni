"use server";
import { getAccessContext } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateFileBytes, validateFileMetadata } from "./validation";
import { consumeRateLimit } from "@/lib/ai/limits";
import { z } from "zod";
import { createHash } from "node:crypto";
import { operationFailure } from "../data/operation-failure";
type FileResult={ok:true}|{ok:false;error:string};
async function caller() {
 const access=await getAccessContext();
 if(access.level!=="real"||!access.id||!["citizen","lawyer"].includes(access.role||"")) throw new Error("not_allowed");
 return {id:access.id,role:access.role,supabase:(await createSupabaseServerClient())!};
}
async function checkedFile(form:FormData) {
 const file=form.get("file");if(!(file instanceof File)) throw new Error("file_type_not_allowed");
 const metadata=validateFileMetadata(file);const bytes=Buffer.from(await file.arrayBuffer());validateFileBytes(bytes,metadata.ext);return {file,bytes,metadata};
}
export async function createCitizenDocumentAction(input:unknown):Promise<{ok:true;id:string}|{ok:false;error:string}> {
 try {
  const value=z.object({id:z.uuid(),fileName:z.string().min(1).max(255),documentType:z.enum(["rental","employment","service","sale","general"]),language:z.enum(["ar","en"]),citizenDescription:z.string().min(1).max(240000)}).parse(input);
  const {id,role,supabase}=await caller();if(role!=="citizen")return {ok:false,error:"not_allowed"};
  consumeRateLimit(`document-create:${id}`,20);
  const previous=await supabase.from("documents").select("id,user_id,file_name,citizen_description").eq("id",value.id).maybeSingle();
  if(previous.error)return {ok:false,error:operationFailure(previous.error,"document_read_failed")};
  if(previous.data)return previous.data.user_id===id&&previous.data.file_name===value.fileName&&previous.data.citizen_description===value.citizenDescription?{ok:true,id:value.id}:{ok:false,error:"submission_changed"};
  const saved=await supabase.from("documents").insert({id:value.id,user_id:id,file_name:value.fileName,document_type:value.documentType,language:value.language,citizen_description:value.citizenDescription,status:"processing"});
  if(saved.error)return {ok:false,error:operationFailure(saved.error,"document_save_failed")};return {ok:true,id:value.id};
 }catch{return {ok:false,error:"document_save_failed"};}
}
export async function storeCitizenSourceAction(documentId:string,form:FormData):Promise<FileResult> {
 try {
  const {id,role,supabase}=await caller();if(role!=="citizen") return {ok:false,error:"not_allowed"};
  consumeRateLimit(`source-upload:${id}`,12);
  const {data:doc,error:readError}=await supabase.from("documents").select("id,original_storage_path").eq("id",documentId).eq("user_id",id).single();
  if(readError||!doc) return {ok:false,error:operationFailure(readError,"forbidden")};
  const {bytes,metadata}=await checkedFile(form);
  const digest=createHash("sha256").update(bytes).digest("hex");
  const path=`${id}/${documentId}/${digest}.${metadata.ext}`;
  if(doc.original_storage_path) {
   const existing=await supabase.storage.from("citizen-documents").download(doc.original_storage_path);
   if(existing.error||!existing.data)return {ok:false,error:"source_read_failed"};
   if(existing.data.size!==metadata.size)return {ok:false,error:"submission_changed"};
   const existingHash=createHash("sha256").update(Buffer.from(await existing.data.arrayBuffer())).digest("hex");
   return existingHash===digest?{ok:true}:{ok:false,error:"submission_changed"};
  }
  const {error:uploadError}=await supabase.storage.from("citizen-documents").upload(path,bytes,{contentType:metadata.mime,upsert:false});
  if(uploadError) {
   // A retry can meet bytes whose original upload response was lost. Never overwrite them.
   const status=String((uploadError as {statusCode?:string|number;status?:number}).statusCode||(uploadError as {status?:number}).status||"");
   if(!["409","400"].includes(status))return {ok:false,error:"upload_failed"};
   const existing=await supabase.storage.from("citizen-documents").download(path);
   if(existing.error||!existing.data||existing.data.size!==metadata.size)return {ok:false,error:"upload_failed"};
   const existingHash=createHash("sha256").update(Buffer.from(await existing.data.arrayBuffer())).digest("hex");
   if(existingHash!==digest)return {ok:false,error:"source_bytes_mismatch"};
  }
  const {data:saved,error}=await supabase.from("documents").update({original_storage_path:path,original_mime_type:metadata.mime,original_size_bytes:metadata.size}).eq("id",documentId).eq("user_id",id).is("original_storage_path",null).select("id").maybeSingle();
  if(error) {
   const confirmed=await supabase.from("documents").select("original_storage_path").eq("id",documentId).eq("user_id",id).single();
   if(!confirmed.error&&confirmed.data?.original_storage_path===path)return {ok:true};
   // The write may still have committed. Retain bytes for a safe retry/reconciliation.
   return {ok:false,error:operationFailure(error,"source_metadata_uncertain")};
  }
  if(!saved) {
   const retry=await supabase.from("documents").select("original_storage_path").eq("id",documentId).eq("user_id",id).single();
   if(retry.error)return {ok:false,error:"source_metadata_uncertain"};
   if(retry.data?.original_storage_path===path)return {ok:true};
   if(!retry.data?.original_storage_path)return {ok:false,error:"source_metadata_uncertain"};
   const cleanup=await supabase.storage.from("citizen-documents").remove([path]);
   if(cleanup.error) return {ok:false,error:"upload_cleanup_failed"};
   const current=await supabase.storage.from("citizen-documents").download(retry.data.original_storage_path);
   if(current.error||!current.data)return {ok:false,error:"source_read_failed"};
   const currentHash=createHash("sha256").update(Buffer.from(await current.data.arrayBuffer())).digest("hex");
   return currentHash===digest?{ok:true}:{ok:false,error:"submission_changed"};
  }
  return {ok:true};
 } catch {return {ok:false,error:"file_validation_or_upload_failed"};}
}
export async function getCitizenSourceUrlAction(documentId:string):Promise<string|null> {
 try {const {supabase}=await caller();const {data,error}=await supabase.from("documents").select("original_storage_path").eq("id",documentId).single();if(error||!data?.original_storage_path)return null;
 const result=await supabase.storage.from("citizen-documents").createSignedUrl(data.original_storage_path,60);return result.data?.signedUrl||null;
 }catch{return null;}
}
export async function uploadCaseFileAction(caseId:string,form:FormData):Promise<FileResult> {
 try {
  const {id,supabase}=await caller();consumeRateLimit(`case-upload:${id}`,12);
  const {data:record,error:readError}=await supabase.from("cases").select("id").eq("id",caseId).single();if(readError||!record)return {ok:false,error:"forbidden"};
  const {bytes,metadata}=await checkedFile(form),path=`${caseId}/${crypto.randomUUID()}.${metadata.ext}`;
  const {error:uploadError}=await supabase.storage.from("case-documents").upload(path,bytes,{contentType:metadata.mime,upsert:false});if(uploadError)return {ok:false,error:"upload_failed"};
  const {error}=await supabase.from("case_documents").insert({case_id:caseId,file_name:metadata.name,storage_path:path,mime_type:metadata.mime,size_bytes:metadata.size});
  if(error)return {ok:false,error:"upload_metadata_uncertain"}; // Preserve bytes: insert may have committed.
  return {ok:true};
 }catch{return {ok:false,error:"file_validation_or_upload_failed"};}
}
export async function deletePrivateDocumentAction(documentId:string):Promise<FileResult> {
 try {const {id,supabase}=await caller();const {data,error:readError}=await supabase.from("documents").select("original_storage_path").eq("id",documentId).eq("user_id",id).single();if(readError||!data)return {ok:false,error:"forbidden"};
 if(data.original_storage_path){const result=await supabase.storage.from("citizen-documents").remove([data.original_storage_path]);if(result.error)return {ok:false,error:"storage_delete_failed"};}
 const {error}=await supabase.from("documents").delete().eq("id",documentId).eq("user_id",id);return error?{ok:false,error:"document_delete_failed"}:{ok:true};
 }catch{return {ok:false,error:"document_delete_failed"};}
}
export async function deleteCaseFileAction(documentId:string):Promise<FileResult> {
 try {const {id,supabase}=await caller();const {data,error:readError}=await supabase.from("case_documents").select("storage_path").eq("id",documentId).eq("uploaded_by",id).single();if(readError||!data)return {ok:false,error:"forbidden"};
 const storage=await supabase.storage.from("case-documents").remove([data.storage_path]);if(storage.error)return {ok:false,error:"storage_delete_failed"};
 const {error}=await supabase.from("case_documents").delete().eq("id",documentId).eq("uploaded_by",id);return error?{ok:false,error:"document_delete_failed"}:{ok:true};
 }catch{return {ok:false,error:"document_delete_failed"};}
}

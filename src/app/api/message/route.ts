import {NextResponse} from "next/server";
import { withCors, corsOptions } from "@/lib/cors";
import {admin} from "@/lib/supabase-admin";
import {bodyJson,fail,sha256} from "@/lib/http";
import {geminiReply} from "@/lib/gemini";
async function handlePost(req:Request){
 const b=await bodyJson(req);const id=String(b.session_id||""),message=String(b.message||"").trim(),token=req.headers.get("authorization")?.replace(/^Bearer /i,"")||"";
 if(!id||!token||!message||message.length>5000)return fail("Sesi, token, dan pesan wajib diisi.",422);
 const {data:s}=await admin.from("chat_sessions").select("id,website_id,ai_active,session_secret_hash").eq("id",id).single();
 if(!s||s.session_secret_hash!==await sha256(token))return fail("Sesi tidak valid.",403);
 const {error:me}=await admin.from("messages").insert({session_id:id,sender_type:"visitor",body:message});
 if(me)return fail("Pesan gagal disimpan.",500);
 await admin.from("chat_sessions").update({last_message_at:new Date().toISOString()}).eq("id",id);
 let reply:string|null=null;
 if(s.ai_active){
  const {data:agents}=await admin.from("ai_agents").select("system_prompt,model").eq("website_id",s.website_id).eq("enabled",true).limit(1);
  if(agents?.[0]){
   const {data:history}=await admin.from("messages").select("sender_type,body").eq("session_id",id).order("created_at",{ascending:true}).limit(12);
   try{reply=await geminiReply(agents[0].system_prompt,history||[],message,agents[0].model);await admin.from("messages").insert({session_id:id,sender_type:"ai",body:reply});}
   catch(e){console.error("Gemini error",e);}
  }
 }
 return NextResponse.json({ok:true,reply});
}

export async function POST(req: Request) {
  return withCors(req, await handlePost(req));
}

export async function OPTIONS(req: Request) {
  return corsOptions(req);
}
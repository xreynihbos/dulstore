import {NextResponse} from "next/server";
import {admin} from "@/lib/supabase-admin";
import {bodyJson,fail,randomToken,sha256} from "@/lib/http";
export async function POST(req:Request){
 const b=await bodyJson(req);if(!b.site_key)return fail("site_key wajib diisi.");
 const {data:site,error}=await admin.from("websites").select("id,allowed_domains,enabled").eq("site_key",b.site_key).single();
 if(error||!site||!site.enabled)return fail("Website key tidak valid.",403);
 const origin=req.headers.get("origin")||"";const host=(()=>{try{return new URL(origin).hostname}catch{return ""}})();
 const allowed=(site.allowed_domains||[]).map((x:string)=>x.replace(/^https?:\/\//,"").split("/")[0]);
 if(allowed.length && !allowed.includes(host))return fail("Origin website tidak diizinkan.",403);
 const {data:visitor,error:ve}=await admin.from("visitors").insert({website_id:site.id,name:String(b.name||"Visitor").slice(0,100),email:String(b.email||"").slice(0,180)||null}).select("id").single();
 if(ve||!visitor)return fail("Tidak dapat membuat visitor.",500);
 const token=randomToken(),hash=await sha256(token);
 const {data:session,error:se}=await admin.from("chat_sessions").insert({website_id:site.id,visitor_id:visitor.id,session_secret_hash:hash,channel:"website",ai_active:true}).select("id,status,created_at").single();
 if(se||!session)return fail("Tidak dapat membuat sesi.",500);
 return NextResponse.json({ok:true,session,token});
}

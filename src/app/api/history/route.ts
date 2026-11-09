import {NextResponse} from "next/server";
import {admin} from "@/lib/supabase-admin";
import {fail,sha256} from "@/lib/http";
export async function GET(req:Request){
 const u=new URL(req.url),id=u.searchParams.get("session_id")||"",token=req.headers.get("authorization")?.replace(/^Bearer /i,"")||"";
 if(!id||!token)return fail("Sesi dan token wajib diisi.",422);
 const {data:s}=await admin.from("chat_sessions").select("session_secret_hash").eq("id",id).single();
 if(!s||s.session_secret_hash!==await sha256(token))return fail("Sesi tidak valid.",403);
 const {data,error}=await admin.from("messages").select("id,sender_type,body,created_at").eq("session_id",id).order("created_at");
 if(error)return fail("Gagal mengambil riwayat.",500);
 return NextResponse.json({ok:true,messages:data});
}

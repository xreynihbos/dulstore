import { NextResponse } from "next/server";
export function fail(message:string,status=400){return NextResponse.json({ok:false,error:message},{status});}
export async function bodyJson(req:Request){try{return await req.json()}catch{return {}}}
export function randomToken(){const b=crypto.getRandomValues(new Uint8Array(32));return [...b].map(x=>x.toString(16).padStart(2,"0")).join("");}
export async function sha256(value:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("");}

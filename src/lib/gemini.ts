export async function geminiReply(systemPrompt:string, history:{sender_type:string;body:string}[], message:string, model:string){
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error("Gemini API key belum dikonfigurasi.");
 const contents=[...history.slice(-12).map(x=>({role:x.sender_type==="ai"?"model":"user",parts:[{text:x.body}]})),{role:"user",parts:[{text:message}]}];
 const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model||process.env.GEMINI_MODEL||"gemini-2.5-flash")}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:systemPrompt}]},contents,generationConfig:{temperature:.35,maxOutputTokens:700}}),cache:"no-store"});
 const data=await res.json();if(!res.ok)throw new Error(data?.error?.message||"Gemini API error");
 return data?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||"").join("").trim()||"Maaf, saya belum bisa menjawab. Saya akan bantu hubungkan dengan tim kami.";
}

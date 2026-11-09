
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";
import { bodyJson, fail, sha256 } from "@/lib/http";
import { withCors, corsOptions } from "@/lib/cors";
import { geminiReply } from "@/lib/gemini";

export const runtime = "nodejs";

const BUCKET = "chat-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, "image" | "audio"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "audio/webm": "audio",
  "audio/ogg": "audio",
  "audio/mp4": "audio",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio"
};

type Attachment = {
  path: string;
  name: string;
  type: "image" | "audio";
  mime_type: string;
  size: number;
};

async function handlePost(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  const token =
    req.headers.get("authorization")?.replace(/^Bearer /i, "") || "";

  if (!token) {
    return fail("Token sesi wajib diisi.", 422);
  }

  let sessionId = "";
  let message = "";
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();

    sessionId = String(form.get("session_id") || "");
    message = String(form.get("message") || "").trim();

    const uploaded = form.get("file");
    if (uploaded instanceof File && uploaded.size > 0) {
      file = uploaded;
    }
  } else {
    const body = await bodyJson(req);
    sessionId = String(body.session_id || "");
    message = String(body.message || "").trim();
  }

  if (!sessionId || (!message && !file)) {
    return fail("Sesi dan pesan atau lampiran wajib diisi.", 422);
  }

  if (message.length > 5000) {
    return fail("Pesan maksimal 5000 karakter.", 422);
  }

  const { data: session, error: sessionError } = await admin
    .from("chat_sessions")
    .select("id, website_id, ai_active, session_secret_hash")
    .eq("id", sessionId)
    .maybeSingle();

  if (
    sessionError ||
    !session ||
    session.session_secret_hash !== await sha256(token)
  ) {
    return fail("Sesi tidak valid.", 403);
  }

  const attachments: Attachment[] = [];

  if (file) {
    const mime = file.type.toLowerCase();
    const attachmentType = ALLOWED_TYPES[mime];

    if (!attachmentType) {
      return fail("Format file tidak didukung.", 415);
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail("Ukuran file maksimal 10 MB.", 413);
    }

    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-100) || "attachment";

    const path = [
      session.website_id,
      session.id,
      `${Date.now()}-${safeName}`
    ].join("/");

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: mime,
        upsert: false
      });

    if (uploadError) {
      console.error("Attachment upload error:", uploadError);
      return fail("Gagal mengunggah lampiran.", 500);
    }

    attachments.push({
      path,
      name: safeName,
      type: attachmentType,
      mime_type: mime,
      size: file.size
    });
  }

  const body = message || (
    attachments[0]?.type === "image" ? "Mengirim foto" : "Mengirim voice note"
  );

  const { data: savedMessage, error: messageError } = await admin
    .from("messages")
    .insert({
      session_id: sessionId,
      sender_type: "visitor",
      body,
      attachments
    })
    .select("id, sender_type, body, attachments, created_at")
    .single();

  if (messageError || !savedMessage) {
    if (attachments.length) {
      await admin.storage
        .from(BUCKET)
        .remove(attachments.map((item) => item.path));
    }

    console.error("Message insert error:", messageError);
    return fail("Pesan gagal disimpan.", 500);
  }

  await admin
    .from("chat_sessions")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", sessionId);

  let reply: string | null = null;

  // AI hanya menerima pesan teks untuk saat ini.
  // Foto dan VN sudah tersimpan sebagai lampiran percakapan.
  if (message && session.ai_active) {
    const { data: agents } = await admin
      .from("ai_agents")
      .select("system_prompt, model")
      .eq("website_id", session.website_id)
      .eq("enabled", true)
      .limit(1);

    if (agents?.[0]) {
      const { data: history } = await admin
        .from("messages")
        .select("sender_type, body")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(12);

      try {
        const previousHistory = (history || []).filter(
          (item) => item.sender_type !== "visitor" || item.body !== body
        );

        reply = await geminiReply(
          agents[0].system_prompt,
          previousHistory,
          message,
          agents[0].model
        );

        await admin.from("messages").insert({
          session_id: sessionId,
          sender_type: "ai",
          body: reply,
          attachments: []
        });

        await admin
          .from("chat_sessions")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", sessionId);
      } catch (error) {
        console.error("Gemini error:", error);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: savedMessage,
    reply
  });
}

export async function POST(req: Request) {
  try {
    return withCors(req, await handlePost(req));
  } catch (error) {
    console.error("Message API error:", error);
    return withCors(req, fail("Terjadi kesalahan saat mengirim pesan."));
  }
}

export async function OPTIONS(req: Request) {
  return corsOptions(req);
}

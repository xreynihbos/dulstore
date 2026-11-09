
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";
import { fail, sha256 } from "@/lib/http";
import { withCors, corsOptions } from "@/lib/cors";

export const runtime = "nodejs";

const BUCKET = "chat-attachments";

async function handleGet(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("session_id") || "";
  const token =
    req.headers.get("authorization")?.replace(/^Bearer /i, "") || "";

  if (!id || !token) {
    return fail("Sesi dan token wajib diisi.", 422);
  }

  const { data: session } = await admin
    .from("chat_sessions")
    .select("id, session_secret_hash")
    .eq("id", id)
    .maybeSingle();

  if (
    !session ||
    session.session_secret_hash !== await sha256(token)
  ) {
    return fail("Sesi tidak valid.", 403);
  }

  const { data, error } = await admin
    .from("messages")
    .select("id, sender_type, body, attachments, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return fail("Gagal mengambil riwayat.", 500);
  }

  const messages = await Promise.all(
    (data || []).map(async (message) => {
      const attachments = Array.isArray(message.attachments)
        ? await Promise.all(
            message.attachments.map(async (attachment: {
              path: string;
              name: string;
              type: string;
              mime_type: string;
              size: number;
            }) => {
              const { data: signed, error: signedError } =
                await admin.storage
                  .from(BUCKET)
                  .createSignedUrl(attachment.path, 3600);

              return {
                ...attachment,
                signed_url: signedError ? null : signed?.signedUrl || null
              };
            })
          )
        : [];

      return {
        ...message,
        attachments
      };
    })
  );

  return NextResponse.json({
    ok: true,
    messages
  });
}

export async function GET(req: Request) {
  try {
    return withCors(req, await handleGet(req));
  } catch (error) {
    console.error("History API error:", error);
    return withCors(req, fail("Gagal mengambil riwayat percakapan."));
  }
}

export async function OPTIONS(req: Request) {
  return corsOptions(req);
}

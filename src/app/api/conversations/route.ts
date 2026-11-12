import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const BUCKET = "chat-attachments";

async function authorize(req: NextRequest): Promise<string[]> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Session tidak valid. Silakan login ulang.");
  }

  const { data: memberships, error: membershipError } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", data.user.id);

  if (membershipError) throw membershipError;

  const workspaceIds = [
    ...new Set((memberships || []).map((item) => item.workspace_id))
  ];

  if (!workspaceIds.length) {
    throw new Error("Workspace tidak ditemukan atau akses ditolak.");
  }

  return workspaceIds;
}

function fail(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Terjadi kesalahan server.";

  const status =
    message === "Unauthorized" ? 401 :
    message.includes("Session tidak valid") ? 401 :
    message.includes("tidak ditemukan atau akses ditolak") ? 403 : 400;

  return NextResponse.json(
    { ok: false, error: message },
    { status }
  );
}

async function getWebsiteIds(workspaceIds: string[]) {
  const { data, error } = await admin
    .from("websites")
    .select("id, name, domain, workspace_id")
    .in("workspace_id", workspaceIds);

  if (error) throw error;

  return data || [];
}

async function getAuthorizedSession(
  sessionId: string,
  websiteIds: string[]
) {
  const { data, error } = await admin
    .from("chat_sessions")
    .select(`
      id,
      website_id,
      visitor_id,
      status,
      channel,
      ai_active,
      created_at,
      last_message_at
    `)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;

  if (!data || !websiteIds.includes(data.website_id)) {
    throw new Error("Percakapan tidak ditemukan atau akses ditolak.");
  }

  return data;
}

async function getMessages(sessionId: string) {
  const { data, error } = await admin
    .from("messages")
    .select("id, session_id, sender_type, body, attachments, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return await Promise.all(
    (data || []).map(async (message) => {
      const attachments = Array.isArray(message.attachments)
        ? await Promise.all(
            message.attachments.map(async (item: Record<string, unknown>) => {
              const path = typeof item.path === "string" ? item.path : "";

              if (!path) {
                return { ...item, signed_url: null };
              }

              const { data: signed, error: signedError } =
                await admin.storage
                  .from(BUCKET)
                  .createSignedUrl(path, 3600);

              return {
                ...item,
                signed_url: signedError ? null : signed?.signedUrl || null
              };
            })
          )
        : [];

      return { ...message, attachments };
    })
  );
}

export async function GET(req: NextRequest) {
  try {
    const workspaceIds = await authorize(req);
    const websites = await getWebsiteIds(workspaceIds);
    const websiteIds = websites.map((site) => site.id);

    const sessionId = req.nextUrl.searchParams.get("session_id");

    if (sessionId) {
      const session = await getAuthorizedSession(sessionId, websiteIds);

      const [messages, visitorResult] = await Promise.all([
        getMessages(sessionId),
        session.visitor_id
          ? admin
              .from("visitors")
              .select("id, name, email, created_at")
              .eq("id", session.visitor_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null })
      ]);

      if (visitorResult.error) throw visitorResult.error;

      const website = websites.find(
        (item) => item.id === session.website_id
      );

      return NextResponse.json({
        ok: true,
        conversation: {
          ...session,
          visitor: visitorResult.data,
          website: website || null,
          messages
        }
      });
    }

    if (!websiteIds.length) {
      return NextResponse.json({ ok: true, conversations: [] });
    }

    const { data: sessions, error: sessionError } = await admin
      .from("chat_sessions")
      .select(`
        id,
        website_id,
        visitor_id,
        status,
        channel,
        ai_active,
        created_at,
        last_message_at
      `)
      .in("website_id", websiteIds)
      .order("last_message_at", {
        ascending: false,
        nullsFirst: false
      })
      .limit(100);

    if (sessionError) throw sessionError;

    const rows = sessions || [];
    const sessionIds = rows.map((item) => item.id);
    const visitorIds = [
      ...new Set(
        rows
          .map((item) => item.visitor_id)
          .filter((id): id is string => Boolean(id))
      )
    ];

    const [visitorResult, messageResult] = await Promise.all([
      visitorIds.length
        ? admin
            .from("visitors")
            .select("id, name, email")
            .in("id", visitorIds)
        : Promise.resolve({ data: [], error: null }),

      sessionIds.length
        ? admin
            .from("messages")
            .select("id, session_id, sender_type, body, created_at")
            .in("session_id", sessionIds)
            .order("created_at", { ascending: false })
            .limit(500)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (visitorResult.error) throw visitorResult.error;
    if (messageResult.error) throw messageResult.error;

    const visitorMap = new Map(
      (visitorResult.data || []).map((visitor) => [
        visitor.id,
        visitor
      ])
    );

    const latestMessageMap = new Map<string, { id: string; session_id: string; sender_type: string; body: string; created_at: string | null }>();

    for (const message of messageResult.data || []) {
      if (!latestMessageMap.has(message.session_id)) {
        latestMessageMap.set(message.session_id, message);
      }
    }

    const websiteMap = new Map(
      websites.map((site) => [site.id, site])
    );

    const conversations = rows.map((session) => ({
      ...session,
      visitor: session.visitor_id
        ? visitorMap.get(session.visitor_id) || null
        : null,
      website: websiteMap.get(session.website_id) || null,
      last_message: latestMessageMap.get(session.id) || null
    }));

    return NextResponse.json({
      ok: true,
      conversations
    });
  } catch (error) {
    console.error("Conversations GET error:", error);
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceIds = await authorize(req);
    const websites = await getWebsiteIds(workspaceIds);
    const websiteIds = websites.map((site) => site.id);

    const body = await req.json();
    const sessionId = String(body.session_id || "");
    const message = String(body.message || "").trim();

    if (!sessionId || !message) {
      throw new Error("ID percakapan dan pesan wajib diisi.");
    }

    if (message.length > 5000) {
      throw new Error("Pesan maksimal 5000 karakter.");
    }

    await getAuthorizedSession(sessionId, websiteIds);

    const { data: savedMessage, error } = await admin
      .from("messages")
      .insert({
        session_id: sessionId,
        sender_type: "agent",
        body: message,
        attachments: []
      })
      .select("id, session_id, sender_type, body, attachments, created_at")
      .single();

    if (error) throw error;

    const { error: updateError } = await admin
      .from("chat_sessions")
      .update({
        last_message_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      message: savedMessage
    });
  } catch (error) {
    console.error("Conversations POST error:", error);
    return fail(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const workspaceIds = await authorize(req);
    const websites = await getWebsiteIds(workspaceIds);
    const websiteIds = websites.map((site) => site.id);

    const body = await req.json();
    const sessionId = String(body.session_id || "");

    if (!sessionId) {
      throw new Error("ID percakapan wajib diisi.");
    }

    await getAuthorizedSession(sessionId, websiteIds);

    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      const status = String(body.status);

      if (!["open", "pending", "resolved"].includes(status)) {
        throw new Error("Status percakapan tidak valid.");
      }

      updates.status = status;
    }

    if (body.ai_active !== undefined) {
      if (typeof body.ai_active !== "boolean") {
        throw new Error("Status AI harus berupa boolean.");
      }

      updates.ai_active = body.ai_active;
    }

    if (!Object.keys(updates).length) {
      throw new Error("Tidak ada perubahan yang dikirim.");
    }

    const { data, error } = await admin
      .from("chat_sessions")
      .update(updates)
      .eq("id", sessionId)
      .select("id, status, ai_active")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      conversation: data
    });
  } catch (error) {
    console.error("Conversations PATCH error:", error);
    return fail(error);
  }
}


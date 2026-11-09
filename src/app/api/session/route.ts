
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";
import { bodyJson, fail, randomToken, sha256 } from "@/lib/http";
import { withCors, corsOptions } from "@/lib/cors";

export const runtime = "nodejs";

function getOriginHost(origin: string): string {
  try {
    const url = new URL(origin);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";
  }
}

function normalizeAllowedHost(value: string): string {
  try {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";

    const url = new URL(
      /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    );

    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";
  }
}

async function handlePost(req: Request) {
  const b = await bodyJson(req);

  if (!b.site_key) {
    return fail("site_key wajib diisi.");
  }

  const { data: site, error } = await admin
    .from("websites")
    .select("id, name, allowed_domains, enabled, widget_config")
    .eq("site_key", b.site_key)
    .maybeSingle();

  if (error || !site || !site.enabled) {
    return fail("Website key tidak valid.", 403);
  }

  const origin = req.headers.get("origin") || "";
  const originHost = getOriginHost(origin);

  const allowed = (site.allowed_domains || [])
    .map((domain: string) => normalizeAllowedHost(domain))
    .filter(Boolean);

  if (
    !originHost ||
    !allowed.length ||
    !allowed.includes(originHost)
  ) {
    return fail("Origin website tidak diizinkan.", 403);
  }

  const { data: agent } = await admin
    .from("ai_agents")
    .select("id, name, avatar_url, description, greeting, enabled")
    .eq("website_id", site.id)
    .eq("enabled", true)
    .limit(1)
    .maybeSingle();

  const { data: visitor, error: visitorError } = await admin
    .from("visitors")
    .insert({
      website_id: site.id,
      name: String(b.name || "Visitor").slice(0, 100),
      email: String(b.email || "").slice(0, 180) || null
    })
    .select("id")
    .single();

  if (visitorError || !visitor) {
    return fail("Tidak dapat membuat visitor.", 500);
  }

  const token = randomToken();
  const hash = await sha256(token);

  const { data: session, error: sessionError } = await admin
    .from("chat_sessions")
    .insert({
      website_id: site.id,
      visitor_id: visitor.id,
      session_secret_hash: hash,
      channel: "website",
      ai_active: true
    })
    .select("id, status, created_at")
    .single();

  if (sessionError || !session) {
    return fail("Tidak dapat membuat sesi.", 500);
  }

  return NextResponse.json({
    ok: true,
    session,
    token,
    website: {
      name: site.name,
      widget_config: site.widget_config || {}
    },
    agent: agent || null
  });
}

export async function POST(req: Request) {
  return withCors(req, await handlePost(req));
}

export async function OPTIONS(req: Request) {
  return corsOptions(req);
}

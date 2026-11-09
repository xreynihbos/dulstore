import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

async function authorize(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    throw new Error("Unauthorized");
  }

  const { data: userData, error: userError } =
    await admin.auth.getUser(token);

  if (userError || !userData.user) {
    throw new Error("Session tidak valid. Silakan login ulang.");
  }

  const { data: memberships, error } = await admin
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userData.user.id)
    .in("role", ["owner", "admin"]);

  if (error) throw new Error(error.message);

  const workspaceIds = (memberships || []).map(
    (item) => item.workspace_id
  );

  if (!workspaceIds.length) {
    throw new Error("Workspace tidak ditemukan atau akses ditolak.");
  }

  return workspaceIds;
}

function fail(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Terjadi kesalahan server.";

  const status = message === "Unauthorized" ? 401 : 400;

  return NextResponse.json({ error: message }, { status });
}

function normalizeDomain(value: string) {
  let domain = value.trim().toLowerCase();

  if (!domain) throw new Error("Domain wajib diisi.");

  if (!/^https?:\/\//i.test(domain)) {
    domain = `https://${domain}`;
  }

  const parsed = new URL(domain);
  const hostname = parsed.hostname.replace(/^www\./, "");

  if (
    !hostname.includes(".") ||
    !/^[a-z0-9.-]+$/.test(hostname) ||
    hostname.startsWith(".") ||
    hostname.endsWith(".")
  ) {
    throw new Error("Format domain tidak valid.");
  }

  return hostname;
}

export async function GET(req: NextRequest) {
  try {
    const workspaceIds = await authorize(req);

    const { data, error } = await admin
      .from("websites")
      .select("*")
      .in("workspace_id", workspaceIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ websites: data || [] });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceIds = await authorize(req);
    const body = await req.json();

    const name = String(body.name || "").trim();
    const domain = normalizeDomain(String(body.domain || ""));

    if (!name) {
      throw new Error("Nama website wajib diisi.");
    }

    const { data, error } = await admin
      .from("websites")
      .insert({
        workspace_id: workspaceIds[0],
        name,
        domain,
        allowed_domains: [domain],
        enabled: true,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ website: data }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const workspaceIds = await authorize(req);
    const body = await req.json();

    if (!body.id) {
      throw new Error("ID website wajib diisi.");
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      updates.name = String(body.name).trim();
    }

    if (body.domain !== undefined) {
      const domain = normalizeDomain(String(body.domain));
      updates.domain = domain;
      updates.allowed_domains = [domain];
    }

    if (body.enabled !== undefined) {
      updates.enabled = Boolean(body.enabled);
    }

    if (body.allowed_domains !== undefined) {
      if (!Array.isArray(body.allowed_domains)) {
        throw new Error("allowed_domains harus berupa array.");
      }

      updates.allowed_domains = body.allowed_domains.map(
        (item: string) => normalizeDomain(String(item))
      );
    }

    if (!Object.keys(updates).length) {
      throw new Error("Tidak ada data yang diperbarui.");
    }

    const { data, error } = await admin
      .from("websites")
      .update(updates)
      .eq("id", body.id)
      .in("workspace_id", workspaceIds)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ website: data });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const workspaceIds = await authorize(req);
    const body = await req.json();

    if (!body.id) {
      throw new Error("ID website wajib diisi.");
    }

    const { error } = await admin
      .from("websites")
      .delete()
      .eq("id", body.id)
      .in("workspace_id", workspaceIds);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error);
  }
}

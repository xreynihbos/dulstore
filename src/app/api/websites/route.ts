
import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

async function authorize(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) throw new Error("Unauthorized");

  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Session tidak valid. Silakan login ulang.");
  }

  const { data: memberships, error: membershipError } = await admin
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", data.user.id)
    .in("role", ["owner", "admin"]);

  if (membershipError) throw membershipError;

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
  let input = value.trim().toLowerCase();

  if (!input) throw new Error("Domain wajib diisi.");

  if (!/^https?:\/\//i.test(input)) {
    input = "https://" + input;
  }

  let parsed: URL;

  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Format domain tidak valid.");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    (parsed.pathname !== "/" && parsed.pathname !== "") ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("Masukkan domain saja, tanpa path atau parameter.");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");

  if (
    !hostname.includes(".") ||
    hostname.length > 253 ||
    !/^[a-z0-9.-]+$/.test(hostname) ||
    hostname.split(".").some(
      (part) =>
        !part ||
        part.length > 63 ||
        part.startsWith("-") ||
        part.endsWith("-")
    )
  ) {
    throw new Error("Nama domain tidak valid.");
  }

  return hostname;
}

function normalizeDomainList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("Daftar domain harus berupa array.");
  }

  const domains = value.map((item) =>
    normalizeDomain(String(item))
  );

  return [...new Set(domains)];
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

    if (!name) throw new Error("Nama website wajib diisi.");

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

    if (!body.id) throw new Error("ID website wajib diisi.");

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new Error("Nama website wajib diisi.");
      updates.name = name;
    }

    if (body.domain !== undefined) {
      updates.domain = normalizeDomain(String(body.domain));
    }

    if (body.allowed_domains !== undefined) {
      updates.allowed_domains = normalizeDomainList(
        body.allowed_domains
      );
    }

    if (body.enabled !== undefined) {
      updates.enabled = Boolean(body.enabled);
    }

    if (!Object.keys(updates).length) {
      throw new Error("Tidak ada data yang diperbarui.");
    }

    const { data: current, error: currentError } = await admin
      .from("websites")
      .select("id,domain")
      .eq("id", body.id)
      .in("workspace_id", workspaceIds)
      .single();

    if (currentError || !current) {
      throw new Error("Website tidak ditemukan atau akses ditolak.");
    }

    if (updates.allowed_domains) {
      const domains = updates.allowed_domains as string[];
      const primaryDomain = String(
        updates.domain || current.domain
      );

      if (!domains.includes(primaryDomain)) {
        domains.push(primaryDomain);
      }

      updates.allowed_domains = [...new Set(domains)];
    } else if (updates.domain) {
      updates.allowed_domains = [updates.domain];
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

    if (!body.id) throw new Error("ID website wajib diisi.");

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

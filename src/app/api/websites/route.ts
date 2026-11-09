
import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const DEFAULT_WIDGET = {
  theme: "light",
  position: "right",
  primaryColor: "#635bff",
  widgetTitle: "Customer Support",
  buttonText: "Chat with us",
  welcomeMessage: "Halo! Ada yang bisa kami bantu?",
  width: 380,
  height: 540,
  borderRadius: 16,
  showBranding: true
};

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

function normalizeWidgetConfig(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Konfigurasi widget tidak valid.");
  }

  const input = value as Record<string, unknown>;
  const config = { ...DEFAULT_WIDGET };

  if (input.theme !== undefined) {
    const theme = String(input.theme);
    if (!["light", "dark", "auto"].includes(theme)) {
      throw new Error("Tema widget tidak valid.");
    }
    config.theme = theme;
  }

  if (input.position !== undefined) {
    const position = String(input.position);
    if (!["left", "right"].includes(position)) {
      throw new Error("Posisi widget tidak valid.");
    }
    config.position = position;
  }

  if (input.primaryColor !== undefined) {
    const color = String(input.primaryColor);
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error("Format warna harus HEX, contoh #635bff.");
    }
    config.primaryColor = color;
  }

  const textFields = [
    "widgetTitle",
    "buttonText",
    "welcomeMessage"
  ] as const;

  for (const field of textFields) {
    if (input[field] !== undefined) {
      const text = String(input[field]).trim();
      if (!text || text.length > 150) {
        throw new Error(`${field} tidak boleh kosong atau terlalu panjang.`);
      }
      config[field] = text;
    }
  }

  if (input.width !== undefined) {
    const width = Number(input.width);
    if (!Number.isFinite(width) || width < 280 || width > 600) {
      throw new Error("Lebar widget harus antara 280 sampai 600 px.");
    }
    config.width = width;
  }

  if (input.height !== undefined) {
    const height = Number(input.height);
    if (!Number.isFinite(height) || height < 350 || height > 800) {
      throw new Error("Tinggi widget harus antara 350 sampai 800 px.");
    }
    config.height = height;
  }

  if (input.borderRadius !== undefined) {
    const radius = Number(input.borderRadius);
    if (!Number.isFinite(radius) || radius < 0 || radius > 40) {
      throw new Error("Border radius harus antara 0 sampai 40.");
    }
    config.borderRadius = radius;
  }

  if (input.showBranding !== undefined) {
    config.showBranding = Boolean(input.showBranding);
  }

  return config;
}

async function saveAgent(websiteId: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Profil agent tidak valid.");
  }

  const input = value as Record<string, unknown>;

  const name = String(input.name || "").trim();
  const description = String(input.description || "").trim();
  const greeting = String(input.greeting || "").trim();
  const avatarUrl = String(input.avatar_url || "").trim();

  if (!name || name.length > 100) {
    throw new Error("Nama agent wajib diisi, maksimal 100 karakter.");
  }

  if (description.length > 500) {
    throw new Error("Deskripsi agent maksimal 500 karakter.");
  }

  if (!greeting || greeting.length > 500) {
    throw new Error("Greeting agent wajib diisi, maksimal 500 karakter.");
  }

  if (
    avatarUrl &&
    (!/^https:\/\//i.test(avatarUrl) || avatarUrl.length > 1000)
  ) {
    throw new Error("URL avatar harus menggunakan HTTPS.");
  }

  const { data: existing, error: findError } = await admin
    .from("ai_agents")
    .select("id")
    .eq("website_id", websiteId)
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;

  const agentData = {
    name,
    description: description || null,
    greeting,
    avatar_url: avatarUrl || null,
    enabled: input.enabled === undefined ? true : Boolean(input.enabled)
  };

  if (existing) {
    const { error } = await admin
      .from("ai_agents")
      .update(agentData)
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { data: website, error: websiteError } = await admin
      .from("websites")
      .select("workspace_id")
      .eq("id", websiteId)
      .single();

    if (websiteError || !website) {
      throw new Error("Workspace website tidak ditemukan.");
    }

    const { error } = await admin
      .from("ai_agents")
      .insert({
        ...agentData,
        website_id: websiteId,
        workspace_id: website.workspace_id,
        model: "gemini-3.5-flash-lite"
      });

    if (error) throw error;
  }
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

    const websites = data || [];
    const websiteIds = websites.map((site) => site.id);

    let agents: Record<string, unknown>[] = [];

    if (websiteIds.length) {
      const { data: agentData, error: agentError } = await admin
        .from("ai_agents")
        .select("id, website_id, name, avatar_url, description, greeting, enabled")
        .in("website_id", websiteIds);

      if (agentError) throw agentError;
      agents = (agentData || []) as Record<string, unknown>[];
    }

    const result = websites.map((site) => ({
      ...site,
      widget_config: {
        ...DEFAULT_WIDGET,
        ...(site.widget_config || {})
      },
      agent:
        agents.find((agent) => agent.website_id === site.id) || null
    }));

    return NextResponse.json({ websites: result });
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
        widget_config: DEFAULT_WIDGET
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

    const { data: current, error: currentError } = await admin
      .from("websites")
      .select("id, domain, allowed_domains, widget_config")
      .eq("id", body.id)
      .in("workspace_id", workspaceIds)
      .maybeSingle();

    if (currentError || !current) {
      throw new Error("Website tidak ditemukan atau akses ditolak.");
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new Error("Nama website wajib diisi.");
      updates.name = name;
    }

    if (body.domain !== undefined) {
      const domain = normalizeDomain(String(body.domain));
      updates.domain = domain;

      const oldDomains = Array.isArray(current.allowed_domains)
        ? current.allowed_domains
        : [];

      updates.allowed_domains = [
        ...new Set([
          ...oldDomains,
          domain
        ])
      ];
    }

    if (body.allowed_domains !== undefined) {
      const domains = normalizeDomainList(body.allowed_domains);
      const primaryDomain = String(updates.domain || current.domain);

      updates.allowed_domains = [
        ...new Set([...domains, primaryDomain])
      ];
    }

    if (body.enabled !== undefined) {
      updates.enabled = Boolean(body.enabled);
    }

    if (body.widget_config !== undefined) {
      updates.widget_config = normalizeWidgetConfig(body.widget_config);
    }

    if (!Object.keys(updates).length && body.agent === undefined) {
      throw new Error("Tidak ada data yang diperbarui.");
    }

    if (Object.keys(updates).length) {
      const { error } = await admin
        .from("websites")
        .update(updates)
        .eq("id", body.id)
        .in("workspace_id", workspaceIds);

      if (error) throw error;
    }

    if (body.agent !== undefined) {
      await saveAgent(body.id, body.agent);
    }

    const { data, error } = await admin
      .from("websites")
      .select("*")
      .eq("id", body.id)
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

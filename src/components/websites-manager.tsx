
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type WidgetConfig = {
  theme: string;
  position: string;
  primaryColor: string;
  widgetTitle: string;
  buttonText: string;
  welcomeMessage: string;
  width: number;
  height: number;
  borderRadius: number;
  showBranding: boolean;
};

type Agent = {
  name: string;
  avatar_url: string;
  description: string;
  greeting: string;
  enabled: boolean;
};

type Website = {
  id: string;
  name: string;
  domain: string;
  site_key: string;
  enabled: boolean;
  allowed_domains: string[];
  widget_config: WidgetConfig;
  agent: Agent | null;
};

const defaultWidget: WidgetConfig = {
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

const defaultAgent: Agent = {
  name: "Dulstore AI",
  avatar_url: "",
  description: "Customer Support Assistant",
  greeting: "Halo! Ada yang bisa saya bantu?",
  enabled: true
};

export default function WebsitesManager() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [configs, setConfigs] = useState<Record<string, WidgetConfig>>({});
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function request(url: string, options: RequestInit = {}) {
    const { data } = await supabaseBrowser().auth.getSession();
    const token = data.session?.access_token;

    if (!token) throw new Error("Silakan login terlebih dahulu.");

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Request gagal.");
    }

    return result;
  }

  async function loadWebsites() {
    setLoading(true);
    setError("");

    try {
      const result = await request("/api/websites");
      const list: Website[] = result.websites || [];

      setWebsites(list);

      const nextDrafts: Record<string, string> = {};
      const nextConfigs: Record<string, WidgetConfig> = {};
      const nextAgents: Record<string, Agent> = {};

      list.forEach((site) => {
        nextDrafts[site.id] = (site.allowed_domains || []).join("\n");
        nextConfigs[site.id] = {
          ...defaultWidget,
          ...(site.widget_config || {})
        };
        nextAgents[site.id] = {
          ...defaultAgent,
          ...(site.agent || {})
        };
      });

      setDrafts(nextDrafts);
      setConfigs(nextConfigs);
      setAgents(nextAgents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat website.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWebsites();
  }, []);

  async function addWebsite(e: React.FormEvent) {
    e.preventDefault();
    setSaving("new");
    setError("");
    setNotice("");

    try {
      await request("/api/websites", {
        method: "POST",
        body: JSON.stringify({ name, domain })
      });

      setName("");
      setDomain("");
      setNotice("Website berhasil ditambahkan.");
      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan website.");
    } finally {
      setSaving("");
    }
  }

  async function saveDomains(site: Website) {
    setSaving(site.id);
    setError("");
    setNotice("");

    try {
      const domains = (drafts[site.id] || "")
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);

      await request("/api/websites", {
        method: "PATCH",
        body: JSON.stringify({
          id: site.id,
          allowed_domains: domains
        })
      });

      setNotice("Daftar domain berhasil diperbarui.");
      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan domain.");
    } finally {
      setSaving("");
    }
  }

  function updateConfig(
    id: string,
    field: keyof WidgetConfig,
    value: string | number | boolean
  ) {
    setConfigs((old) => ({
      ...old,
      [id]: {
        ...old[id],
        [field]: value
      }
    }));
  }

  function updateAgent(
    id: string,
    field: keyof Agent,
    value: string | boolean
  ) {
    setAgents((old) => ({
      ...old,
      [id]: {
        ...old[id],
        [field]: value
      }
    }));
  }

  async function saveSettings(site: Website) {
    setSaving(site.id);
    setError("");
    setNotice("");

    try {
      await request("/api/websites", {
        method: "PATCH",
        body: JSON.stringify({
          id: site.id,
          widget_config: configs[site.id],
          agent: agents[site.id]
        })
      });

      setNotice(`Pengaturan ${site.name} berhasil disimpan.`);
      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSaving("");
    }
  }

  async function toggleWebsite(site: Website) {
    setSaving(site.id);
    setError("");

    try {
      await request("/api/websites", {
        method: "PATCH",
        body: JSON.stringify({
          id: site.id,
          enabled: !site.enabled
        })
      });

      setNotice("Status website berhasil diperbarui.");
      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
    } finally {
      setSaving("");
    }
  }

  async function deleteWebsite(site: Website) {
    if (!confirm(`Hapus website ${site.name}?`)) return;

    setSaving(site.id);

    try {
      await request("/api/websites", {
        method: "DELETE",
        body: JSON.stringify({ id: site.id })
      });

      setNotice("Website berhasil dihapus.");
      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus website.");
    } finally {
      setSaving("");
    }
  }

  async function copyScript(site: Website) {
    const base = window.location.origin;

    const script = `<script>
window.DulstoreChat = {
  siteKey: "${site.site_key}",
  apiBase: "${base}"
};
</script>
<script async src="${base}/widget.js"></script>`;

    try {
      await navigator.clipboard.writeText(script);
      setNotice("Installation script berhasil disalin.");
    } catch {
      setError("Gagal menyalin. Periksa izin clipboard browser.");
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: 11,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 8,
    border: "1px solid #303447",
    background: "transparent",
    color: "inherit"
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600
  };

  return (
    <section className="website-manager">
      <form onSubmit={addWebsite} className="card">
        <h2>Tambah Website</h2>
        <p>Daftarkan website baru. Setiap website mendapatkan Site Key unik.</p>

        <input
          style={fieldStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama website"
          required
        />

        <input
          style={fieldStyle}
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="contoh.com"
          required
        />

        <button type="submit" disabled={saving !== ""}>
          {saving === "new" ? "Menyimpan..." : "+ Tambah Website"}
        </button>
      </form>

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}
      {notice && <p style={{ color: "#10b981" }}>{notice}</p>}

      <div className="card">
        <h2>Website Terdaftar</h2>

        {loading ? (
          <p>Memuat website...</p>
        ) : websites.length === 0 ? (
          <p>Belum ada website terdaftar.</p>
        ) : (
          websites.map((site) => {
            const config = configs[site.id] || defaultWidget;
            const agent = agents[site.id] || defaultAgent;

            return (
              <div
                key={site.id}
                style={{
                  padding: 18,
                  marginTop: 18,
                  border: "1px solid #303447",
                  borderRadius: 12
                }}
              >
                <h3>{site.name}</h3>

                <p>
                  Domain utama: <strong>{site.domain}</strong>
                </p>

                <p>
                  Status:{" "}
                  <strong style={{ color: site.enabled ? "#10b981" : "#ef4444" }}>
                    {site.enabled ? "Aktif" : "Nonaktif"}
                  </strong>
                </p>

                <label style={labelStyle}>Domain yang diizinkan</label>
                <textarea
                  style={{ ...fieldStyle, resize: "vertical" }}
                  value={drafts[site.id] || ""}
                  onChange={(e) =>
                    setDrafts((old) => ({
                      ...old,
                      [site.id]: e.target.value
                    }))
                  }
                  placeholder={"contoh.com\nwww.contoh.com"}
                  rows={4}
                />

                <button
                  type="button"
                  disabled={saving !== ""}
                  onClick={() => saveDomains(site)}
                >
                  Simpan Domain
                </button>

                <hr style={{ margin: "22px 0", opacity: 0.2 }} />

                <h3>Pengaturan Widget</h3>

                <label style={labelStyle}>Judul widget</label>
                <input
                  style={fieldStyle}
                  value={config.widgetTitle}
                  onChange={(e) => updateConfig(site.id, "widgetTitle", e.target.value)}
                />

                <label style={labelStyle}>Teks tombol chat</label>
                <input
                  style={fieldStyle}
                  value={config.buttonText}
                  onChange={(e) => updateConfig(site.id, "buttonText", e.target.value)}
                />

                <label style={labelStyle}>Pesan sambutan</label>
                <textarea
                  style={fieldStyle}
                  rows={3}
                  value={config.welcomeMessage}
                  onChange={(e) => updateConfig(site.id, "welcomeMessage", e.target.value)}
                />

                <label style={labelStyle}>Warna utama</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => updateConfig(site.id, "primaryColor", e.target.value)}
                    style={{ width: 55, height: 40 }}
                  />
                  <span>{config.primaryColor}</span>
                </div>

                <label style={labelStyle}>Tema</label>
                <select
                  style={fieldStyle}
                  value={config.theme}
                  onChange={(e) => updateConfig(site.id, "theme", e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>

                <label style={labelStyle}>Posisi widget</label>
                <select
                  style={fieldStyle}
                  value={config.position}
                  onChange={(e) => updateConfig(site.id, "position", e.target.value)}
                >
                  <option value="right">Kanan</option>
                  <option value="left">Kiri</option>
                </select>

                <label style={labelStyle}>Lebar widget (280-600 px)</label>
                <input
                  type="number"
                  min={280}
                  max={600}
                  style={fieldStyle}
                  value={config.width}
                  onChange={(e) => updateConfig(site.id, "width", Number(e.target.value))}
                />

                <label style={labelStyle}>Tinggi widget (350-800 px)</label>
                <input
                  type="number"
                  min={350}
                  max={800}
                  style={fieldStyle}
                  value={config.height}
                  onChange={(e) => updateConfig(site.id, "height", Number(e.target.value))}
                />

                <label style={labelStyle}>Sudut widget (0-40 px)</label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  style={fieldStyle}
                  value={config.borderRadius}
                  onChange={(e) => updateConfig(site.id, "borderRadius", Number(e.target.value))}
                />

                <label style={{ display: "flex", gap: 9, alignItems: "center", margin: "12px 0" }}>
                  <input
                    type="checkbox"
                    checked={config.showBranding}
                    onChange={(e) => updateConfig(site.id, "showBranding", e.target.checked)}
                  />
                  Tampilkan branding DULSTORE
                </label>

                <hr style={{ margin: "22px 0", opacity: 0.2 }} />

                <h3>Profil Agent</h3>

                <label style={labelStyle}>Nama agent</label>
                <input
                  style={fieldStyle}
                  value={agent.name}
                  onChange={(e) => updateAgent(site.id, "name", e.target.value)}
                  placeholder="Nama agent"
                />

                <label style={labelStyle}>URL foto profil HTTPS</label>
                <input
                  style={fieldStyle}
                  value={agent.avatar_url}
                  onChange={(e) => updateAgent(site.id, "avatar_url", e.target.value)}
                  placeholder="https://domain.com/avatar.png"
                />

                {agent.avatar_url && (
                  <img
                    src={agent.avatar_url}
                    alt="Preview avatar agent"
                    width={64}
                    height={64}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                )}

                <label style={labelStyle}>Deskripsi agent</label>
                <input
                  style={fieldStyle}
                  value={agent.description}
                  onChange={(e) => updateAgent(site.id, "description", e.target.value)}
                  placeholder="Customer Support"
                />

                <label style={labelStyle}>Greeting agent</label>
                <textarea
                  style={fieldStyle}
                  rows={3}
                  value={agent.greeting}
                  onChange={(e) => updateAgent(site.id, "greeting", e.target.value)}
                />

                <label style={{ display: "flex", gap: 9, alignItems: "center", margin: "12px 0" }}>
                  <input
                    type="checkbox"
                    checked={agent.enabled}
                    onChange={(e) => updateAgent(site.id, "enabled", e.target.checked)}
                  />
                  Aktifkan AI agent
                </label>

                <button
                  type="button"
                  disabled={saving !== ""}
                  onClick={() => saveSettings(site)}
                >
                  {saving === site.id ? "Menyimpan..." : "Simpan Pengaturan Widget & Agent"}
                </button>

                <hr style={{ margin: "22px 0", opacity: 0.2 }} />

                <p style={{ wordBreak: "break-all" }}>
                  Site Key: {site.site_key}
                </p>

                <button type="button" onClick={() => copyScript(site)}>
                  Copy Installation Script
                </button>

                <button
                  type="button"
                  disabled={saving !== ""}
                  onClick={() => toggleWebsite(site)}
                >
                  {site.enabled ? "Nonaktifkan Website" : "Aktifkan Website"}
                </button>

                <button
                  type="button"
                  disabled={saving !== ""}
                  onClick={() => deleteWebsite(site)}
                >
                  Hapus Website
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

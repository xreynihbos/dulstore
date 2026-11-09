"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Website = {
  id: string;
  name: string;
  domain: string;
  site_key: string;
  enabled: boolean;
  allowed_domains: string[];
};

export default function WebsitesManager() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");

  async function request(url: string, options: RequestInit = {}) {
    const { data } = await supabaseBrowser().auth.getSession();
    const token = data.session?.access_token;

    if (!token) throw new Error("Silakan login terlebih dahulu.");

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
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
      setWebsites(result.websites || []);
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
    setSaving(true);
    setError("");

    try {
      await request("/api/websites", {
        method: "POST",
        body: JSON.stringify({ name, domain }),
      });

      setName("");
      setDomain("");
      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan website.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleWebsite(site: Website) {
    try {
      await request("/api/websites", {
        method: "PATCH",
        body: JSON.stringify({
          id: site.id,
          enabled: !site.enabled,
        }),
      });

      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  }

  async function deleteWebsite(site: Website) {
    if (!confirm(`Hapus website ${site.name}?`)) return;

    try {
      await request("/api/websites", {
        method: "DELETE",
        body: JSON.stringify({ id: site.id }),
      });

      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus website.");
    }
  }

  function copyScript(site: Website) {
    const script = `<script>
window.DulstoreChat = {
  siteKey: "${site.site_key}",
  apiBase: "${window.location.origin}",
  position: "right",
  primaryColor: "#635bff"
};
</script>
<script async src="${window.location.origin}/widget.js"></script>`;

    navigator.clipboard.writeText(script);
    alert("Installation script berhasil disalin.");
  }

  return (
    <section className="website-manager">
      <form onSubmit={addWebsite} className="card">
        <h2>Tambah Website</h2>
        <p>Daftarkan domain untuk memasang widget livechat DULSTORE.</p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama website"
          required
        />

        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="contoh.com"
          required
        />

        <button type="submit" disabled={saving}>
          {saving ? "Menyimpan..." : "+ Tambah Website"}
        </button>
      </form>

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      <div className="card">
        <h2>Website Terdaftar</h2>

        {loading ? (
          <p>Memuat website...</p>
        ) : websites.length === 0 ? (
          <p>Belum ada website terdaftar.</p>
        ) : (
          websites.map((site) => (
            <div
              key={site.id}
              style={{
                padding: 16,
                marginTop: 12,
                border: "1px solid #303447",
                borderRadius: 10,
              }}
            >
              <h3>{site.name}</h3>
              <p>{site.domain}</p>
              <p>
                Status: {site.enabled ? "Aktif" : "Nonaktif"}
              </p>

              <p style={{ wordBreak: "break-all" }}>
                Site Key: {site.site_key}
              </p>

              <button type="button" onClick={() => copyScript(site)}>
                Copy Installation Script
              </button>

              <button type="button" onClick={() => toggleWebsite(site)}>
                {site.enabled ? "Nonaktifkan" : "Aktifkan"}
              </button>

              <button type="button" onClick={() => deleteWebsite(site)}>
                Hapus
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}




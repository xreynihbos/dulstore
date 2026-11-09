
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
  const [drafts, setDrafts] = useState<Record<string, string>>({});
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
      const list: Website[] = result.websites || [];

      setWebsites(list);

      const nextDrafts: Record<string, string> = {};

      list.forEach((site) => {
        nextDrafts[site.id] = (site.allowed_domains || []).join("\n");
      });

      setDrafts(nextDrafts);
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
    setNotice("");

    try {
      await request("/api/websites", {
        method: "POST",
        body: JSON.stringify({ name, domain }),
      });

      setName("");
      setDomain("");
      setNotice("Website berhasil ditambahkan.");
      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan website.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDomains(site: Website) {
    setSaving(true);
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
          allowed_domains: domains,
        }),
      });

      setNotice("Daftar domain berhasil diperbarui.");
      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan domain.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleWebsite(site: Website) {
    setError("");

    try {
      await request("/api/websites", {
        method: "PATCH",
        body: JSON.stringify({
          id: site.id,
          enabled: !site.enabled,
        }),
      });

      setNotice("Status website berhasil diperbarui.");
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

      setNotice("Website berhasil dihapus.");
      await loadWebsites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus website.");
    }
  }

  async function copyScript(site: Website) {
    const base = window.location.origin;

    const script = `<script>
window.DulstoreChat = {
  siteKey: "${site.site_key}",
  apiBase: "${base}",
  position: "right",
  primaryColor: "#635bff"
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

  return (
    <section className="website-manager">
      <form onSubmit={addWebsite} className="card">
        <h2>Tambah Website</h2>
        <p>
          Daftarkan website baru. Setiap website mendapatkan Site Key unik.
        </p>

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
      {notice && <p style={{ color: "#10b981" }}>{notice}</p>}

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

              <p>
                Domain utama: <strong>{site.domain}</strong>
              </p>

              <p>
                Status:{" "}
                <strong style={{ color: site.enabled ? "#10b981" : "#ef4444" }}>
                  {site.enabled ? "Aktif" : "Nonaktif"}
                </strong>
              </p>

              <p>Domain yang diizinkan:</p>

              <textarea
                value={drafts[site.id] || ""}
                onChange={(e) =>
                  setDrafts((old) => ({
                    ...old,
                    [site.id]: e.target.value,
                  }))
                }
                placeholder={"contoh.com\nwww.contoh.com\nsub.contoh.com"}
                rows={4}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  resize: "vertical",
                }}
              />

              <p style={{ fontSize: 12, opacity: 0.7 }}>
                Masukkan satu domain per baris. Bisa juga dipisahkan dengan koma.
              </p>

              <button
                type="button"
                disabled={saving}
                onClick={() => saveDomains(site)}
              >
                Simpan Domain
              </button>

              <hr style={{ margin: "16px 0", opacity: 0.2 }} />

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

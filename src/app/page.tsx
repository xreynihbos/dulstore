'use client';

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import WebsitesManager from "@/components/websites-manager";

const menus = [
  { group: "WORKSPACE", items: [
    { id: "overview", label: "Overview", icon: "OV" },
    { id: "conversations", label: "Conversations", icon: "CH" },
    { id: "customers", label: "Customers", icon: "CU" }
  ]},
  { group: "MANAGEMENT", items: [
    { id: "ai-agents", label: "AI Agents", icon: "AI" },
    { id: "human-agents", label: "Human Agents", icon: "AG" },
    { id: "websites", label: "Websites", icon: "WB" },
    { id: "integrations", label: "Integrations", icon: "IN" }
  ]},
  { group: "INSIGHTS", items: [
    { id: "analytics", label: "Analytics", icon: "AN" },
    { id: "settings", label: "Settings", icon: "ST" }
  ]}
];

const pageInfo: Record<string, { title: string; description: string; heading: string; detail: string }> = {
  overview: {
    title: "Overview",
    description: "Manage every customer conversation from one place.",
    heading: "Welcome to Dulstore",
    detail: "Your cloud livechat workspace is ready for configuration."
  },
  conversations: {
    title: "Conversations",
    description: "Manage all customer conversations in one inbox.",
    heading: "Conversation Inbox",
    detail: "Percakapan pengunjung akan muncul di sini setelah website widget terhubung."
  },
  customers: {
    title: "Customers",
    description: "View and manage your website visitors.",
    heading: "Customer Directory",
    detail: "Data pengunjung, nama, email, dan riwayat percakapan akan ditampilkan di sini."
  },
  "ai-agents": {
    title: "AI Agents",
    description: "Configure your Gemini-powered customer support agents.",
    heading: "AI Agent Management",
    detail: "Atur nama AI, instruksi, model Gemini, dan perilaku otomatis customer support."
  },
  "human-agents": {
    title: "Human Agents",
    description: "Manage your customer support team.",
    heading: "Support Team",
    detail: "Kelola operator, akses anggota, dan status online tim support."
  },
  websites: {
    title: "Websites",
    description: "Connect multiple websites to your DULSTORE workspace.",
    heading: "Website Manager",
    detail: "Daftarkan website, atur domain yang diizinkan, dan buat Site Key untuk widget."
  },
  integrations: {
    title: "Integrations",
    description: "Connect external messaging channels.",
    heading: "Channel Integrations",
    detail: "Hubungkan WhatsApp, Telegram, dan kanal komunikasi lainnya."
  },
  analytics: {
    title: "Analytics",
    description: "Track your customer support performance.",
    heading: "Support Analytics",
    detail: "Pantau jumlah percakapan, pengunjung, waktu respons, dan penyelesaian oleh AI."
  },
  settings: {
    title: "Settings",
    description: "Configure your workspace preferences.",
    heading: "Workspace Settings",
    detail: "Atur nama workspace, profil admin, keamanan, dan preferensi sistem."
  }
};

export default function Home() {
  const [dark, setDark] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState("overview");

  const sb = supabaseBrowser();
  const current = pageInfo[page] || pageInfo.overview;

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user?.email || null);
    });
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setMsg(error?.message || "Login berhasil.");
    if (!error) setUser(email);
  }

  async function logout() {
    await sb.auth.signOut();
    setUser(null);
    setMsg("Berhasil logout.");
  }

  return (
    <main className={dark ? "app dark" : "app"}>
      <aside>
        <div className="brand">
          <b>d</b>
          <span>DULSTORE<small>LIVECHAT CLOUD</small></span>
        </div>

        <div className="workspace">
          WORKSPACE
          <strong>Dulstore Main</strong>
        </div>

        <nav>
          {menus.map((group) => (
            <div key={group.group}>
              <label>{group.group}</label>
              {group.items.map((item) => (
                <a
                  key={item.id}
                  href={"#" + item.id}
                  className={page === item.id ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(item.id);
                  }}
                >
                  {item.icon} {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <footer>
          * Cloud workspace<br />
          <small>Multi-website support</small>
        </footer>
      </aside>

      <section className="main">
        <header>
          <span>Workspace / {current.title}</span>
          <button onClick={() => setDark(!dark)}>
            {dark ? "☀ Light mode" : "* Dark mode"}
          </button>
        </header>

        <div className="content">
          {page === "overview" ? (
            <>
              <div className="welcome">
                <div>
                  <small>YOUR CUSTOMER SUPPORT OVERVIEW</small>
                  <h1>Good day, Admin.</h1>
                  <p>Manage every customer conversation from one place.</p>
                </div>
                <span className="pill">* CLOUD READY</span>
              </div>

              <div className="stats">
                {["Active conversations", "Online agents", "AI resolution rate", "Visitors today"].map((x) => (
                  <article key={x}>
                    <span>{x}</span>
                    <b>-</b>
                    <small>Connect your workspace to load live data</small>
                  </article>
                ))}
              </div>

              <div className="grid">
                <article className="panel">
                  <h2>Welcome to Dulstore</h2>
                  <p>Your cloud livechat workspace is ready for configuration.</p>
                  <ol>
                    <li>Create your Supabase project.</li>
                    <li>Run the database schema.</li>
                    <li>Create your first workspace and website.</li>
                    <li>Configure your Gemini AI agent.</li>
                    <li>Install the website widget.</li>
                  </ol>
                </article>

                <article className="panel">
                  <h2>Admin access</h2>
                  {user ? (
                    <>
                      <p>Signed in as <b>{user}</b></p>
                      <button onClick={logout}>Sign out</button>
                    </>
                  ) : (
                    <form onSubmit={login}>
                      <p>Sign in with your Supabase Auth account.</p>
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button type="submit">Sign in</button>
                    </form>
                  )}
                  {msg && <small>{msg}</small>}
                </article>
              </div>
            </>
          ) : page === "websites" ? (
            <>
              <div className="welcome">
                <div>
                  <small>DULSTORE WORKSPACE MANAGEMENT</small>
                  <h1>Website Manager</h1>
                  <p>Manage your connected websites and livechat widgets.</p>
                </div>
                <span className="pill">CLOUD READY</span>
              </div>

              <WebsitesManager />
            </>
          ) : (
            <>
              <div className="welcome">
                <div>
                  <small>DULSTORE WORKSPACE MANAGEMENT</small>
                  <h1>{current.title}</h1>
                  <p>{current.description}</p>
                </div>
                <span className="pill">* CLOUD READY</span>
              </div>

              <article className="panel" style={{ marginTop: 30, minHeight: 260 }}>
                <h2>{current.heading}</h2>
                <p>{current.detail}</p>

                <div style={{
                  marginTop: 35,
                  padding: 25,
                  border: "1px dashed #aab2c5",
                  borderRadius: 12,
                  textAlign: "center"
                }}>
                  <h2 style={{ fontSize: 17 }}>Workspace module</h2>
                  <p style={{ fontSize: 13 }}>
                    Halaman {current.title} berhasil dibuka.
                  </p>
                  <small style={{ color: "#8994aa" }}>
                    Modul ini siap dilanjutkan dengan integrasi database dan fitur operasional.
                  </small>
                </div>
              </article>
            </>
          )}

          <p className="note">
            DULSTORE CLOUD | Workspace management system
          </p>
        </div>
      </section>
    </main>
  );
}


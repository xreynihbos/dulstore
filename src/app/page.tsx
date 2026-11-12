'use client';

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import WebsitesManager from "@/components/websites-manager";
import ConversationsInbox from "@/components/conversations-inbox";

const menus = [
  {
    group: "WORKSPACE",
    items: [
      { id: "overview", label: "Overview", icon: "OV" },
      { id: "conversations", label: "Conversations", icon: "CH" },
      { id: "customers", label: "Customers", icon: "CU" },
    ],
  },
  {
    group: "MANAGEMENT",
    items: [
      { id: "ai-agents", label: "AI Agents", icon: "AI" },
      { id: "human-agents", label: "Human Agents", icon: "TM" },
      { id: "websites", label: "Websites", icon: "WB" },
      { id: "integrations", label: "Integrations", icon: "IN" },
      { id: "widget", label: "Chat Widget", icon: "WI" },
    ],
  },
  {
    group: "ACTIVITY",
    items: [
      { id: "traffic", label: "Traffic", icon: "TR" },
      { id: "archives", label: "Archives", icon: "AR" },
      { id: "tickets", label: "Tickets", icon: "TK" },
    ],
  },
  {
    group: "INSIGHTS",
    items: [
      { id: "analytics", label: "Analytics", icon: "AN" },
      { id: "reports", label: "Reports", icon: "RP" },
    ],
  },
  {
    group: "PREFERENCES",
    items: [
      { id: "settings", label: "Settings", icon: "ST" },
    ],
  },
];

const pageInfo: Record<string, {
  title: string;
  description: string;
  heading: string;
  detail: string;
}> = {
  overview: {
    title: "Overview",
    description: "Monitor your customer support performance from one place.",
    heading: "Welcome to DULSTORE",
    detail: "Your customer support workspace.",
  },
  conversations: {
    title: "Conversations",
    description: "Manage customer conversations across all connected websites.",
    heading: "Conversation Inbox",
    detail: "All customer conversations in one place.",
  },
  customers: {
    title: "Customers",
    description: "Understand your visitors and their conversation history.",
    heading: "Customer Directory",
    detail: "Customer profiles, visitor information, and conversation history.",
  },
  "ai-agents": {
    title: "AI Agents",
    description: "Configure your AI-powered customer support.",
    heading: "AI Agent Management",
    detail: "Manage AI instructions, model settings, and automated support behavior.",
  },
  "human-agents": {
    title: "Human Agents",
    description: "Manage your customer support team.",
    heading: "Support Team",
    detail: "Manage operators, team access, and support availability.",
  },
  websites: {
    title: "Websites",
    description: "Connect and manage multiple websites.",
    heading: "Website Manager",
    detail: "Manage domains, website access, and widget site keys.",
  },
  integrations: {
    title: "Integrations",
    description: "Connect your customer communication channels.",
    heading: "Channel Integrations",
    detail: "Manage connections to external messaging platforms.",
  },
  widget: {
    title: "Chat Widget",
    description: "Customize the live chat experience on your website.",
    heading: "Website Chat Widget",
    detail: "Widget appearance, welcome messages, and installation settings.",
  },
  traffic: {
    title: "Traffic",
    description: "Explore visitor activity across your websites.",
    heading: "Visitor Traffic",
    detail: "Monitor website visitors, active sessions, and visitor activity.",
  },
  archives: {
    title: "Archives",
    description: "Review completed customer conversations.",
    heading: "Conversation Archives",
    detail: "Completed and archived conversations will be available here.",
  },
  tickets: {
    title: "Tickets",
    description: "Track customer requests that need follow-up.",
    heading: "Support Tickets",
    detail: "Organize customer issues and follow-up requests.",
  },
  analytics: {
    title: "Analytics",
    description: "Understand your customer support performance.",
    heading: "Support Analytics",
    detail: "Monitor conversations, response times, and support performance.",
  },
  reports: {
    title: "Reports",
    description: "Review reports from your support workspace.",
    heading: "Workspace Reports",
    detail: "Performance summaries and operational reports.",
  },
  settings: {
    title: "Settings",
    description: "Configure your workspace preferences.",
    heading: "Workspace Settings",
    detail: "Manage workspace preferences, administrator profile, and security.",
  },
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

  async function login(e: FormEvent<HTMLFormElement>) {
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
          <span>
            DULSTORE
            <small>LIVECHAT CLOUD</small>
          </span>
        </div>

        <div className="workspace">
          <span className="workspace-label">CURRENT WORKSPACE</span>
          <strong>
            <i className="workspace-dot" />
            Dulstore Main
          </strong>
        </div>

        <nav>
          {menus.map((group) => (
            <div className="nav-group" key={group.group}>
              <label>{group.group}</label>
              {group.items.map((item) => (
                <a
                  key={item.id}
                  href={"#" + item.id}
                  className={page === item.id ? "active" : ""}
                  title={item.label}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(item.id);
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.id === "conversations" && (
                    <span className="nav-indicator" />
                  )}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <footer className="sidebar-footer">
          <span className="footer-status" />
          <span>
            Cloud workspace
            <small>Multi-website support</small>
          </span>
        </footer>
      </aside>

      <section className="main">
        <header>
          <div className="header-left">
            <span className="breadcrumb-muted">Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{current.title}</strong>
          </div>

          <div className="header-actions">
            {user && <span className="user-chip">{user}</span>}
            <button
              className="theme-toggle"
              onClick={() => setDark(!dark)}
              type="button"
            >
              {dark ? "☀ Light mode" : "☾ Dark mode"}
            </button>
          </div>
        </header>

        <div className="content">
          {page === "overview" ? (
            <>
              <div className="welcome">
                <div>
                  <small className="eyebrow">YOUR CUSTOMER SUPPORT OVERVIEW</small>
                  <h1>Good day, Admin.</h1>
                  <p>Here is what is happening in your workspace today.</p>
                </div>
                <span className="pill">● CLOUD READY</span>
              </div>

              <div className="stats">
                {[
                  ["Active conversations", "—", "Across all websites"],
                  ["Online agents", "—", "Support team availability"],
                  ["AI resolution rate", "—", "Automated conversations"],
                  ["Visitors today", "—", "Website visitor activity"],
                ].map(([label, value, description]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <b>{value}</b>
                    <small>{description}</small>
                  </article>
                ))}
              </div>

              <div className="grid">
                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <small className="eyebrow">GETTING STARTED</small>
                      <h2>Welcome to DULSTORE</h2>
                    </div>
                    <span className="panel-icon">DS</span>
                  </div>
                  <p>Your customer support workspace is ready to be configured.</p>
                  <ol className="setup-list">
                    <li>Create your Supabase project.</li>
                    <li>Run the database schema.</li>
                    <li>Create your first workspace and website.</li>
                    <li>Configure your Gemini AI agent.</li>
                    <li>Install the website widget.</li>
                  </ol>
                </article>

                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <small className="eyebrow">ACCOUNT</small>
                      <h2>Admin access</h2>
                    </div>
                    <span className="panel-icon">AD</span>
                  </div>

                  {user ? (
                    <>
                      <p>Signed in as <b>{user}</b></p>
                      <button onClick={logout} type="button">Sign out</button>
                    </>
                  ) : (
                    <form onSubmit={login}>
                      <p>Sign in with your Supabase Auth account.</p>
                      <input
                        type="email"
                        placeholder="Email address"
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
                  {msg && <small className="auth-message">{msg}</small>}
                </article>
              </div>
            </>
          ) : page === "conversations" ? (
            <>
              <div className="welcome">
                <div>
                  <small className="eyebrow">CUSTOMER SUPPORT</small>
                  <h1>Conversation Inbox</h1>
                  <p>{current.description}</p>
                </div>
                <span className="pill">● LIVE INBOX</span>
              </div>
              <ConversationsInbox />
            </>
          ) : page === "websites" ? (
            <>
              <div className="welcome">
                <div>
                  <small className="eyebrow">WORKSPACE MANAGEMENT</small>
                  <h1>Website Manager</h1>
                  <p>{current.description}</p>
                </div>
                <span className="pill">● CLOUD READY</span>
              </div>
              <WebsitesManager />
            </>
          ) : (
            <>
              <div className="welcome">
                <div>
                  <small className="eyebrow">DULSTORE WORKSPACE</small>
                  <h1>{current.title}</h1>
                  <p>{current.description}</p>
                </div>
                <span className="pill">WORKSPACE MODULE</span>
              </div>

              <article className="panel module-panel">
                <div className="panel-heading">
                  <div>
                    <small className="eyebrow">MODULE OVERVIEW</small>
                    <h2>{current.heading}</h2>
                  </div>
                  <span className="panel-icon">DS</span>
                </div>
                <p>{current.detail}</p>
                <div className="module-placeholder">
                  <span className="module-placeholder-icon">✦</span>
                  <h3>{current.title} module</h3>
                  <p>
                    Halaman ini sudah tersedia di navigasi workspace.
                    Fitur operasional dan integrasi database akan dibangun
                    pada tahap berikutnya.
                  </p>
                </div>
              </article>
            </>
          )}

          <p className="note">
            DULSTORE CLOUD <span>•</span> Workspace management system
          </p>
        </div>
      </section>
    </main>
  );
}
"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Message = {
  id: string;
  sender_type: string;
  body: string;
  created_at: string | null;
  attachments: {
    path?: string;
    name?: string;
    mime_type?: string;
    signed_url?: string | null;
  }[];
};

type Conversation = {
  id: string;
  status: string;
  ai_active: boolean;
  created_at: string | null;
  last_message_at: string | null;
  visitor: { name: string | null; email: string | null } | null;
  website: { name: string; domain: string } | null;
  last_message?: { body: string; sender_type: string } | null;
  messages?: Message[];
};

function dateLabel(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  if (status === "resolved") return "Resolved";
  if (status === "pending") return "Pending";
  return "Open";
}

export default function ConversationsInbox() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const api = useCallback(async (url: string, options: RequestInit = {}) => {
    const { data } = await supabaseBrowser().auth.getSession();
    const token = data.session?.access_token;

    if (!token) throw new Error("Sesi login habis. Silakan login ulang.");

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Permintaan gagal.");
    }

    return result;
  }, []);

  const loadList = useCallback(async () => {
    try {
      const result = await api("/api/conversations");
      const conversations: Conversation[] = result.conversations || [];

      setItems(conversations);

      if (!selectedId && conversations.length) {
        setSelectedId(conversations[0].id);
      }

      if (selectedId && !conversations.some((x) => x.id === selectedId)) {
        setSelectedId(conversations[0]?.id || "");
      }

      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat Inbox.");
    } finally {
      setLoading(false);
    }
  }, [api, selectedId]);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) return;

    try {
      const result = await api(
        "/api/conversations?session_id=" + encodeURIComponent(id)
      );
      setDetail(result.conversation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat pesan.");
    }
  }, [api]);

  useEffect(() => {
    void loadList();
    const timer = window.setInterval(() => void loadList(), 2000);
    return () => window.clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    setDetail(null);
    void loadDetail(selectedId);
    const timer = window.setInterval(() => void loadDetail(selectedId), 1500);
    return () => window.clearInterval(timer);
  }, [selectedId, loadDetail]);

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();
    if (!message || !selectedId || sending) return;

    setSending(true);
    setError("");

    try {
      await api("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ session_id: selectedId, message }),
      });

      setDraft("");
      await loadDetail(selectedId);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pesan gagal dikirim.");
    } finally {
      setSending(false);
    }
  }

  async function updateConversation(values: {
    status?: string;
    ai_active?: boolean;
  }) {
    if (!selectedId) return;

    try {
      await api("/api/conversations", {
        method: "PATCH",
        body: JSON.stringify({ session_id: selectedId, ...values }),
      });

      await loadDetail(selectedId);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbarui percakapan.");
    }
  }

  const visible = items.filter((item) =>
    filter === "all" ? true : item.status === filter
  );

  const selected = items.find((item) => item.id === selectedId);
  const visitorName =
    detail?.visitor?.name || selected?.visitor?.name || "Pengunjung";
  const visitorEmail =
    detail?.visitor?.email || selected?.visitor?.email || "Email belum tersedia";
  const websiteName =
    detail?.website?.name || selected?.website?.name || "Website";
  const websiteDomain =
    detail?.website?.domain || selected?.website?.domain || "-";

  const card: CSSProperties = {
    background: "var(--inbox-surface)",
    color: "var(--inbox-text)",
    border: "1px solid var(--inbox-border)",
    borderRadius: 13,
    minWidth: 0,
  };

  const smallButton: CSSProperties = {
    border: "1px solid var(--inbox-border)",
    background: "var(--inbox-control)",
    color: "var(--inbox-text)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 11,
    cursor: "pointer",
  };

  return (
    <section className="inbox-root">
      <style jsx global>{`
        .app {
          --inbox-surface: #ffffff;
          --inbox-text: #20283a;
          --inbox-muted: #7b8497;
          --inbox-border: #e7eaf1;
          --inbox-control: #f7f8fb;
          --inbox-hover: #f2f4fa;
          --inbox-selected: #eeedff;
          --inbox-accent: #6558ed;
          --inbox-agent: #6558ed;
          --inbox-visitor: #f1f3f8;
        }

        .app.dark {
          --inbox-surface: #171d2b;
          --inbox-text: #edf0f8;
          --inbox-muted: #9ba6ba;
          --inbox-border: #2b3548;
          --inbox-control: #202a3b;
          --inbox-hover: #222c3e;
          --inbox-selected: #292b50;
          --inbox-accent: #8b82ff;
          --inbox-agent: #5145cd;
          --inbox-visitor: #242e40;
        }

        .inbox-root {
          margin-top: 22px;
          width: 100%;
          color: var(--inbox-text);
        }

        .inbox-layout {
          display: grid;
          grid-template-columns: minmax(235px, 285px) minmax(300px, 1fr) minmax(205px, 245px);
          gap: 12px;
          min-height: 620px;
          align-items: stretch;
        }

        .inbox-list,
        .inbox-chat,
        .inbox-profile {
          background: var(--inbox-surface);
          color: var(--inbox-text);
          border: 1px solid var(--inbox-border);
          border-radius: 13px;
          min-width: 0;
          overflow: hidden;
        }

        .inbox-list-head {
          padding: 15px;
          border-bottom: 1px solid var(--inbox-border);
        }

        .inbox-filter {
          display: flex;
          gap: 5px;
          margin-top: 13px;
        }

        .inbox-filter button {
          flex: 1;
          min-width: 0;
          border: 1px solid var(--inbox-border);
          background: var(--inbox-control);
          color: var(--inbox-muted);
          border-radius: 7px;
          padding: 7px 3px;
          font-size: 10px;
          cursor: pointer;
        }

        .inbox-filter button.active {
          color: white;
          background: var(--inbox-accent);
          border-color: var(--inbox-accent);
        }

        .inbox-conversation {
          display: block;
          width: 100%;
          text-align: left;
          color: var(--inbox-text);
          border: 0;
          border-bottom: 1px solid var(--inbox-border);
          border-left: 3px solid transparent;
          padding: 13px 12px;
          background: transparent;
          cursor: pointer;
        }

        .inbox-conversation:hover {
          background: var(--inbox-hover);
        }

        .inbox-conversation.active {
          background: var(--inbox-selected);
          border-left-color: var(--inbox-accent);
        }

        .inbox-muted {
          color: var(--inbox-muted);
        }

        .inbox-chat {
          display: flex;
          flex-direction: column;
          min-height: 620px;
        }

        .inbox-chat-head {
          min-height: 68px;
          padding: 12px 15px;
          border-bottom: 1px solid var(--inbox-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .inbox-chat-head select,
        .inbox-chat-head button {
          border: 1px solid var(--inbox-border);
          border-radius: 8px;
          background: var(--inbox-control);
          color: var(--inbox-text);
          padding: 8px 9px;
          font-size: 11px;
        }

        .inbox-messages {
          flex: 1;
          min-height: 350px;
          max-height: 570px;
          overflow-y: auto;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .inbox-bubble {
          padding: 11px 13px;
          border-radius: 12px;
          border: 1px solid var(--inbox-border);
          font-size: 13px;
          line-height: 1.65;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .inbox-bubble.agent {
          background: var(--inbox-agent);
          color: #fff;
          border-color: transparent;
        }

        .inbox-bubble.visitor {
          background: var(--inbox-visitor);
          color: var(--inbox-text);
        }

        .inbox-composer {
          padding: 13px;
          border-top: 1px solid var(--inbox-border);
          display: flex;
          align-items: flex-end;
          gap: 9px;
        }

        .inbox-composer textarea {
          flex: 1;
          min-width: 0;
          resize: vertical;
          border: 1px solid var(--inbox-border);
          background: var(--inbox-control);
          color: var(--inbox-text);
          border-radius: 9px;
          padding: 11px;
          font: inherit;
          font-size: 13px;
          outline: none;
        }

        .inbox-composer textarea:focus {
          border-color: var(--inbox-accent);
        }

        .inbox-send {
          border: 0;
          border-radius: 9px;
          padding: 11px 15px;
          color: #fff;
          background: var(--inbox-accent);
          cursor: pointer;
          font-weight: 650;
        }

        .inbox-send:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .inbox-profile-head {
          padding: 18px 14px;
          text-align: center;
          border-bottom: 1px solid var(--inbox-border);
        }

        .inbox-avatar {
          width: 54px;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
          border-radius: 17px;
          background: var(--inbox-selected);
          color: var(--inbox-accent);
          font-size: 20px;
          font-weight: 800;
        }

        .inbox-profile-section {
          padding: 15px;
          border-bottom: 1px solid var(--inbox-border);
        }

        .inbox-profile-section h4 {
          margin: 0 0 12px;
          font-size: 11px;
          color: var(--inbox-muted);
          text-transform: uppercase;
          letter-spacing: .8px;
        }

        .inbox-profile-section p {
          margin: 0 0 11px;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .inbox-error {
          margin-bottom: 12px;
          padding: 12px;
          border: 1px solid #efb6b6;
          border-radius: 9px;
          color: #d94848;
          background: #fff1f1;
          font-size: 12px;
        }

        /* FIX: override global sidebar styles inside inbox */
        .app aside.inbox-list,
        .app aside.inbox-profile {
          background: var(--inbox-surface) !important;
          color: var(--inbox-text) !important;
          border-color: var(--inbox-border) !important;
        }

        .app .inbox-list .inbox-conversation {
          color: var(--inbox-text) !important;
          background: transparent;
          border-bottom-color: var(--inbox-border);
        }

        .app .inbox-list .inbox-conversation:hover {
          background: var(--inbox-hover) !important;
        }

        .app .inbox-list .inbox-conversation.active {
          background: var(--inbox-selected) !important;
          border-left-color: var(--inbox-accent);
        }

        .app .inbox-list .inbox-filter button {
          background: var(--inbox-control) !important;
          color: var(--inbox-muted) !important;
          border-color: var(--inbox-border) !important;
        }

        .app .inbox-list .inbox-filter button.active {
          background: var(--inbox-accent) !important;
          color: #ffffff !important;
          border-color: var(--inbox-accent) !important;
        }

        .app aside .inbox-muted {
          color: var(--inbox-muted) !important;
        }
        /* XREY INBOX POLISH */
        .inbox-layout {
          grid-template-columns: minmax(290px, 0.95fr) minmax(420px, 1.8fr) minmax(250px, 0.85fr) !important;
          gap: 14px !important;
          min-height: 720px !important;
          align-items: stretch;
        }

        .inbox-list,
        .inbox-chat,
        .inbox-profile {
          border-radius: 14px !important;
          min-width: 0;
          box-shadow: 0 2px 10px rgba(20, 30, 60, .035);
        }

        .inbox-list {
          min-height: 720px;
        }

        .inbox-list-head {
          padding: 19px 17px !important;
        }

        .inbox-list-head strong {
          font-size: 16px !important;
        }

        .inbox-filter {
          gap: 7px !important;
          margin-top: 14px;
        }

        .inbox-filter button {
          padding: 9px 6px !important;
          font-size: 11px !important;
          font-weight: 600;
        }

        .inbox-conversation {
          padding: 16px 14px !important;
        }

        .inbox-conversation strong {
          font-size: 13px !important;
        }

        .inbox-conversation .inbox-muted {
          font-size: 12px !important;
          line-height: 1.5;
        }

        .inbox-chat {
          min-height: 720px !important;
        }

        .inbox-chat-head {
          min-height: 76px !important;
          padding: 16px 20px !important;
        }

        .inbox-chat-head strong {
          font-size: 16px !important;
        }

        .inbox-messages {
          flex: 1;
          min-height: 420px;
          padding: 24px !important;
          gap: 16px !important;
          background: var(--inbox-control);
        }

        .inbox-bubble {
          padding: 13px 16px !important;
          font-size: 14px !important;
          line-height: 1.65 !important;
          border-radius: 14px !important;
          max-width: min(78%, 620px);
        }

        .inbox-composer {
          padding: 17px !important;
          gap: 12px !important;
          background: var(--inbox-surface);
        }

        .inbox-composer textarea {
          min-height: 48px !important;
          padding: 13px 15px !important;
          font-size: 14px !important;
          border-radius: 10px !important;
        }

        .inbox-send {
          min-height: 46px;
          padding: 0 19px !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          font-weight: 700;
        }

        .inbox-profile-head {
          padding: 23px 16px !important;
        }

        .inbox-avatar {
          width: 62px !important;
          height: 62px !important;
          font-size: 23px !important;
        }

        .inbox-profile-head strong {
          font-size: 15px !important;
        }

        .inbox-profile-section {
          padding: 19px 17px !important;
        }

        .inbox-profile-section h4 {
          font-size: 12px !important;
          margin-bottom: 14px !important;
        }

        .inbox-profile-section p {
          font-size: 13px !important;
          line-height: 1.65;
          margin-bottom: 14px !important;
        }

        .inbox-muted {
          font-size: 12px;
        }

        @media (max-width: 1350px) and (min-width: 1151px) {
          .inbox-layout {
            grid-template-columns: minmax(260px, .9fr) minmax(360px, 1.6fr) minmax(225px, .8fr) !important;
          }
        }
        @media (max-width: 1150px) {
          .inbox-layout {
            grid-template-columns: minmax(220px, 270px) minmax(0, 1fr);
          }
          .inbox-profile {
            display: none;
          }
        }

        @media (max-width: 700px) {
          .inbox-layout {
            grid-template-columns: minmax(0, 1fr);
            min-height: auto;
          }
          .inbox-list {
            max-height: 310px;
          }
          .inbox-chat {
            min-height: 560px;
          }
          .inbox-chat-head {
            align-items: flex-start;
          }
          .inbox-messages {
            min-height: 300px;
          }
        }
      `}</style>

      {error && <div className="inbox-error">{error}</div>}

      <div className="inbox-layout">
        <aside className="inbox-list">
          <div className="inbox-list-head">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 14 }}>Inbox</strong>
                <div className="inbox-muted" style={{ fontSize: 10, marginTop: 4 }}>
                  {visible.length} percakapan
                </div>
              </div>
              <button
                style={smallButton}
                onClick={() => {
                  setLoading(true);
                  void loadList();
                }}
              >
                Ã¢â€ Â» Refresh
              </button>
            </div>

            <div className="inbox-filter">
              {["all", "open", "pending", "resolved"].map((value) => (
                <button
                  key={value}
                  className={filter === value ? "active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {value === "all" ? "Semua" : value}
                </button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: 545, overflowY: "auto" }}>
            {loading ? (
              <p className="inbox-muted" style={{ padding: 18, fontSize: 12 }}>
                Memuat percakapan...
              </p>
            ) : visible.length === 0 ? (
              <div style={{ padding: 22, textAlign: "center" }}>
                <div style={{ fontSize: 25, marginBottom: 8 }}>Ã¢ËœÂ</div>
                <strong style={{ fontSize: 12 }}>Belum ada percakapan</strong>
                <p className="inbox-muted" style={{ fontSize: 11 }}>
                  Pesan pengunjung akan muncul di sini.
                </p>
              </div>
            ) : (
              visible.map((item) => (
                <button
                  key={item.id}
                  className={`inbox-conversation ${selectedId === item.id ? "active" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                    <div className="inbox-avatar" style={{
                      width: 34,
                      height: 34,
                      flex: "0 0 34px",
                      margin: 0,
                      borderRadius: 11,
                      fontSize: 12,
                    }}>
                      {(item.visitor?.name || "P").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 5 }}>
                        <strong style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.visitor?.name || "Pengunjung"}
                        </strong>
                        <small className="inbox-muted" style={{ fontSize: 9, whiteSpace: "nowrap" }}>
                          {dateLabel(item.last_message_at || item.created_at)}
                        </small>
                      </div>
                      <div className="inbox-muted" style={{ fontSize: 10, marginTop: 3 }}>
                        {item.website?.name || item.website?.domain || "Website"}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: 9,
                    fontSize: 11,
                    color: "var(--inbox-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {item.last_message?.body || "Belum ada pesan"}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                    <span style={{
                      fontSize: 9,
                      padding: "3px 7px",
                      borderRadius: 20,
                      background: "var(--inbox-control)",
                      color: "var(--inbox-muted)",
                    }}>
                      {statusLabel(item.status)}
                    </span>
                    {item.ai_active && (
                      <span style={{ fontSize: 9, color: "#16a879" }}>Ã¢Å“Â¦ AI aktif</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="inbox-chat">
          {!selectedId ? (
            <div style={{ margin: "auto", padding: 30, textAlign: "center" }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>Ã¢ËœÂ</div>
              <strong>Pilih percakapan</strong>
              <p className="inbox-muted" style={{ fontSize: 12 }}>
                Pilih pengunjung dari daftar Inbox untuk melihat pesan.
              </p>
            </div>
          ) : !detail ? (
            <div className="inbox-muted" style={{ margin: "auto", padding: 30, textAlign: "center" }}>
              Memuat pesan...
            </div>
          ) : (
            <>
              <header className="inbox-chat-head">
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 14 }}>{visitorName}</strong>
                  <div className="inbox-muted" style={{ fontSize: 10, marginTop: 4 }}>
                    {websiteDomain}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <select
                    value={detail.status}
                    onChange={(e) => void updateConversation({ status: e.target.value })}
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button
                    onClick={() => void updateConversation({ ai_active: !detail.ai_active })}
                    style={{
                      cursor: "pointer",
                      color: detail.ai_active ? "#16a879" : "var(--inbox-muted)",
                    }}
                  >
                    Ã¢Å“Â¦ AI {detail.ai_active ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
              </header>

              <div className="inbox-messages">
                {(detail.messages || []).length === 0 ? (
                  <div className="inbox-muted" style={{ margin: "auto", textAlign: "center", fontSize: 12 }}>
                    Belum ada pesan dalam percakapan ini.
                  </div>
                ) : (
                  (detail.messages || []).map((message) => {
                    const own = message.sender_type === "agent";

                    return (
                      <div
                        key={message.id}
                        style={{
                          alignSelf: own ? "flex-end" : "flex-start",
                          maxWidth: "82%",
                        }}
                      >
                        <small className="inbox-muted" style={{ fontSize: 9 }}>
                          {own ? "OPERATOR" : message.sender_type.toUpperCase()} Ã‚Â· {dateLabel(message.created_at)}
                        </small>

                        <div className={`inbox-bubble ${own ? "agent" : "visitor"}`}>
                          {message.body}

                          {message.attachments?.map((file, index) => (
                            <div key={file.path || index} style={{ marginTop: 10 }}>
                              {file.signed_url && file.mime_type?.startsWith("image/") ? (
                                <a href={file.signed_url} target="_blank" rel="noreferrer">
                                  <img
                                    src={file.signed_url}
                                    alt={file.name || "Lampiran"}
                                    style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8 }}
                                  />
                                </a>
                              ) : file.signed_url && file.mime_type?.startsWith("audio/") ? (
                                <audio controls src={file.signed_url} style={{ maxWidth: "100%" }} />
                              ) : file.signed_url ? (
                                <a href={file.signed_url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                                  {file.name || "Unduh lampiran"}
                                </a>
                              ) : (
                                <small>Lampiran tidak tersedia</small>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="inbox-composer" onSubmit={sendReply}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Tulis balasan untuk pelanggan..."
                  rows={2}
                  maxLength={1500}
                />
                <button
                  className="inbox-send"
                  type="submit"
                  disabled={sending || !draft.trim()}
                >
                  {sending ? "Mengirim..." : "Kirim"}
                </button>
              </form>
            </>
          )}
        </main>

        <aside className="inbox-profile">
          <div className="inbox-profile-head">
            <div className="inbox-avatar">
              {visitorName.charAt(0).toUpperCase()}
            </div>
            <strong style={{ display: "block", fontSize: 13 }}>{visitorName}</strong>
            <span className="inbox-muted" style={{ fontSize: 10 }}>Website visitor</span>
          </div>

          <div className="inbox-profile-section">
            <h4>Customer details</h4>
            <p>
              <span className="inbox-muted">Email</span>
              <br />
              <strong>{visitorEmail}</strong>
            </p>
            <p>
              <span className="inbox-muted">Visitor name</span>
              <br />
              <strong>{visitorName}</strong>
            </p>
          </div>

          <div className="inbox-profile-section">
            <h4>Website information</h4>
            <p>
              <span className="inbox-muted">Website</span>
              <br />
              <strong>{websiteName}</strong>
            </p>
            <p>
              <span className="inbox-muted">Domain</span>
              <br />
              <strong>{websiteDomain}</strong>
            </p>
          </div>

          <div className="inbox-profile-section">
            <h4>Conversation</h4>
            <p>
              <span className="inbox-muted">Status</span>
              <br />
              <strong>{detail ? statusLabel(detail.status) : "-"}</strong>
            </p>
            <p>
              <span className="inbox-muted">AI assistant</span>
              <br />
              <strong style={{ color: detail?.ai_active ? "#16a879" : "var(--inbox-muted)" }}>
                {detail?.ai_active ? "Active" : "Inactive"}
              </strong>
            </p>
            <p>
              <span className="inbox-muted">Started</span>
              <br />
              <strong>{dateLabel(detail?.created_at)}</strong>
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}


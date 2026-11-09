
(() => {
  const c = window.DulstoreChat || {};

  if (!c.siteKey || !c.apiBase) {
    console.warn("DulstoreChat: siteKey/apiBase required");
    return;
  }

  if (window.__dulstoreWidgetLoaded) return;
  window.__dulstoreWidgetLoaded = true;

  const api = c.apiBase.replace(/\/+$/, "");
  const css = document.createElement("style");

  css.textContent = `
    #dul-launch {
      position:fixed;
      bottom:22px;
      z-index:2147483000;
      border:0;
      border-radius:30px;
      background:var(--dul-color);
      color:white;
      padding:14px 20px;
      font:600 14px system-ui;
      cursor:pointer;
      box-shadow:0 8px 30px #0003;
    }
    #dul-panel {
      position:fixed;
      bottom:82px;
      z-index:2147483000;
      width:min(var(--dul-width),calc(100vw - 24px));
      height:min(var(--dul-height),calc(100vh - 110px));
      background:var(--dul-bg);
      color:var(--dul-text);
      border-radius:var(--dul-radius);
      box-shadow:0 15px 55px #0004;
      display:none;
      overflow:hidden;
      font:14px system-ui,sans-serif;
      border:1px solid var(--dul-border);
    }
    #dul-panel * { box-sizing:border-box; }
    #dul-panel header {
      background:var(--dul-color);
      color:white;
      padding:14px;
      display:flex;
      align-items:center;
      gap:10px;
      min-height:66px;
    }
    #dul-avatar {
      width:38px;height:38px;border-radius:50%;
      object-fit:cover;background:#ffffff33;
      display:none;
    }
    #dul-agent-info { flex:1;min-width:0; }
    #dul-agent-name { font-weight:700;font-size:15px; }
    #dul-agent-desc {
      font-size:11px;opacity:.85;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }
    #dul-close {
      border:0;background:transparent;color:white;
      font-size:25px;cursor:pointer;padding:0 5px;
    }
    #dul-log {
      height:calc(100% - 145px);
      overflow:auto;padding:14px;
      background:var(--dul-log-bg);
    }
    #dul-log .dul-row { display:flex;flex-direction:column;margin:9px 0; }
    #dul-log .dul-row.me { align-items:flex-end; }
    #dul-log .dul-row.other { align-items:flex-start; }
    #dul-log .dul-bubble {
      max-width:86%;padding:10px 12px;
      border-radius:13px;background:var(--dul-other);
      white-space:pre-wrap;overflow-wrap:anywhere;
      line-height:1.45;
    }
    #dul-log .me .dul-bubble {
      background:var(--dul-mine);
    }
    #dul-log img.dul-attachment {
      display:block;max-width:220px;max-height:220px;
      border-radius:10px;margin-top:7px;cursor:pointer;
    }
    #dul-log audio { display:block;max-width:230px;margin-top:7px; }
    #dul-log .dul-time {
      font-size:10px;opacity:.55;margin:4px 4px 0;
    }
    #dul-compose {
      height:79px;padding:9px;
      display:flex;align-items:center;gap:7px;
      border-top:1px solid var(--dul-border);
      background:var(--dul-bg);
    }
    #dul-compose input[type=text] {
      min-width:0;flex:1;border:1px solid var(--dul-border);
      border-radius:10px;padding:11px;
      background:var(--dul-input);color:var(--dul-text);
      outline:none;font:14px system-ui;
    }
    #dul-compose button {
      border:0;border-radius:9px;
      background:var(--dul-color);color:white;
      padding:10px 12px;cursor:pointer;font-weight:600;
    }
    #dul-compose button:disabled { opacity:.5;cursor:not-allowed; }
    #dul-compose .dul-tool {
      background:transparent;color:var(--dul-text);
      padding:8px;font-size:19px;
    }
    #dul-file { display:none; }
    #dul-status {
      padding:4px 12px;font-size:11px;
      background:var(--dul-bg);color:var(--dul-muted);
      min-height:20px;
    }
    #dul-brand {
      font-size:10px;text-align:center;
      padding:4px;color:var(--dul-muted);
    }
    #dul-recording { color:#dc2626;font-size:11px;display:none; }
    @media(max-width:480px) {
      #dul-panel {
        bottom:76px;width:calc(100vw - 16px);
        height:min(620px,calc(100vh - 95px));
      }
      #dul-launch { bottom:14px; }
    }
  `;

  document.head.appendChild(css);

  const launch = document.createElement("button");
  launch.id = "dul-launch";
  launch.textContent = c.buttonText || "Chat with us";

  const panel = document.createElement("section");
  panel.id = "dul-panel";
  panel.innerHTML = `
    <header>
      <img id="dul-avatar" alt="Agent">
      <div id="dul-agent-info">
        <div id="dul-agent-name">Customer Support</div>
        <div id="dul-agent-desc">Kami siap membantu</div>
      </div>
      <button id="dul-close" type="button" aria-label="Tutup">&times;</button>
    </header>
    <div id="dul-log"></div>
    <div id="dul-status"></div>
    <div id="dul-recording">● Merekam voice note...</div>
    <form id="dul-compose">
      <input id="dul-file" type="file"
        accept="image/jpeg,image/png,image/webp">
      <button class="dul-tool" id="dul-photo" type="button"
        title="Lampirkan foto">＋</button>
      <button class="dul-tool" id="dul-mic" type="button"
        title="Rekam voice note">🎙</button>
      <input id="dul-message" type="text"
        placeholder="Tulis pesan..." maxlength="5000"
        autocomplete="off">
      <button id="dul-send" type="submit">➤</button>
    </form>
    <div id="dul-brand">Powered by Dulstore</div>
  `;

  document.body.append(launch, panel);

  const $ = (selector) => panel.querySelector(selector);
  const log = $("#dul-log");
  const input = $("#dul-message");
  const fileInput = $("#dul-file");
  const status = $("#dul-status");
  const sendButton = $("#dul-send");
  const micButton = $("#dul-mic");

  let sid = "";
  let token = "";
  let config = {};
  let agent = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingStream = null;
  let busy = false;

  const setStatus = (text) => {
    status.textContent = text || "";
  };

  const safeColor = (value) =>
    /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#635bff";

  function applyConfig(data) {
    config = data || {};

    const color = safeColor(config.primaryColor);
    const dark = config.theme === "dark";

    panel.style.setProperty("--dul-color", color);
    panel.style.setProperty("--dul-width",
      `${Math.min(600, Math.max(280, Number(config.width) || 380))}px`);
    panel.style.setProperty("--dul-height",
      `${Math.min(800, Math.max(350, Number(config.height) || 540))}px`);
    panel.style.setProperty("--dul-radius",
      `${Math.min(40, Math.max(0, Number(config.borderRadius) || 16)}px`);

    panel.style.setProperty("--dul-bg", dark ? "#171923" : "#ffffff");
    panel.style.setProperty("--dul-text", dark ? "#f5f5f5" : "#202436");
    panel.style.setProperty("--dul-log-bg", dark ? "#10121a" : "#f7f8fc");
    panel.style.setProperty("--dul-border", dark ? "#303442" : "#eeeeee");
    panel.style.setProperty("--dul-input", dark ? "#222633" : "#ffffff");
    panel.style.setProperty("--dul-other", dark ? "#292e3b" : "#ffffff");
    panel.style.setProperty("--dul-mine", dark ? "#343052" : "#eae8ff");
    panel.style.setProperty("--dul-muted", dark ? "#a1a1aa" : "#777777");

    const position = config.position === "left" ? "left" : "right";
    launch.style.left = position === "left" ? "22px" : "auto";
    launch.style.right = position === "right" ? "22px" : "auto";
    panel.style.left = position === "left" ? "12px" : "auto";
    panel.style.right = position === "right" ? "12px" : "auto";

    launch.textContent = config.buttonText || "Chat with us";
    $("#dul-brand").style.display =
      config.showBranding === false ? "none" : "block";
  }

  function addMessage(message) {
    const isMe = message.sender_type === "visitor";
    const row = document.createElement("div");
    row.className = `dul-row ${isMe ? "me" : "other"}`;

    const bubble = document.createElement("div");
    bubble.className = "dul-bubble";

    if (message.body) {
      const text = document.createElement("div");
      text.textContent = message.body;
      bubble.appendChild(text);
    }

    const attachments = Array.isArray(message.attachments)
      ? message.attachments
      : [];

    attachments.forEach((attachment) => {
      if (!attachment.signed_url) return;

      if (attachment.type === "image") {
        const img = document.createElement("img");
        img.className = "dul-attachment";
        img.src = attachment.signed_url;
        img.alt = attachment.name || "Lampiran foto";
        img.loading = "lazy";
        img.onclick = () => window.open(img.src, "_blank", "noopener");
        bubble.appendChild(img);
      } else if (attachment.type === "audio") {
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "metadata";
        audio.src = attachment.signed_url;
        bubble.appendChild(audio);
      }
    });

    row.appendChild(bubble);

    if (message.created_at) {
      const time = document.createElement("div");
      time.className = "dul-time";
      time.textContent = new Date(message.created_at).toLocaleTimeString(
        undefined,
        { hour: "2-digit", minute: "2-digit" }
      );
      row.appendChild(time);
    }

    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  async function refreshHistory() {
    if (!sid || !token) return;

    try {
      const response = await fetch(
        `${api}/api/history?session_id=${encodeURIComponent(sid)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Gagal memuat riwayat.");
      }

      log.replaceChildren();
      (data.messages || []).forEach(addMessage);
    } catch (error) {
      console.error("Dulstore history:", error);
      setStatus("Riwayat chat belum dapat dimuat.");
    }
  }

  async function startSession() {
    if (sid) return;

    setStatus("Menghubungkan...");

    const response = await fetch(`${api}/api/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_key: c.siteKey })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Gagal membuat sesi chat.");
    }

    sid = data.session.id;
    token = data.token;

    applyConfig(data.website?.widget_config || {});

    agent = data.agent || null;

    const agentName = agent?.name || config.widgetTitle ||
      "Customer Support";

    $("#dul-agent-name").textContent = agentName;
    $("#dul-agent-desc").textContent =
      agent?.description || "Kami siap membantu";

    const avatar = $("#dul-avatar");
    if (agent?.avatar_url) {
      avatar.src = agent.avatar_url;
      avatar.style.display = "block";
    } else {
      avatar.style.display = "none";
    }

    await refreshHistory();

    if (!log.children.length) {
      const greeting = agent?.greeting ||
        config.welcomeMessage ||
        "Halo! Ada yang bisa kami bantu?";

      addMessage({
        sender_type: "ai",
        body: greeting
      });
    }

    setStatus("");
  }

  async function openChat() {
    panel.style.display = "block";
    launch.style.display = "none";

    try {
      await startSession();
    } catch (error) {
      console.error("Dulstore session:", error);
      setStatus(error.message || "Koneksi chat belum tersedia.");
    }
  }

  async function sendContent(message, file) {
    if (!sid || busy || (!message && !file)) return;

    busy = true;
    sendButton.disabled = true;
    setStatus("Mengirim...");

    try {
      const form = new FormData();
      form.append("session_id", sid);
      form.append("message", message || "");

      if (file) {
        form.append("file", file, file.name || "attachment");
      }

      const response = await fetch(`${api}/api/message`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Pesan gagal dikirim.");
      }

      input.value = "";
      await refreshHistory();
      setStatus("");
    } catch (error) {
      console.error("Dulstore send:", error);
      setStatus(error.message || "Pesan gagal dikirim. Periksa koneksi.");
    } finally {
      busy = false;
      sendButton.disabled = false;
    }
  }

  launch.addEventListener("click", openChat);

  $("#dul-close").addEventListener("click", () => {
    panel.style.display = "none";
    launch.style.display = "block";
  });

  $("#dul-compose").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = input.value.trim();
    if (!message) return;

    await sendContent(message, null);
  });

  $("#dul-photo").addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setStatus("Ukuran foto maksimal 10 MB.");
      fileInput.value = "";
      return;
    }

    await sendContent(input.value.trim(), file);
    fileInput.value = "";
  });

  micButton.addEventListener("click", async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined") {
      setStatus("Browser ini tidak mendukung perekaman voice note.");
      return;
    }

    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      const supportedMime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4"
      ].find((type) => MediaRecorder.isTypeSupported(type));

      mediaRecorder = supportedMime
        ? new MediaRecorder(recordingStream, { mimeType: supportedMime })
        : new MediaRecorder(recordingStream);

      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mime = mediaRecorder.mimeType || "audio/webm";
        const extension = mime.includes("ogg") ? "ogg" :
          mime.includes("mp4") ? "mp4" : "webm";

        const audioFile = new File(
          audioChunks,
          `voice-note-${Date.now()}.${extension}`,
          { type: mime.split(";")[0] }
        );

        recordingStream?.getTracks().forEach((track) => track.stop());
        recordingStream = null;

        $("#dul-recording").style.display = "none";
        micButton.textContent = "🎙";

        if (audioFile.size > 10 * 1024 * 1024) {
          setStatus("Voice note melebihi batas 10 MB.");
          return;
        }

        await sendContent("", audioFile);
      };

      mediaRecorder.start();
      $("#dul-recording").style.display = "block";
      micButton.textContent = "■";
      setStatus("Tekan tombol rekam lagi untuk berhenti.");
    } catch (error) {
      console.error("Microphone error:", error);
      setStatus("Izin mikrofon ditolak atau mikrofon tidak tersedia.");
      recordingStream?.getTracks().forEach((track) => track.stop());
      recordingStream = null;
    }
  });
})();

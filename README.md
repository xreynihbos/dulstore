# DULSTORE CLOUD

Vercel + Next.js + Supabase + Gemini starter. No VPS required.

## Setup
1. Create Supabase project.
2. Run `database/schema.sql` in Supabase SQL Editor.
3. In Supabase Auth, create your admin user (disable public signup for production).
4. In SQL Editor create workspace and owner membership:
```sql
insert into workspaces(name) values ('Dulstore') returning id;
-- Then use returned UUID and your Auth user UUID:
insert into workspace_members(workspace_id,user_id,role)
values ('WORKSPACE_UUID','AUTH_USER_UUID','owner');
```
5. Create a website and AI agent (replace workspace UUID):
```sql
insert into websites(workspace_id,name,domain,allowed_domains)
values ('WORKSPACE_UUID','Main Store','store.example.com',array['store.example.com'])
returning id,site_key;
insert into ai_agents(workspace_id,website_id,name,enabled,model,system_prompt)
values ('WORKSPACE_UUID','WEBSITE_UUID','Dulstore AI',true,'gemini-2.5-flash','Kamu adalah customer support Dulstore. Jawab singkat, ramah, dan jangan mengarang informasi.');
```
6. Copy `.env.example` to `.env.local`, fill Supabase URL, anon key, service role key and Gemini key.
7. Run `npm install && npm run dev`.
8. Deploy to Vercel by importing the Git repository. Add the same environment variables in Vercel Project Settings.
9. Dashboard: `/`. Widget script is `/widget.js`.

## Widget snippet
```html
<script>
window.DulstoreChat = {
  siteKey: "YOUR_SITE_KEY",
  apiBase: "https://YOUR-VERCEL-DOMAIN",
  position: "right",
  primaryColor: "#635bff",
  buttonText: "Chat with us"
};
</script>
<script async src="https://YOUR-VERCEL-DOMAIN/widget.js"></script>
```

## API
- `POST /api/session` JSON `{ "site_key": "..." }`
- `POST /api/message` JSON `{ "session_id": "...", "message": "..." }`, Authorization Bearer session token
- `GET /api/history?session_id=...`, Authorization Bearer session token

## Security / production checklist
- Never expose service-role or Gemini keys in client code.
- Set allowed_domains for every website.
- Add rate limiting and bot protection (e.g. Turnstile) before public traffic.
- Configure Supabase Auth policies and invite-only account creation.
- Add moderation, retention policy, privacy notice, and backups.
- Dashboard is a starter shell; full inbox, agent assignment, team management, and channel integrations remain future phases.
- Gemini free-tier quota/model availability can change; confirm in Google AI Studio. Avoid sending sensitive customer data through a free-tier API.

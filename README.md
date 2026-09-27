# Campus Connect

Columbia campus events map.

| Folder | What it is |
| --- | --- |
| `frontend/` | Next.js app (map, auth UI, Ask Gemini) |
| `backend/` | Express API (accounts, sessions, events) |

## Run

```bash
# terminal 1 — API on http://localhost:3000
cd backend && npm install && npm start

# terminal 2 — UI on http://localhost:3001
cd frontend && npm install && npm run dev -- -p 3001
```

Open **http://localhost:3000** (the API also serves the UI) or **http://localhost:3001**.

For live Gemini answers, add `GEMINI_API_KEY` to `frontend/.env.local`.

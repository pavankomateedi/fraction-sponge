# Deploy Checklist — Fraction Sponge → Railway

A flat, step-by-step list. ~15 minutes start to finish if you've used Railway before.

---

## 1. Get your Anthropic API key (if you don't have one)

1. Go to <https://console.anthropic.com/>
2. **API Keys** → **Create Key** → name it `fraction-sponge`
3. Copy the `sk-ant-…` value somewhere safe

---

## 2. Initialize git inside `fraction-sponge/`

> Skip this section if you're committing into the parent `Week 4 - AI Tutoring` repo instead. Either approach works for Railway; a standalone repo for `fraction-sponge/` is cleaner.

```bash
cd "c:\Pavan\AI Projects\Guantlet\Week 4 - AI Tutoring\fraction-sponge"
git init
git add .
git status        # confirm .env is NOT staged (it's in .gitignore)
git commit -m "Initial commit: Fraction Sponge v1"
```

---

## 3. Push to GitHub

1. Go to <https://github.com/new>
2. Repo name: `fraction-sponge`. Visibility: your call (public is fine; nothing sensitive in the repo).
3. **Don't** initialize with a README — you already have one.
4. Copy the `git remote add origin …` block GitHub shows you, run it locally:

   ```bash
   git remote add origin https://github.com/<your-username>/fraction-sponge.git
   git branch -M main
   git push -u origin main
   ```

---

## 4. Connect Railway

1. Go to <https://railway.app/> → sign in with GitHub if you haven't
2. **New Project** → **Deploy from GitHub repo** → pick `fraction-sponge`
3. Railway detects Node automatically (it'll use Nixpacks, configured by [railway.json](railway.json))
4. Wait ~2 minutes for the first build

---

## 5. Set the environment variable

1. In the Railway project dashboard → **Variables** tab
2. Add: `ANTHROPIC_API_KEY` = `sk-ant-…` (paste your key)
3. Railway will automatically redeploy when you save

> Don't set `PORT` manually — Railway sets it for you. The server reads `process.env.PORT`.

---

## 6. Generate the public URL

1. In Railway → **Settings** → **Networking** → **Generate Domain**
2. Copy the URL (typically `https://fraction-sponge-production.up.railway.app` or similar)
3. Open it in Safari on the iPad — verify the app loads

---

## 7. Smoke test the deployed app

Open the public URL and run through:

- [ ] Page loads under 2s
- [ ] Split → Smash → 7 check questions → win → Play Again all work
- [ ] At a check question, tap a **wrong** answer → typing indicator → Pip's hint
- [ ] In a separate tab, hit `https://<your-url>/api/health` → confirms `"hasApiKey": true`
- [ ] No console errors in Safari DevTools

If `hasApiKey` is `false`, your env var didn't save — re-check step 5 and trigger a redeploy (Railway → Deployments → ⋯ → Redeploy).

---

## 8. Add the URL to the README

Once the URL is stable, update [README.md](README.md):

```markdown
## Demo
🧽 Live app: <https://your-railway-url.up.railway.app>
📹 Demo video: <your-loom-or-youtube-link>
```

Then:

```bash
git add README.md
git commit -m "docs: add demo URL"
git push
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Railway build fails on `npm install` | Check Railway build logs; usually a node version mismatch. `package.json` pins `engines.node >= 18` — verify Railway uses 18+. |
| App loads but answers always use scripted text | `ANTHROPIC_API_KEY` not set or invalid. Hit `/api/health`. |
| Health endpoint returns 502 | Server didn't start. Check Railway deploy logs for the `Fraction Sponge listening on…` line. |
| Layout looks wrong on iPad | Hard-refresh Safari (drag-down to reload). Old CSS cached. |
| Audio is silent | iOS audio context only unlocks on user tap. Tap **Split it!** first. |

---

## Time budget

| Step | Estimate |
|---|---|
| 1. API key | 2 min |
| 2. Git init | 1 min |
| 3. GitHub push | 3 min |
| 4. Railway connect | 3 min |
| 5. Env var | 1 min |
| 6. Domain | 1 min |
| 7. Smoke test | 3 min |
| 8. README update | 1 min |
| **Total** | **~15 min** |

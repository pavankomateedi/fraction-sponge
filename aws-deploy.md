# Deploy to AWS App Runner

A flat, click-by-click guide to host Fraction Fruit Lab on **AWS App Runner** — the AWS-native equivalent of Railway. App Runner connects to your GitHub repo, builds the Node app, runs it, and gives you an HTTPS URL. It auto-redeploys on every push to `main`.

**First-timer estimate:** ~30-45 min (most of it is the one-time AWS account + GitHub-connection setup).

> The repo already contains [`apprunner.yaml`](apprunner.yaml) — App Runner reads it automatically, so you don't configure build/run commands by hand.

---

## 0. One-time: create an AWS account

Skip if you already have one.

1. Go to <https://aws.amazon.com/> → **Create an AWS Account**
2. Enter email, account name, password
3. Add a **payment method** (required even for low usage — App Runner is not free-tier)
4. Verify your phone number
5. Choose the **Basic (free) support plan**
6. Sign in to the **AWS Management Console**

---

## 1. Pick a region

Top-right of the console, choose a region close to you (and keep it consistent). Examples:

- `us-east-1` (N. Virginia) — cheapest, most services
- `us-west-2` (Oregon)
- `ap-south-1` (Mumbai) — if you're in India

Whatever you pick, stay in it for all the steps below.

---

## 2. Open App Runner

1. In the console search bar (top), type **App Runner** → open it
2. Click **Create service**

---

## 3. Source — connect GitHub

1. **Repository type:** Source code repository
2. **Provider:** GitHub
3. Click **Add new** next to "Connect to GitHub" (first time only):
   - This installs the **AWS Connector for GitHub** app
   - Authorize it, and grant access to the **`fraction-sponge`** repo (or all repos)
   - Give the connection a name like `github-pavan`, click **Connect**
4. Back on the form:
   - **Repository:** `pavankomateedi/fraction-sponge`
   - **Branch:** `main`
   - **Deployment trigger:** **Automatic** (redeploy on every push)
5. Click **Next**

---

## 4. Build settings

1. **Configuration file:** select **Use a configuration file**
   - App Runner will read [`apprunner.yaml`](apprunner.yaml) from the repo — no manual build/run commands needed
2. Click **Next**

---

## 5. Service settings

1. **Service name:** `fraction-fruit-lab`
2. **Virtual CPU & memory:** the smallest option is fine — **0.25 vCPU / 0.5 GB** (cheapest; plenty for this app)
3. **Port:** `3000` (matches `apprunner.yaml`; App Runner injects `PORT` and the server reads it)

### Environment variables (the important bit)

Under **Environment variables → Add environment variable**:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your `sk-ant-…` key |

`NODE_ENV=production` is already set by `apprunner.yaml`, so you only need the API key here. Do **not** commit the key anywhere — it lives only in this console field.

### Health check

Expand **Health check** and set:

- **Protocol:** HTTP
- **Path:** `/api/health`
- (defaults for interval/timeout/threshold are fine)

This is how App Runner knows the app booted correctly. `/api/health` returns `200` with a small JSON body.

4. Click **Next**

---

## 6. Review + create

1. Review the summary
2. Click **Create & deploy**
3. Wait ~3-7 minutes for the first build + deploy (watch the **Event log** / **Deployment logs** tab)

When it finishes, App Runner shows a **Default domain** like:

```
https://abcd1234xyz.us-east-1.awsapprunner.com
```

That's your live URL.

---

## 7. Verify the deploy

Replace the URL below with your App Runner domain:

```bash
cd fraction-sponge
PREFLIGHT_URL=https://YOUR-APP.us-east-1.awsapprunner.com npm run preflight
```

You want **READY TO DEMO (9/9 green)**. Then run the eval against it:

```bash
EVAL_BASE_URL=https://YOUR-APP.us-east-1.awsapprunner.com npm run eval
```

Manual spot-check in a browser:

- Open the URL → the **lesson hub** with 3 cards should appear
- `https://YOUR-APP.../api/health` → should show `"questionCount":17` and `"hasApiKey":true`

---

## 8. Put the URL in the README

```bash
# edit README.md — replace the Railway URL under "## Demo" with the App Runner URL
git add README.md && git commit -m "docs: switch live URL to AWS App Runner" && git push
```

App Runner auto-redeploys on that push.

---

## Cost & shutdown

- App Runner bills for **provisioned container time** even when idle (~$5/mo at the smallest size, more under load + per-request compute).
- To **pause billing** without deleting: App Runner → your service → **Actions → Pause**. Resume when you need it.
- To **delete entirely**: **Actions → Delete service**, and remove the GitHub connection under App Runner → **GitHub connections** if you want.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails on `npm ci` | Ensure `package-lock.json` is committed (it is). Check the build log for the Node version — `apprunner.yaml` pins `nodejs18`. |
| Service deploys but health check fails | Confirm **Port = 3000** and health path **`/api/health`**. The server logs `Fraction Fruit Lab listening on…` on success. |
| App loads but answers use scripted text only | `ANTHROPIC_API_KEY` missing/invalid. Hit `/api/health` → `hasApiKey` should be `true`. Fix the env var, App Runner redeploys. |
| 4xx/5xx right after deploy | Give it a minute — App Runner finishes the health-check cycle before routing traffic. |
| Want a custom domain | App Runner → service → **Custom domains** → add + verify DNS. Optional. |

---

## How this compares to the Railway setup

| | Railway | AWS App Runner |
|---|---|---|
| Connect GitHub | ✅ | ✅ (via AWS Connector) |
| Auto-deploy on push | ✅ | ✅ |
| Build config | auto / `railway.json` | `apprunner.yaml` |
| HTTPS URL | ✅ | ✅ |
| Env vars in console | ✅ | ✅ |
| Health check | `railway.json` | service config (set to `/api/health`) |
| Free tier | usage credits | none (pay per running container) |

The app code is identical — `server.js` reads `process.env.PORT` and `process.env.ANTHROPIC_API_KEY` the same way on both platforms.

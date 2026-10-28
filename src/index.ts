import cors from "cors";
import express from "express";
import { config } from "./config";
import { requireApiKey } from "./middleware/apiKey";
import { requireUser } from "./middleware/auth";
import { analyticsPost } from "./routes/analyticsPost";
import { analyticsPosts } from "./routes/analyticsPosts";
import { callback } from "./routes/callback";
import { clean } from "./routes/clean";
import { connect } from "./routes/connect";
import { insights } from "./routes/insights";
import { status } from "./routes/status";

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GOHEZA</title>
  <style>
    html, body { height: 100%; margin: 0; }
    body {
      background: #000;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      font-family: system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
    }
    h1 {
      font-size: clamp(3rem, 14vw, 10rem);
      font-weight: 800;
      letter-spacing: 0.08em;
      margin: 0;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #a3a3a3;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background:#22c55e;
    }
  </style>
</head>
<body>
  <h1>GOHEZA</h1>
  <div class="status"><span class="dot"></span>Online</div>
</body>
</html>`);
});

// Same paths as the Next.js app, so TikTok's redirect URI and frontend paths stay familiar.
const r = express.Router();

// Public on purpose: TikTok redirects the user's browser here and cannot send
// an API key. It is protected by the signed, expiring `state` instead.
r.get("/callback", callback);

// Everything below requires BOTH the API key and a logged-in user.
r.use(requireApiKey);
r.post("/connect", requireUser, connect);
r.get("/status", requireUser, status);
r.post("/clean", requireUser, clean);
r.post("/insights", requireUser, insights);
r.post("/analytics/post", requireUser, analyticsPost);
r.post("/analytics/posts", requireUser, analyticsPosts);
app.use("/api/tiktok-business", r);

app.listen(config.port, () =>
  console.log(`TikTok backend listening on :${config.port}`),
);

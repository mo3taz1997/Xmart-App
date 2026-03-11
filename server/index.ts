import express from "express";
import type { Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { registerRoutes } from "./routes";
import { registerAdminRoutes } from "./admin-routes";
import { db } from "./db";
import { appSettings } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return res.redirect("/admin");
    }

    next();
  });

  app.get("/favicon.png", (_req: Request, res: Response) => {
    res.sendFile(path.resolve(process.cwd(), "assets", "images", "favicon.png"));
  });
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

declare module "express-session" {
  interface SessionData {
    adminLoggedIn?: boolean;
  }
}

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "xmart2026";

async function getAdminCredentials() {
  try {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, "admin_credentials"));
    if (rows.length > 0 && rows[0].value) {
      const creds = JSON.parse(rows[0].value);
      return { username: creds.username, passwordHash: creds.passwordHash };
    }
  } catch {}
  const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
  await db.insert(appSettings).values({ key: "admin_credentials", value: JSON.stringify({ username: DEFAULT_ADMIN_USERNAME, passwordHash: hash }) }).onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify({ username: DEFAULT_ADMIN_USERNAME, passwordHash: hash }) } });
  return { username: DEFAULT_ADMIN_USERNAME, passwordHash: hash };
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.adminLoggedIn) {
    return next();
  }
  if (req.originalUrl.startsWith("/api/admin")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.redirect("/admin/login");
}

const adminLoginPageHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xmart - تسجيل الدخول</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; background: linear-gradient(135deg, #0d1b2a 0%, #163259 50%, #1a3a6b 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-card { background: #fff; border-radius: 20px; padding: 40px 36px; width: 380px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; }
    .logo-container { margin-bottom: 24px; }
    .logo-container svg { width: 120px; height: auto; }
    h1 { font-size: 22px; color: #163259; margin-bottom: 8px; font-weight: 700; }
    .subtitle { font-size: 14px; color: #888; margin-bottom: 28px; }
    .form-group { margin-bottom: 18px; text-align: right; }
    .form-group label { display: block; font-size: 13px; color: #555; margin-bottom: 6px; font-weight: 600; }
    .form-group input { width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 15px; font-family: 'Cairo', sans-serif; outline: none; transition: border-color 0.3s; direction: ltr; text-align: right; }
    .form-group input:focus { border-color: #248CCC; }
    .login-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #248CCC, #163259); color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; font-family: 'Cairo', sans-serif; cursor: pointer; transition: opacity 0.3s; margin-top: 8px; }
    .login-btn:hover { opacity: 0.9; }
    .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { background: #fff0f0; color: #d32f2f; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; display: none; border: 1px solid #ffd0d0; }
    .error-msg.show { display: block; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo-container">
      <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Cairo, sans-serif" font-weight="700" font-size="36" fill="#163259">X<tspan fill="#248CCC">mart</tspan></text>
      </svg>
    </div>
    <h1>لوحة التحكم</h1>
    <p class="subtitle">سجّل دخولك للمتابعة</p>
    <div id="errorMsg" class="error-msg"></div>
    <form id="loginForm">
      <div class="form-group">
        <label>اسم المستخدم</label>
        <input type="text" id="username" autocomplete="username" required>
      </div>
      <div class="form-group">
        <label>كلمة المرور</label>
        <input type="password" id="password" autocomplete="current-password" required>
      </div>
      <button type="submit" class="login-btn" id="loginBtn">تسجيل الدخول</button>
    </form>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      const errEl = document.getElementById('errorMsg');
      btn.disabled = true;
      btn.textContent = 'جارٍ تسجيل الدخول...';
      errEl.classList.remove('show');
      try {
        const res = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
          })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = '/admin';
        } else {
          errEl.textContent = data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة';
          errEl.classList.add('show');
        }
      } catch {
        errEl.textContent = 'حدث خطأ في الاتصال';
        errEl.classList.add('show');
      }
      btn.disabled = false;
      btn.textContent = 'تسجيل الدخول';
    });
  </script>
</body>
</html>`;

(async () => {
  app.set("trust proxy", 1);
  setupCors(app);
  setupBodyParsing(app);

  app.use(session({
    secret: process.env.SESSION_SECRET || "xmart-admin-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }));

  setupRequestLogging(app);

  const adminTemplatePath = path.resolve(process.cwd(), "server", "templates", "admin.html");
  const adminRawHtml = fs.readFileSync(adminTemplatePath, "utf-8");
  const isDev = process.env.NODE_ENV !== 'production';
  const replitDomain = isDev ? (process.env.REPLIT_DEV_DOMAIN || "") : "";
  const imageBase = replitDomain ? `https://${replitDomain}:5000` : "";
  const imageBaseScript = imageBase
    ? `<script>window.IMAGE_BASE = '${imageBase}';</script>`
    : "";
  const adminPageHtml = adminRawHtml.replace("<!-- __IMAGE_BASE__ -->", imageBaseScript);

  app.get("/admin/login", (req: Request, res: Response) => {
    if (req.session && req.session.adminLoggedIn) {
      return res.redirect("/admin");
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(adminLoginPageHtml);
  });

  app.post("/admin/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const creds = await getAdminCredentials();
      if (username === creds.username && bcrypt.compareSync(password, creds.passwordHash)) {
        req.session.adminLoggedIn = true;
        return res.json({ success: true });
      }
      return res.status(401).json({ success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    } catch {
      return res.status(500).json({ success: false, error: "حدث خطأ" });
    }
  });

  app.get("/admin/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.redirect("/admin/login");
    });
  });

  app.post("/api/admin/change-password", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newUsername, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      const creds = await getAdminCredentials();
      if (!bcrypt.compareSync(currentPassword, creds.passwordHash)) {
        return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      }
      const newHash = bcrypt.hashSync(newPassword, 10);
      const updatedUsername = newUsername?.trim() || creds.username;
      await db.update(appSettings).set({ value: JSON.stringify({ username: updatedUsername, passwordHash: newHash }) }).where(eq(appSettings.key, "admin_credentials"));
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.get("/icon-preview", (_req: Request, res: Response) => {
    const previewPath = path.resolve(process.cwd(), "assets/images/icon-preview.html");
    res.sendFile(previewPath);
  });

  app.get("/admin", requireAdminAuth, (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.send(adminPageHtml);
  });

  app.use("/api/admin", requireAdminAuth);

  registerAdminRoutes(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();

import type { Express, Request, Response } from "express";

function toAbsoluteUrl(url: string | null | undefined, req: Request): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) {
    const fwdProto = (req.headers['x-forwarded-proto'] as string || req.protocol || 'https').split(',')[0].trim();
    const fwdHost = ((req.headers['x-forwarded-host'] as string) || '').split(',')[0].trim() || (req.headers.host as string) || '';
    return `${fwdProto}://${fwdHost}${url}`;
  }
  return url;
}
import express from "express";
import { db } from "./db";
import { homepageSections, homepageBanners, appSettings, notifications, categories, suggestedProducts, pushTokens, uploadedImages } from "../shared/schema";
import { eq, asc, desc, sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { shopifyAdminFetch, shopifyAdminFetchPaged, shopifyAdminGraphQL, ADMIN_QUERIES, mapAdminProduct, shopifyFetch } from "./shopify";

async function sendPushNotifications(notification: any) {
  try {
    const tokens = await db.select().from(pushTokens);
    if (tokens.length === 0) return;

    const messages = tokens.map((t: any) => ({
      to: t.token,
      sound: 'default',
      title: notification.titleAr,
      body: notification.bodyAr || '',
      priority: 'high',
      channelId: 'default',
      _contentAvailable: true,
      data: {
        notificationId: notification.id,
        linkType: notification.linkType,
        linkValue: notification.linkValue,
        titleAr: notification.titleAr,
        titleEn: notification.titleEn,
        bodyAr: notification.bodyAr,
        bodyEn: notification.bodyEn,
      },
    }));

    const chunks: any[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
        });
        const result = await response.json();
        if (result.data) {
          const invalidTokens: string[] = [];
          result.data.forEach((item: any, index: number) => {
            if (item.status === 'error' && (item.details?.error === 'DeviceNotRegistered' || item.details?.error === 'InvalidCredentials')) {
              invalidTokens.push(chunk[index].to);
            }
          });
          if (invalidTokens.length > 0) {
            for (const token of invalidTokens) {
              await db.delete(pushTokens).where(eq(pushTokens.token, token)).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error("Error sending push chunk:", err);
      }
    }
  } catch (err) {
    console.error("Error in sendPushNotifications:", err);
  }
}

export function registerAdminRoutes(app: Express) {
  const uploadsDir = path.resolve(process.cwd(), "server", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const MIME_MAP: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };

  async function saveImageToDb(filename: string, buffer: Buffer, ext: string): Promise<string> {
    const mime = MIME_MAP[ext] || 'image/png';
    await db.insert(uploadedImages).values({ filename, data: buffer, mimeType: mime }).onConflictDoUpdate({ target: uploadedImages.filename, set: { data: buffer, mimeType: mime, createdAt: new Date() } });
    return `/uploads/${filename}`;
  }

  app.get("/uploads/:filename", async (req: Request, res: Response) => {
    try {
      const row = await db.select().from(uploadedImages).where(eq(uploadedImages.filename, req.params.filename)).limit(1);
      if (row.length === 0) {
        const filePath = path.join(uploadsDir, req.params.filename);
        if (fs.existsSync(filePath)) return res.sendFile(filePath);
        return res.status(404).send('Not found');
      }
      res.setHeader('Content-Type', row[0].mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(row[0].data);
    } catch { res.status(500).send('Error'); }
  });

  app.post("/api/admin/upload-image", async (req: Request, res: Response) => {
    try {
      const { data, filename } = req.body;
      if (!data || !filename) return res.status(400).json({ error: "Missing data or filename" });
      const ext = path.extname(filename).toLowerCase();
      const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
      if (!allowed.includes(ext)) return res.status(400).json({ error: "Unsupported file type" });
      const base64Data = data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const savedFilename = `img-${Date.now()}${ext}`;
      const url = await saveImageToDb(savedFilename, buffer, ext);
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/download-external-image", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') return res.status(400).json({ error: "Missing url" });
      if (url.startsWith('/uploads/')) {
        const fname = url.split('/uploads/')[1]?.split('?')[0];
        if (fname) {
          const exists = await db.select({ filename: uploadedImages.filename }).from(uploadedImages).where(eq(uploadedImages.filename, fname)).limit(1);
          if (exists.length > 0) return res.json({ url });
        }
      }
      const https = require('https');
      const http = require('http');
      const client = url.startsWith('https') ? https : http;
      const imageData: Buffer = await new Promise((resolve, reject) => {
        const request = client.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (response: any) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const redirectClient = response.headers.location.startsWith('https') ? https : http;
            redirectClient.get(response.headers.location, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2: any) => {
              const chunks: Buffer[] = [];
              res2.on('data', (c: Buffer) => chunks.push(c));
              res2.on('end', () => resolve(Buffer.concat(chunks)));
              res2.on('error', reject);
            }).on('error', reject);
            return;
          }
          if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode}`));
          const chunks: Buffer[] = [];
          response.on('data', (c: Buffer) => chunks.push(c));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        });
        request.on('error', reject);
        request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
      });
      const contentType = url.match(/\.(png|jpg|jpeg|webp|gif)/i);
      let ext = '.jpg';
      if (contentType) ext = '.' + contentType[1].toLowerCase();
      if (ext === '.jpeg') ext = '.jpg';
      const savedFilename = `img-${Date.now()}${ext}`;
      const savedUrl = await saveImageToDb(savedFilename, imageData, ext);
      res.json({ url: savedUrl });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/upload-logo", async (req: Request, res: Response) => {
    try {
      const { data, filename, mode } = req.body;
      if (!data || !filename) {
        return res.status(400).json({ error: "Missing data or filename" });
      }
      const isIcon = mode === 'icon';
      const isDarkMode = mode === 'dark';
      const prefix = isIcon ? 'app-icon' : isDarkMode ? 'logo-dark' : 'logo';
      const settingKey = isIcon ? 'appIconUrl' : isDarkMode ? 'logoDarkUrl' : 'logoUrl';

      const ext = path.extname(filename).toLowerCase();
      const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ai'];
      if (!allowed.includes(ext)) {
        return res.status(400).json({ error: "Unsupported file type. Allowed: PNG, JPG, SVG, WebP, GIF, AI" });
      }
      const base64Data = data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      let savedFilename: string;
      let finalBuffer: Buffer;

      if (ext === '.svg') {
        savedFilename = `${prefix}.png`;
        finalBuffer = await sharp(buffer)
          .resize(800, null, { withoutEnlargement: true })
          .png({ quality: 90 })
          .toBuffer();
      } else if (ext === '.ai') {
        savedFilename = `${prefix}.png`;
        try {
          finalBuffer = await sharp(buffer)
            .resize(800, null, { withoutEnlargement: true })
            .png({ quality: 90 })
            .toBuffer();
        } catch {
          return res.status(400).json({ error: "Could not process this AI file. Please convert it to PNG or SVG first." });
        }
      } else {
        savedFilename = `${prefix}${ext}`;
        finalBuffer = buffer;
      }

      const finalExt = (ext === '.svg' || ext === '.ai') ? '.png' : ext;
      await saveImageToDb(savedFilename, finalBuffer, finalExt);

      const logoUrl = `/uploads/${savedFilename}?t=${Date.now()}`;

      await db
        .insert(appSettings)
        .values({ key: settingKey, value: logoUrl, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: logoUrl, updatedAt: new Date() },
        });

      res.json({ success: true, logoUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/admin/sections", async (req: Request, res: Response) => {
    try {
      const sections = await db
        .select()
        .from(homepageSections)
        .orderBy(asc(homepageSections.sortOrder));

      const sectionsWithBanners = await Promise.all(
        sections.map(async (section) => {
          const banners = await db
            .select()
            .from(homepageBanners)
            .where(sql`${homepageBanners.sectionId} = ${section.id}`)
            .orderBy(asc(homepageBanners.sortOrder));
          return {
            ...section,
            banners: banners.map(b => ({ ...b })),
          };
        })
      );

      res.json(sectionsWithBanners);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/sections", async (req: Request, res: Response) => {
    try {
      const { type, titleAr, titleEn, sortOrder, visible, language, metadata } = req.body;
      let finalMetadata = metadata;
      if (finalMetadata && finalMetadata.imageUrl) {
        finalMetadata.imageUrl = await persistImageOnServer(finalMetadata.imageUrl);
      }
      const [section] = await db
        .insert(homepageSections)
        .values({
          type,
          titleAr: titleAr || null,
          titleEn: titleEn || null,
          language: language || "both",
          sortOrder: sortOrder ?? 0,
          visible: visible ?? true,
          metadata: finalMetadata ? JSON.stringify(finalMetadata) : null,
        })
        .returning();
      res.json(section);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/sections/reorder", async (req: Request, res: Response) => {
    try {
      const { order } = req.body;
      for (let i = 0; i < order.length; i++) {
        await db
          .update(homepageSections)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(eq(homepageSections.id, order[i]));
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/sections/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { type, titleAr, titleEn, sortOrder, visible, language, metadata } = req.body;
      let finalMetadata = metadata;
      if (finalMetadata && finalMetadata.imageUrl) {
        finalMetadata.imageUrl = await persistImageOnServer(finalMetadata.imageUrl);
      }
      const [section] = await db
        .update(homepageSections)
        .set({
          type,
          titleAr: titleAr || null,
          titleEn: titleEn || null,
          language: language || "both",
          sortOrder,
          visible,
          metadata: finalMetadata !== undefined ? (finalMetadata ? JSON.stringify(finalMetadata) : null) : undefined,
          updatedAt: new Date(),
        })
        .where(sql`${homepageSections.id} = ${id}`)
        .returning();
      res.json(section);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/sections/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(homepageBanners).where(sql`${homepageBanners.sectionId} = ${id}`);
      await db.delete(homepageSections).where(sql`${homepageSections.id} = ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  async function persistImageOnServer(url: string): Promise<string> {
    if (!url || url.startsWith('/uploads/') || url.startsWith('data:')) return url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) return url;
    try {
      const https = require('https');
      const http = require('http');
      const client = url.startsWith('https') ? https : http;
      const imageData: Buffer = await new Promise((resolve, reject) => {
        const request = client.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (response: any) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const redirectClient = response.headers.location.startsWith('https') ? https : http;
            redirectClient.get(response.headers.location, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2: any) => {
              const chunks: Buffer[] = [];
              res2.on('data', (c: Buffer) => chunks.push(c));
              res2.on('end', () => resolve(Buffer.concat(chunks)));
              res2.on('error', reject);
            }).on('error', reject);
            return;
          }
          if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode}`));
          const chunks: Buffer[] = [];
          response.on('data', (c: Buffer) => chunks.push(c));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        });
        request.on('error', reject);
        request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
      });
      const contentMatch = url.match(/\.(png|jpg|jpeg|webp|gif)/i);
      let ext = '.jpg';
      if (contentMatch) ext = '.' + contentMatch[1].toLowerCase();
      if (ext === '.jpeg') ext = '.jpg';
      const savedFilename = `img-${Date.now()}${ext}`;
      return await saveImageToDb(savedFilename, imageData, ext);
    } catch (e: any) {
      console.warn('persistImageOnServer failed for:', url, e.message);
      return url;
    }
  }

  app.post("/api/admin/banners", async (req: Request, res: Response) => {
    try {
      const { sectionId, imageUrl, linkType, linkValue, sortOrder, visible, language } = req.body;
      const persistedUrl = await persistImageOnServer(imageUrl);
      const [banner] = await db
        .insert(homepageBanners)
        .values({
          sectionId,
          imageUrl: persistedUrl,
          linkType: linkType || "collection",
          linkValue: linkValue || null,
          sortOrder: sortOrder ?? 0,
          visible: visible ?? true,
          language: language || "both",
        })
        .returning();
      res.json(banner);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/banners/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { imageUrl, linkType, linkValue, sortOrder, visible, language } = req.body;
      const persistedUrl = await persistImageOnServer(imageUrl);
      const [banner] = await db
        .update(homepageBanners)
        .set({ imageUrl: persistedUrl, linkType, linkValue, sortOrder, visible, language: language || "both" })
        .where(sql`${homepageBanners.id} = ${id}`)
        .returning();
      res.json(banner);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/banners/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(homepageBanners).where(sql`${homepageBanners.id} = ${id}`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/settings", async (_req: Request, res: Response) => {
    try {
      const settings = await db.select().from(appSettings);
      const settingsMap: Record<string, string> = {};
      settings.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      res.json(settingsMap);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/settings", async (req: Request, res: Response) => {
    try {
      const entries = Object.entries(req.body) as [string, string][];
      for (const [key, value] of entries) {
        await db
          .insert(appSettings)
          .values({ key, value, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: appSettings.key,
            set: { value, updatedAt: new Date() },
          });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/notifications", async (_req: Request, res: Response) => {
    try {
      const all = await db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt));
      res.json(all);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/notifications", async (req: Request, res: Response) => {
    try {
      const { titleAr, titleEn, bodyAr, bodyEn, imageUrl, linkType, linkValue } = req.body;
      if (!titleAr || !titleEn) {
        return res.status(400).json({ error: "Title AR and EN are required" });
      }
      const [created] = await db
        .insert(notifications)
        .values({ titleAr, titleEn, bodyAr, bodyEn, imageUrl, linkType: linkType || "none", linkValue })
        .returning();

      sendPushNotifications(created).catch(err => console.error("Push notification error:", err));

      res.json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/notifications/:id", async (req: Request, res: Response) => {
    try {
      await db.delete(notifications).where(eq(notifications.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/shopify-collections", async (_req: Request, res: Response) => {
    try {
      const pagedQuery = `query($first: Int!, $after: String) {
        collections(first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges { node { id title handle description image { url altText } } }
        }
      }`;
      const allNodes: any[] = [];
      let hasNext = true;
      let cursor: string | null = null;
      while (hasNext) {
        const vars: any = { first: 250 };
        if (cursor) vars.after = cursor;
        const data = await shopifyAdminGraphQL(pagedQuery, vars);
        const edges = data.collections?.edges || [];
        edges.forEach((e: any) => allNodes.push(e.node));
        hasNext = data.collections?.pageInfo?.hasNextPage || false;
        cursor = data.collections?.pageInfo?.endCursor || null;
      }
      const merged = allNodes.map((c: any) => ({
        handle: c.handle,
        titleEn: c.title,
        titleAr: c.title,
        imageUrl: c.image?.url || null,
        descriptionEn: c.description,
        descriptionAr: c.description,
      }));
      res.json(merged);
    } catch (error: any) {
      console.error("Error fetching Shopify collections:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/search-products", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string) || '';
      const activeQuery = q ? `${q} status:active` : 'status:active';
      const data = await shopifyAdminGraphQL(ADMIN_QUERIES.PRODUCTS, { first: 20, query: activeQuery, sortKey: 'TITLE' });
      const products = data.products.edges.map((e: any) => mapAdminProduct(e.node));
      const result = products.map((p: any) => ({
        handle: p.handle,
        titleEn: p.title,
        titleAr: p.title,
        vendor: p.vendor || '',
        imageUrl: p.images?.edges?.[0]?.node?.url || null,
        price: p.priceRange?.minVariantPrice?.amount || '0',
        compareAtPrice: p.compareAtPriceRange?.minVariantPrice?.amount || null,
        currency: p.priceRange?.minVariantPrice?.currencyCode || 'JOD',
        description: p.description || '',
        descriptionAr: p.description || '',
      }));
      res.json(result);
    } catch (error: any) {
      console.error("Error searching products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/search-vendors", async (req: Request, res: Response) => {
    try {
      const q = ((req.query.q as string) || '').trim();
      if (!q || q.length < 1) return res.json([]);
      const data = await shopifyAdminGraphQL(`query { products(first: 50, query: "vendor:${q} status:active") { edges { node { vendor featuredImage { url } images(first:1){edges{node{url}}} metafield(namespace:"brand", key:"logo") { reference { ... on MediaImage { image { url } } } } } } } }`);
      const products: any[] = data.products.edges.map((e: any) => e.node);
      const vendorMap = new Map<string, { name: string; imageUrl: string | null }>();
      for (const p of products) {
        if (!p.vendor) continue;
        if (!vendorMap.has(p.vendor)) {
          const brandLogo = p.metafield?.reference?.image?.url || null;
          const productImg = p.images?.edges?.[0]?.node?.url || p.featuredImage?.url || null;
          vendorMap.set(p.vendor, { name: p.vendor, imageUrl: brandLogo || productImg });
        }
      }
      res.json(Array.from(vendorMap.values()));
    } catch (error: any) {
      console.error("Error searching vendors:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  let _collectionsCache: { data: any[]; timestamp: number } | null = null;
  const COLLECTIONS_CACHE_TTL = 5 * 60 * 1000;

  async function fetchAllAdminCollections(): Promise<any[]> {
    if (_collectionsCache && (Date.now() - _collectionsCache.timestamp) < COLLECTIONS_CACHE_TTL) {
      return _collectionsCache.data;
    }
    async function fetchPage(_language: string): Promise<any[]> {
      const allNodes: any[] = [];
      let hasNext = true;
      let cursor: string | null = null;
      const query = `query($first:Int!,$after:String) {
        collections(first:$first, after:$after) {
          pageInfo { hasNextPage endCursor }
          edges { node { id handle title image { url } } }
        }
      }`;
      while (hasNext) {
        const vars: any = { first: 250 };
        if (cursor) vars.after = cursor;
        const data = await shopifyAdminGraphQL(query, vars);
        const edges = data.collections?.edges || [];
        edges.forEach((e: any) => allNodes.push(e.node));
        hasNext = data.collections?.pageInfo?.hasNextPage || false;
        cursor = data.collections?.pageInfo?.endCursor || null;
      }
      return allNodes;
    }

    const enCols = await fetchPage('en');
    console.log(`[Collections] Fetched ${enCols.length} collections from Shopify`);

    let arCols: any[] = [];
    try {
      const arQuery = `query($first:Int!,$after:String) {
        translatableResources(resourceType: COLLECTION, first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges { node { resourceId translations(locale:"ar") { key value } } }
        }
      }`;
      const arTranslations: Record<string, string> = {};
      let hasNext = true;
      let cursor: string | null = null;
      while (hasNext) {
        const vars: any = { first: 250 };
        if (cursor) vars.after = cursor;
        try {
          const data = await shopifyAdminGraphQL(arQuery, vars);
          const edges = data.translatableResources?.edges || [];
          for (const e of edges) {
            const titleTranslation = e.node.translations?.find((t: any) => t.key === 'title');
            if (titleTranslation) {
              const gid = e.node.resourceId;
              arTranslations[gid] = titleTranslation.value;
            }
          }
          hasNext = data.translatableResources?.pageInfo?.hasNextPage || false;
          cursor = data.translatableResources?.pageInfo?.endCursor || null;
        } catch {
          hasNext = false;
        }
      }
      arCols = enCols.map((c: any) => {
        const arTitle = arTranslations[c.id] || null;
        return { ...c, arTitle };
      });
    } catch {
      arCols = enCols.map((c: any) => ({ ...c, arTitle: null }));
    }

    const all = enCols.map((en: any, i: number) => ({
      handle: en.handle,
      titleEn: en.title,
      titleAr: arCols[i]?.arTitle || en.title,
      imageUrl: en.image?.url || null,
    }));

    _collectionsCache = { data: all, timestamp: Date.now() };
    return all;
  }

  app.get("/api/admin/search-collections", async (req: Request, res: Response) => {
    try {
      const q = ((req.query.q as string) || '').trim().toLowerCase();
      let all = await fetchAllAdminCollections();
      if (q) {
        all = all.filter((c: any) =>
          (c.titleEn || '').toLowerCase().includes(q) ||
          (c.titleAr || '').toLowerCase().includes(q) ||
          (c.handle || '').toLowerCase().includes(q)
        );
      }
      all.sort((a: any, b: any) => (a.titleAr || a.titleEn).localeCompare(b.titleAr || b.titleEn, 'ar'));
      res.json(all);
    } catch (error: any) {
      console.error("Error searching collections:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/search-products", async (req: Request, res: Response) => {
    try {
      const q = ((req.query.q as string) || '').trim();
      if (!q || q.length < 1) return res.json([]);
      const activeQuery = `${q} status:active`;
      const data = await shopifyAdminGraphQL(ADMIN_QUERIES.SEARCH_PRODUCTS, { query: activeQuery, first: 12 });
      const products: any[] = data.products.edges.map((e: any) => mapAdminProduct(e.node));
      const result = products.map((p: any) => {
        const price = p.priceRange?.minVariantPrice?.amount || '0';
        const compareAt = p.compareAtPriceRange?.minVariantPrice?.amount || null;
        return {
          handle: p.handle,
          titleEn: p.title,
          titleAr: p.title,
          imageUrl: p.images?.edges?.[0]?.node?.url || null,
          price,
          compareAtPrice: compareAt && parseFloat(compareAt) > parseFloat(price) ? compareAt : null,
          currency: p.priceRange?.minVariantPrice?.currencyCode || 'JOD',
          description: p.description || '',
          descriptionAr: p.description || '',
        };
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error searching products:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/suggested-products", async (_req: Request, res: Response) => {
    try {
      const all = await db.select().from(suggestedProducts).orderBy(asc(suggestedProducts.sortOrder));
      res.json(all);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/suggested-products", async (req: Request, res: Response) => {
    try {
      const { productHandle, titleAr, titleEn, imageUrl, sortOrder, visible } = req.body;
      if (!productHandle) return res.status(400).json({ error: "productHandle is required" });
      const [item] = await db.insert(suggestedProducts).values({
        productHandle,
        titleAr: titleAr || null,
        titleEn: titleEn || null,
        imageUrl: imageUrl || null,
        sortOrder: sortOrder || 0,
        visible: visible !== false,
      }).returning();
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/suggested-products/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { productHandle, titleAr, titleEn, imageUrl, sortOrder, visible } = req.body;
      const [item] = await db.update(suggestedProducts)
        .set({ productHandle, titleAr, titleEn, imageUrl, sortOrder, visible })
        .where(eq(suggestedProducts.id, id))
        .returning();
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/suggested-products/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(suggestedProducts).where(eq(suggestedProducts.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/categories/sync-names", async (_req: Request, res: Response) => {
    try {
      const collQuery = `query($first:Int!,$language:LanguageCode) @inContext(language:$language) {collections(first:$first){edges{node{handle title image{url}}}}}`;
      const [arData, enData] = await Promise.all([
        shopifyFetch(collQuery, { first: 250, language: 'AR' }),
        shopifyFetch(collQuery, { first: 250, language: 'EN' }),
      ]);
      const arByHandle: Record<string, string> = {};
      const enByHandle: Record<string, string> = {};
      const imgByHandle: Record<string, string> = {};
      (arData.collections?.edges || []).forEach((e: any) => {
        arByHandle[e.node.handle] = e.node.title;
        if (e.node.image?.url) imgByHandle[e.node.handle] = e.node.image.url;
      });
      (enData.collections?.edges || []).forEach((e: any) => {
        enByHandle[e.node.handle] = e.node.title;
        if (e.node.image?.url && !imgByHandle[e.node.handle]) imgByHandle[e.node.handle] = e.node.image.url;
      });

      async function translateToAr(text: string): Promise<string> {
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
          const resp = await fetch(url);
          if (!resp.ok) return text;
          const data = await resp.json();
          if (Array.isArray(data) && Array.isArray(data[0])) {
            return data[0].map((seg: any) => seg[0]).join('');
          }
          return text;
        } catch { return text; }
      }

      const allCats = await db.select().from(categories);
      let updated = 0;
      for (const cat of allCats) {
        if (!cat.collectionHandle) continue;
        const arTitle = arByHandle[cat.collectionHandle];
        const enTitle = enByHandle[cat.collectionHandle];
        const img = imgByHandle[cat.collectionHandle];
        if (!arTitle && !enTitle) continue;
        const updates: any = {};
        if (enTitle) updates.titleEn = enTitle;
        if (arTitle && arTitle !== enTitle) {
          updates.titleAr = arTitle;
        } else if (enTitle) {
          const translated = await translateToAr(enTitle);
          updates.titleAr = translated;
        }
        if (img && !cat.imageUrl) updates.imageUrl = img;
        if (Object.keys(updates).length > 0) {
          await db.update(categories).set(updates).where(eq(categories.id, cat.id));
          updated++;
        }
      }
      res.json({ success: true, updated, total: allCats.length });
    } catch (error: any) {
      console.error("Error syncing category names:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/categories", async (_req: Request, res: Response) => {
    try {
      const all = await db
        .select()
        .from(categories)
        .orderBy(asc(categories.sortOrder));
      res.json(all);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/categories/reorder", async (req: Request, res: Response) => {
    try {
      const { order } = req.body;
      if (!order || !Array.isArray(order)) return res.status(400).json({ error: "order array required" });
      for (let i = 0; i < order.length; i++) {
        await db
          .update(categories)
          .set({ sortOrder: i })
          .where(eq(categories.id, order[i]));
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/categories", async (req: Request, res: Response) => {
    try {
      const { parentId, titleAr, titleEn, imageUrl, collectionHandle, sortOrder, visible } = req.body;
      if (!titleAr || !titleEn) {
        return res.status(400).json({ error: "Title AR and EN are required" });
      }
      const [created] = await db
        .insert(categories)
        .values({
          parentId: parentId || null,
          titleAr,
          titleEn,
          imageUrl: imageUrl || null,
          collectionHandle: collectionHandle || null,
          sortOrder: sortOrder || 0,
          visible: visible !== false,
        })
        .returning();
      res.json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/categories/:id", async (req: Request, res: Response) => {
    try {
      const { titleAr, titleEn, imageUrl, collectionHandle, sortOrder, visible, parentId } = req.body;
      const [updated] = await db
        .update(categories)
        .set({
          titleAr,
          titleEn,
          imageUrl: imageUrl || null,
          collectionHandle: collectionHandle || null,
          sortOrder: sortOrder || 0,
          visible: visible !== false,
          parentId: parentId || null,
        })
        .where(eq(categories.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/categories/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      async function deleteRecursive(catId: string) {
        const children = await db.select().from(categories).where(eq(categories.parentId, catId));
        for (const child of children) {
          await deleteRecursive(child.id);
        }
        await db.delete(categories).where(eq(categories.id, catId));
      }
      await deleteRecursive(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

}

#!/usr/bin/env node
/**
 * Safe migration script: only syncs DB schema to production.
 * Does NOT overwrite any production data.
 * Only copies data if production is completely empty.
 * Usage: node scripts/migrate-to-prod.js
 */

const PROD_URL = 'https://ecom-manager.replit.app';
const DEV_URL  = 'http://localhost:5000';

const sessionCookies = {};

async function adminLogin(base) {
  try {
    const res = await fetch(`${base}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'xmart2026' }),
      redirect: 'manual',
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('json')) {
      console.log(`  ⚠ ${base} has no auth (skipping login)`);
      return;
    }
    const setCookie = res.headers.getSetCookie?.() || [];
    const cookies = setCookie.map(c => c.split(';')[0]).join('; ');
    sessionCookies[base] = cookies;
    const data = await res.json();
    if (!data.success) throw new Error(`Login failed for ${base}`);
    console.log(`  ✓ Logged in to ${base}`);
  } catch (e) {
    console.log(`  ⚠ ${base} login skipped: ${e.message}`);
  }
}

async function api(base, path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionCookies[base]) headers['Cookie'] = sessionCookies[base];
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${base}${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function migrate() {
  console.log('🚀 Safe migration check...\n');

  console.log('🔑 Logging in...');
  await adminLogin(DEV_URL);
  await adminLogin(PROD_URL);
  console.log('');

  const prodSections = await api(PROD_URL, '/api/admin/sections');
  const prodCats = await api(PROD_URL, '/api/admin/categories');

  if (prodSections.length > 0 || prodCats.length > 0) {
    console.log(`✅ Production already has data (${prodSections.length} sections, ${prodCats.length} categories).`);
    console.log('   Skipping migration to protect your production changes.');
    console.log('   Use the admin dashboard to make changes: https://ecom-manager.replit.app/admin');
    return;
  }

  console.log('📦 Production is empty — copying initial data from dev...\n');

  /* ── 1. App Settings ── */
  console.log('📋 Migrating app settings...');
  const settings = await api(DEV_URL, '/api/admin/settings');
  for (const [key, value] of Object.entries(settings)) {
    if (!value) continue;
    try {
      await api(PROD_URL, '/api/admin/settings', 'PUT', { [key]: value });
      process.stdout.write('.');
    } catch (e) { console.warn(`\n  ⚠ Setting ${key}: ${e.message}`); }
  }
  console.log(' ✓\n');

  /* ── 2. Categories (3-level tree) ── */
  console.log('📂 Migrating categories...');
  const devCats = await api(DEV_URL, '/api/admin/categories');
  const catIdMap = {};

  const sorted = [];
  const add = (parentId) => {
    devCats.filter(c => (c.parentId || null) === parentId).forEach(c => {
      sorted.push(c);
      add(c.id);
    });
  };
  add(null);

  for (const cat of sorted) {
    try {
      const newCat = await api(PROD_URL, '/api/admin/categories', 'POST', {
        parentId: cat.parentId ? catIdMap[cat.parentId] : null,
        titleAr: cat.titleAr,
        titleEn: cat.titleEn,
        imageUrl: cat.imageUrl || null,
        collectionHandle: cat.collectionHandle || null,
        sortOrder: cat.sortOrder || 0,
        visible: cat.visible,
      });
      catIdMap[cat.id] = newCat.id;
      process.stdout.write('.');
    } catch (e) { console.warn(`\n  ⚠ Category ${cat.titleAr}: ${e.message}`); }
  }
  console.log(` ✓ (${sorted.length} categories)\n`);

  /* ── 3. Homepage Sections + Banners ── */
  console.log('🏠 Migrating homepage sections...');
  const devSections = await api(DEV_URL, '/api/admin/sections');

  for (const section of devSections) {
    try {
      let metadataObj = null;
      if (section.metadata) {
        try {
          metadataObj = JSON.parse(section.metadata);
          if (metadataObj.categoryIds && metadataObj.categoryIds.length > 0) {
            metadataObj.categoryIds = metadataObj.categoryIds
              .map(oldId => catIdMap[oldId])
              .filter(Boolean);
          }
        } catch {}
      }

      const newSection = await api(PROD_URL, '/api/admin/sections', 'POST', {
        type: section.type,
        titleAr: section.titleAr || '',
        titleEn: section.titleEn || '',
        language: section.language || 'both',
        sortOrder: section.sortOrder || 0,
        visible: section.visible,
        metadata: metadataObj,
      });
      process.stdout.write('.');

      if (section.banners && section.banners.length > 0) {
        for (const banner of section.banners) {
          try {
            await api(PROD_URL, '/api/admin/banners', 'POST', {
              sectionId: newSection.id,
              imageUrl: banner.imageUrl,
              linkType: banner.linkType || 'collection',
              linkValue: banner.linkValue || '',
              sortOrder: banner.sortOrder || 0,
              visible: banner.visible,
            });
            process.stdout.write(',');
          } catch (e) { console.warn(`\n  ⚠ Banner: ${e.message}`); }
        }
      }
    } catch (e) { console.warn(`\n  ⚠ Section ${section.type}: ${e.message}`); }
  }
  console.log(` ✓ (${devSections.length} sections)\n`);

  /* ── 4. Suggested Products ── */
  console.log('🎯 Migrating suggested products...');
  const devSuggested = await api(DEV_URL, '/api/admin/suggested-products');
  for (const sp of devSuggested) {
    try {
      await api(PROD_URL, '/api/admin/suggested-products', 'POST', {
        productHandle: sp.productHandle,
        titleAr: sp.titleAr || '',
        titleEn: sp.titleEn || '',
        imageUrl: sp.imageUrl || null,
        sortOrder: sp.sortOrder || 0,
        visible: sp.visible,
      });
      process.stdout.write('.');
    } catch (e) { console.warn(`\n  ⚠ Suggested ${sp.productHandle}: ${e.message}`); }
  }
  console.log(` ✓ (${devSuggested.length} suggested products)\n`);

  console.log('✅ Initial data copied! Open https://ecom-manager.replit.app/admin to verify.');
}

migrate().catch(e => { console.error('\n❌ Migration failed:', e.message); process.exit(1); });

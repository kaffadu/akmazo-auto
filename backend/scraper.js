const puppeteer = require('puppeteer-core');
const chromium  = require('@sparticuz/chromium');
const { Pool }  = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function launchBrowser() {
  return puppeteer.launch({
    args:            chromium.args,
    executablePath:  await chromium.executablePath(),
    headless:        chromium.headless,
    defaultViewport: { width: 1280, height: 900 }
  });
}

// ===== IAA — intercept internal API calls =====
async function scrapeIAA() {
  const browser = await launchBrowser();
  const results = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });

    // Intercept JSON responses from IAA's internal API
    let captured = null;
    page.on('response', async response => {
      try {
        const url  = response.url();
        const type = response.headers()['content-type'] || '';
        if (!type.includes('json')) return;
        if (!url.includes('iaai.com')) return;

        const json = await response.json().catch(() => null);
        if (!json) return;

        console.log('IAA API hit:', url);

        // Look for an array of vehicles in the response
        const candidates = [json.items, json.data, json.vehicles, json.results, json.lots, json.inventories];
        for (const c of candidates) {
          if (Array.isArray(c) && c.length > 0) {
            captured = c;
            console.log(`IAA captured ${c.length} items from: ${url}`);
            break;
          }
        }
      } catch {}
    });

    console.log('Scraping IAA Buy Now...');
    await page.goto('https://www.iaai.com/Search?SearchText=&auctiontypes=BUY_NOW&paging.startIndex=0&paging.rows=24', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    // Wait for API calls to fire
    await new Promise(r => setTimeout(r, 12000));

    // Scroll to trigger lazy-loaded content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await new Promise(r => setTimeout(r, 5000));

    if (captured) {
      for (const item of captured.slice(0, 20)) {
        // IAA API field names vary — try common patterns
        const make  = item.make  || item.vehicleMake  || item.Make  || '';
        const model = item.model || item.vehicleModel || item.Model || '';
        const year  = item.year  || item.vehicleYear  || item.Year  || null;
        const price = item.buyNowPrice || item.price || item.salePrice || item.currentBid || '';
        const img   = item.imageUrl || item.primaryImageUrl || item.thumbnailUrl || item.image || '';
        const url   = item.url || item.detailUrl || item.vehicleUrl || '';
        const cond  = item.primaryDamage || item.damageType || item.condition || '';

        if (!make && !model) continue;

        results.push({
          make:        make || 'Unknown',
          model:       model || 'Unknown',
          year:        year ? parseInt(year) : null,
          price:       String(price).replace(/[^0-9.]/g, ''),
          condition:   cond,
          source:      'IAA',
          badge:       'BUY NOW',
          image_url:   img,
          listing_url: url.startsWith('http') ? url : `https://www.iaai.com${url}`
        });
      }
    } else {
      console.log('IAA: no API response captured — site may be blocking the scraper');
    }

    console.log(`IAA: extracted ${results.length} listings`);
  } catch (err) {
    console.error('IAA scrape error:', err.message);
  } finally {
    await browser.close();
  }

  return results;
}

// ===== COPART — intercept internal API calls =====
async function scrapeCopart() {
  const browser = await launchBrowser();
  const results = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    let captured = null;
    page.on('response', async response => {
      try {
        const url  = response.url();
        const type = response.headers()['content-type'] || '';
        if (!type.includes('json')) return;
        if (!url.includes('copart.com')) return;

        const json = await response.json().catch(() => null);
        if (!json) return;

        console.log('Copart API hit:', url);

        const candidates = [
          json?.data?.results?.content,
          json?.data?.lots,
          json?.results,
          json?.lots,
          json?.content
        ];
        for (const c of candidates) {
          if (Array.isArray(c) && c.length > 0) {
            captured = c;
            console.log(`Copart captured ${c.length} items from: ${url}`);
            break;
          }
        }
      } catch {}
    });

    console.log('Scraping Copart...');
    await page.goto('https://www.copart.com/search/#?query=TOYOTA%20HONDA%20HYUNDAI', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    await new Promise(r => setTimeout(r, 12000));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await new Promise(r => setTimeout(r, 5000));

    if (captured) {
      for (const item of captured.slice(0, 20)) {
        const make  = item.make  || item.mkn  || item.vehicleMake  || '';
        const model = item.model || item.mmt  || item.vehicleModel || '';
        const year  = item.year  || item.lcy  || item.vehicleYear  || null;
        const price = item.currentBid || item.odds || item.salePrice || '';
        const img   = item.imageUrl || item.tims || item.thumbnail  || '';
        const lotId = item.lotId || item.ln || item.lotNumber || '';
        const cond  = item.primaryDamage || item.dd || item.damageType || '';

        if (!make && !model) continue;

        results.push({
          make:        make || 'Unknown',
          model:       model || 'Unknown',
          year:        year ? parseInt(year) : null,
          price:       String(price).replace(/[^0-9.]/g, ''),
          condition:   cond,
          source:      'Copart',
          badge:       'AUCTION',
          image_url:   img,
          listing_url: lotId ? `https://www.copart.com/lot/${lotId}` : ''
        });
      }
    } else {
      console.log('Copart: no API response captured — site may be blocking the scraper');
    }

    console.log(`Copart: extracted ${results.length} listings`);
  } catch (err) {
    console.error('Copart scrape error:', err.message);
  } finally {
    await browser.close();
  }

  return results;
}

// ===== SAVE TO DB (skip duplicates) =====
async function saveListings(listings) {
  let saved = 0;
  for (const l of listings) {
    try {
      if (l.listing_url) {
        const exists = await pool.query('SELECT id FROM listings WHERE listing_url = $1', [l.listing_url]);
        if (exists.rows.length > 0) continue;
      }
      await pool.query(
        `INSERT INTO listings (make, model, year, price, condition, badge, source, image_url, listing_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [l.make, l.model, l.year, l.price, l.condition, l.badge, l.source, l.image_url, l.listing_url]
      );
      saved++;
    } catch (err) {
      console.error('Save error:', err.message);
    }
  }
  return saved;
}

// ===== MAIN =====
async function runScraper() {
  console.log(`[${new Date().toISOString()}] Scraper started`);
  const iaaResults    = await scrapeIAA();
  const copartResults = await scrapeCopart();
  const all           = [...iaaResults, ...copartResults];
  const saved         = await saveListings(all);
  console.log(`[${new Date().toISOString()}] Done — scraped ${all.length}, saved ${saved} new`);
  return { iaa: iaaResults.length, copart: copartResults.length, saved };
}

module.exports = { runScraper };

const puppeteer = require('puppeteer-core');
const chromium  = require('@sparticuz/chromium');
const { Pool }  = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function launchBrowser() {
  return puppeteer.launch({
    args:           chromium.args,
    executablePath: await chromium.executablePath(),
    headless:       chromium.headless,
    defaultViewport: { width: 1280, height: 900 }
  });
}

// ===== IAA BUY NOW SCRAPER =====
async function scrapeIAA() {
  const browser = await launchBrowser();
  const results = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    console.log('Scraping IAA Buy Now...');
    await page.goto('https://www.iaai.com/Search?SearchText=&auctiontypes=BUY_NOW&paging.startIndex=0&paging.rows=24', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Let JS finish rendering
    await new Promise(r => setTimeout(r, 4000));

    const raw = await page.evaluate(() => {
      // IAA uses multiple possible class patterns — try all
      const selectors = [
        '[class*="vehicle-card"]',
        '[class*="VehicleCard"]',
        '[class*="listing"]',
        '[class*="search-result"]',
        'li[class*="item"]',
        '.row[class*="vehicle"]'
      ];

      let cards = [];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length >= 3) { cards = Array.from(found); break; }
      }

      return cards.slice(0, 20).map(card => {
        const img      = card.querySelector('img');
        const allLinks = card.querySelectorAll('a[href]');
        const link     = Array.from(allLinks).find(a => a.href.includes('/vehicle/') || a.href.includes('/VehicleDetails')) || allLinks[0];
        const texts    = card.querySelectorAll('h1,h2,h3,h4,p,span,div');
        const allText  = Array.from(texts).map(t => t.textContent.trim()).filter(Boolean);

        return {
          image_url:   img?.src || img?.getAttribute('data-src') || '',
          listing_url: link?.href || '',
          all_text:    allText
        };
      });
    });

    for (const item of raw) {
      if (!item.listing_url || !item.image_url) continue;

      // Find year (4 digits starting with 19 or 20)
      const yearMatch = item.all_text.join(' ').match(/\b(19|20)\d{2}\b/);
      const year      = yearMatch ? parseInt(yearMatch[0]) : null;

      // Find price (Buy Now price)
      const priceMatch = item.all_text.join(' ').match(/\$\s?[\d,]+/);
      const price      = priceMatch ? priceMatch[0].replace(/[$,\s]/g, '') : '';

      // Find condition/damage
      const damageTerms = ['Run and Drive', 'Starts', 'Stationary', 'Enhanced Vehicle', 'Burn', 'Hail', 'Water', 'Collision', 'Normal Wear'];
      const condition   = item.all_text.find(t => damageTerms.some(d => t.includes(d))) || '';

      // Extract make/model from text containing the year
      const titleLine = item.all_text.find(t => yearMatch && t.includes(yearMatch[0])) || '';
      const afterYear = titleLine.split(yearMatch?.[0] || '').pop()?.trim() || '';
      const parts     = afterYear.split(/\s+/).filter(Boolean);
      const make      = parts[0] || 'Unknown';
      const model     = parts.slice(1, 3).join(' ') || 'Unknown';

      results.push({
        make,
        model,
        year,
        price,
        condition,
        source:      'IAA',
        badge:       'BUY NOW',
        image_url:   item.image_url,
        listing_url: item.listing_url.startsWith('http') ? item.listing_url : `https://www.iaai.com${item.listing_url}`
      });
    }

    console.log(`IAA: found ${results.length} listings`);
  } catch (err) {
    console.error('IAA scrape error:', err.message);
  } finally {
    await browser.close();
  }

  return results;
}

// ===== COPART SCRAPER =====
async function scrapeCopart() {
  const browser = await launchBrowser();
  const results = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    console.log('Scraping Copart...');
    await page.goto('https://www.copart.com/search/#?query=toyota honda hyundai lexus&searchCriteria=', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(r => setTimeout(r, 5000));

    const raw = await page.evaluate(() => {
      const selectors = [
        'tr.lot-row',
        '[class*="lot-card"]',
        '[class*="vehicle-card"]',
        '[class*="search-result"]',
        'tr[data-uname]'
      ];

      let cards = [];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length >= 3) { cards = Array.from(found); break; }
      }

      return cards.slice(0, 20).map(card => {
        const img      = card.querySelector('img');
        const allLinks = card.querySelectorAll('a[href]');
        const link     = Array.from(allLinks).find(a => a.href.includes('/lot/') || a.href.includes('lotDetails')) || allLinks[0];
        const texts    = Array.from(card.querySelectorAll('span,td,div,p,h1,h2,h3'))
                           .map(t => t.textContent.trim()).filter(Boolean);

        return {
          image_url:   img?.src || img?.getAttribute('data-src') || '',
          listing_url: link?.href || '',
          all_text:    texts
        };
      });
    });

    for (const item of raw) {
      if (!item.listing_url || !item.image_url) continue;

      const yearMatch  = item.all_text.join(' ').match(/\b(19|20)\d{2}\b/);
      const year       = yearMatch ? parseInt(yearMatch[0]) : null;
      const priceMatch = item.all_text.join(' ').match(/\$\s?[\d,]+/);
      const price      = priceMatch ? priceMatch[0].replace(/[$,\s]/g, '') : '';

      const damageTerms = ['Collision', 'Water', 'Fire', 'Hail', 'Normal Wear', 'Mechanical', 'Rollover', 'Theft'];
      const condition   = item.all_text.find(t => damageTerms.some(d => t.includes(d))) || '';

      const titleLine = item.all_text.find(t => yearMatch && t.includes(yearMatch[0])) || '';
      const afterYear = titleLine.split(yearMatch?.[0] || '').pop()?.trim() || '';
      const parts     = afterYear.split(/\s+/).filter(Boolean);
      const make      = parts[0] || 'Unknown';
      const model     = parts.slice(1, 3).join(' ') || 'Unknown';

      results.push({
        make,
        model,
        year,
        price,
        condition,
        source:      'Copart',
        badge:       'AUCTION',
        image_url:   item.image_url,
        listing_url: item.listing_url.startsWith('http') ? item.listing_url : `https://www.copart.com${item.listing_url}`
      });
    }

    console.log(`Copart: found ${results.length} listings`);
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
      const exists = await pool.query('SELECT id FROM listings WHERE listing_url = $1', [l.listing_url]);
      if (exists.rows.length > 0) continue;

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

// ===== MAIN RUN =====
async function runScraper() {
  console.log(`[${new Date().toISOString()}] Scraper started`);

  // Run sequentially to avoid memory pressure
  const iaaResults    = await scrapeIAA();
  const copartResults = await scrapeCopart();
  const all           = [...iaaResults, ...copartResults];

  const saved = await saveListings(all);
  console.log(`[${new Date().toISOString()}] Done — scraped ${all.length}, saved ${saved} new`);

  return { iaa: iaaResults.length, copart: copartResults.length, saved };
}

module.exports = { runScraper };

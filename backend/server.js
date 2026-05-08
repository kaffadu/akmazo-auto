const express  = require('express');
const cors     = require('cors');
const cron     = require('node-cron');
const { Pool } = require('pg');
const { runScraper } = require('./scraper');

const app  = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({
  origin: [
    'https://www.akmazoglobal.com',
    'https://kaffadu.github.io',
    'http://localhost:3000'
  ]
}));
app.use(express.json());

// ===== DB INIT =====
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id          SERIAL PRIMARY KEY,
      make        VARCHAR(100) NOT NULL,
      model       VARCHAR(100) NOT NULL,
      year        INT,
      price       VARCHAR(50),
      condition   VARCHAR(100),
      engine      VARCHAR(100),
      drive       VARCHAR(50),
      badge       VARCHAR(50),
      source      VARCHAR(20)  DEFAULT 'IAA',
      image_url   TEXT,
      listing_url TEXT UNIQUE,
      active      BOOLEAN      DEFAULT true,
      created_at  TIMESTAMP    DEFAULT NOW()
    )
  `);
  console.log('Database ready');
}

initDB().catch(console.error);

// ===== CRON: scrape every 6 hours =====
cron.schedule('0 */6 * * *', async () => {
  console.log('Running scheduled scrape...');
  try {
    await runScraper();
  } catch (err) {
    console.error('Scheduled scrape failed:', err.message);
  }
});

// Run once on startup (after 10s to let DB init finish)
setTimeout(async () => {
  try {
    await runScraper();
  } catch (err) {
    console.error('Startup scrape failed:', err.message);
  }
}, 10000);

// ===== ROUTES =====

app.get('/', (req, res) => res.json({ status: 'Akmazo API running' }));

// GET active listings
app.get('/api/listings', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM listings WHERE active = true ORDER BY created_at DESC LIMIT 12'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// POST manual listing (protected)
app.post('/api/listings', async (req, res) => {
  if (req.headers['x-api-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { make, model, year, price, condition, engine, drive, badge, source, image_url, listing_url } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO listings (make, model, year, price, condition, engine, drive, badge, source, image_url, listing_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [make, model, year, price, condition, engine, drive, badge, source, image_url, listing_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add listing' });
  }
});

// DELETE listing (soft-delete, protected)
app.delete('/api/listings/:id', async (req, res) => {
  if (req.headers['x-api-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await pool.query('UPDATE listings SET active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove listing' });
  }
});

// Manual scrape trigger (protected)
app.post('/api/scrape', async (req, res) => {
  if (req.headers['x-api-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ message: 'Scrape started' });
  try {
    await runScraper();
  } catch (err) {
    console.error('Manual scrape failed:', err.message);
  }
});

app.listen(PORT, () => console.log(`Akmazo API running on port ${PORT}`));

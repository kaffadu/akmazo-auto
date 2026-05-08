const express  = require('express');
const cors     = require('cors');
const { Pool } = require('pg');

const app  = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({
  origin: [
    'https://www.akmazoglobal.com',
    'https://akmazoglobal.com',
    'https://kaffadu.github.io',
    'http://localhost:3000'
  ]
}));
app.use(express.json());

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
      listing_url TEXT,
      active      BOOLEAN      DEFAULT true,
      created_at  TIMESTAMP    DEFAULT NOW()
    )
  `);
  console.log('Database ready');
}

initDB().catch(console.error);

function authCheck(req, res, next) {
  if (req.headers['x-api-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Health check
app.get('/', (req, res) => res.json({ status: 'Akmazo API running' }));

// GET all active listings
app.get('/api/listings', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM listings WHERE active = true ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET all listings including inactive (admin)
app.get('/api/admin/listings', authCheck, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM listings ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// POST new listing
app.post('/api/listings', authCheck, async (req, res) => {
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

// PATCH toggle active status
app.patch('/api/listings/:id', authCheck, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE listings SET active = NOT active WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE listing permanently
app.delete('/api/listings/:id', authCheck, async (req, res) => {
  try {
    await pool.query('DELETE FROM listings WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

app.listen(PORT, () => console.log(`Akmazo API running on port ${PORT}`));

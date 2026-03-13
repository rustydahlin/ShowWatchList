const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;
const DATA_FILE = path.join(__dirname, 'data', 'watchlist.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  // migrate from old array-only format
  if (Array.isArray(raw)) return { name: null, items: raw };
  return raw;
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET config (name)
app.get('/api/config', (req, res) => {
  const { name } = readData();
  res.json({ name });
});

// PUT config (name)
app.put('/api/config', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  const data = readData();
  data.name = name.trim();
  writeData(data);
  res.json({ name: data.name });
});

// GET all items
app.get('/api/items', (req, res) => {
  res.json(readData().items);
});

// POST add new item
app.post('/api/items', (req, res) => {
  const { title, type } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'title and type required' });

  const data = readData();
  const newItem = {
    id: Date.now().toString(),
    title,
    type,
    watched: false,
    rating: null,
    rank: data.items.filter(i => i.type === type).length + 1,
    addedAt: new Date().toISOString()
  };
  data.items.push(newItem);
  writeData(data);
  res.status(201).json(newItem);
});

// PUT update item (watch status, rating, title)
app.put('/api/items/:id', (req, res) => {
  const data = readData();
  const idx = data.items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { watched, rating, title, type } = req.body;
  if (watched !== undefined) data.items[idx].watched = watched;
  if (rating  !== undefined) data.items[idx].rating  = rating;
  if (title   !== undefined) data.items[idx].title   = title;
  if (type    !== undefined) data.items[idx].type    = type;

  writeData(data);
  res.json(data.items[idx]);
});

// POST reorder items — body: { orderedIds: ['id1','id2',...], type: 'movie'|'show' }
app.post('/api/items/reorder', (req, res) => {
  const { orderedIds, type } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds required' });

  const data = readData();
  orderedIds.forEach((id, idx) => {
    const item = data.items.find(i => i.id === id);
    if (item) item.rank = idx + 1;
  });
  if (type) {
    data.items
      .filter(i => i.type === type && !orderedIds.includes(i.id))
      .forEach((item, idx) => { item.rank = orderedIds.length + idx + 1; });
  }

  writeData(data);
  res.json(data.items);
});

// DELETE item
app.delete('/api/items/:id', (req, res) => {
  const data = readData();
  const before = data.items.length;
  data.items = data.items.filter(i => i.id !== req.params.id);
  if (data.items.length === before) return res.status(404).json({ error: 'Not found' });

  ['movie', 'show'].forEach(t => {
    data.items.filter(i => i.type === t).forEach((item, idx) => { item.rank = idx + 1; });
  });
  writeData(data);
  res.json({ ok: true });
});

// Ensure data file exists before accepting any requests
if (!fs.existsSync(DATA_FILE)) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ name: null, items: [] }, null, 2));
  console.log('Created data/watchlist.json');
}

app.listen(PORT, () => {
  console.log(`WatchList running at http://localhost:${PORT}`);
});

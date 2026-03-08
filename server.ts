import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

const app = express();
const PORT = 3000;

// Configuration
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Database setup
const db = new Database(path.join(DATA_DIR, "gallery.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS art_pieces (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    year TEXT,
    image TEXT,
    description TEXT,
    tags TEXT,
    price TEXT
  )
`);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(UPLOADS_DIR));

// API Routes
app.get("/api/art", (req, res) => {
  const rows = db.prepare("SELECT * FROM art_pieces").all();
  res.json(rows.map(row => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : []
  })));
});

app.post("/api/art", upload.single("image"), (req, res) => {
  const { title, category, year, description, tags, price } = req.body;
  const id = Date.now().toString();
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

  const stmt = db.prepare(`
    INSERT INTO art_pieces (id, title, category, year, image, description, tags, price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, title, category, year, imageUrl, description, tags, price || "");
  
  res.json({ id, title, category, year, image: imageUrl, description, tags: JSON.parse(tags), price });
});

app.delete("/api/art/:id", (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare("DELETE FROM art_pieces WHERE id = ?");
  stmt.run(id);
  res.json({ success: true });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

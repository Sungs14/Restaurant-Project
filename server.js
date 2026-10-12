require("dotenv").config();

// Some networks/ISPs refuse the DNS SRV lookup that mongodb+srv:// needs
// (error: querySrv ECONNREFUSED). Set DNS_SERVERS in .env to work around it.
if (process.env.DNS_SERVERS) {
  require("node:dns").setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
}
const express = require("express");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Restaurant = require("./models/Restaurant");
const Rating = require("./models/Rating");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mangan-tamu";


const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.json({ limit: "100kb" }));

/* ---------- static front end ----------
   Preferred layout: index.html, style.css, script.js and data/ inside public/.
   Fallback: if they sit next to server.js, serve just those three files
   (never the whole folder, so .env and server.js stay private). */
app.use(express.static(PUBLIC_DIR));

const hasPublicIndex = fs.existsSync(path.join(PUBLIC_DIR, "index.html"));
if (!hasPublicIndex) {
  console.warn("public/index.html not found. Serving front-end files from the project root instead.");
  console.warn("Tip: move index.html, style.css and script.js into a public/ folder.");
  for (const file of ["index.html", "style.css", "script.js"]) {
    const full = path.join(__dirname, file);
    app.get(file === "index.html" ? ["/", "/index.html"] : "/" + file, (req, res) =>
      fs.existsSync(full) ? res.sendFile(full) : res.status(404).send(`${file} not found`)
    );
  }
}

/* ---------- helpers ---------- */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const FIELDS = ["name", "town", "category", "signature", "blurb", "heat", "price", "open", "close", "dishes"];
const pick = (b = {}) => Object.fromEntries(FIELDS.filter((k) => k in b).map((k) => [k, b[k]]));

async function newId(name) {
  const base = String(name || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "restaurant";
  let id = base, n = 2;
  while (await Restaurant.exists({ id })) id = `${base}-${n++}`;
  return id;
}

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    if (err.code === 11000) return res.status(409).json({ error: "A restaurant with that id already exists" });
    console.error(err);
    res.status(500).json({ error: "Server error" });
  });

/* ---------- API ---------- */

// GET /api/restaurants?town=Angeles&category=grill&heat=2&q=sisig
app.get(
  "/api/restaurants",
  wrap(async (req, res) => {
    const filter = {};
    // String() stops query-operator injection such as ?town[$ne]=x
    if (req.query.town) filter.town = String(req.query.town);
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.heat !== undefined && req.query.heat !== "") filter.heat = Number(req.query.heat);

    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q)), "i");
      filter.$or = [{ name: rx }, { town: rx }, { signature: rx }, { blurb: rx }, { "dishes.name": rx }, { "dishes.note": rx }];
    }

    const list = await Restaurant.find(filter).sort({ name: 1 }).lean({ virtuals: false });
    res.json(list.map(({ _id, ...rest }) => rest));
  })
);

app.get(
  "/api/restaurants/:id",
  wrap(async (req, res) => {
    const doc = await Restaurant.findOne({ id: String(req.params.id) });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  })
);

app.post(
  "/api/restaurants",
  wrap(async (req, res) => {
    const doc = await Restaurant.create({ ...pick(req.body), id: await newId(req.body && req.body.name) });
    await Rating.seedRandom([doc.id]); // default random ratings, editable by visitors
    res.status(201).json(doc);
  })
);

app.put(
  "/api/restaurants/:id",
  wrap(async (req, res) => {
    const doc = await Restaurant.findOneAndUpdate({ id: String(req.params.id) }, pick(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  })
);

app.delete(
  "/api/restaurants/:id",
  wrap(async (req, res) => {
    const doc = await Restaurant.findOneAndDelete({ id: String(req.params.id) });
    if (!doc) return res.status(404).json({ error: "Not found" });
    await Rating.deleteMany({ restaurantId: doc.id });
    res.status(204).end();
  })
);

/* ---------- ratings ---------- */

// Average + count per restaurant, using the MongoDB aggregation pipeline.
const avgStage = [{ $group: { _id: "$restaurantId", avg: { $avg: "$stars" }, count: { $sum: 1 } } }];
const validVoter = (v) => /^[\w-]{8,64}$/.test(v);

// Gives restaurants that have no ratings yet some random default ones.
async function seedMissingRatings() {
  const [restaurants, rated] = await Promise.all([Restaurant.find({}, "id").lean(), Rating.distinct("restaurantId")]);
  const have = new Set(rated);
  const missing = restaurants.map((r) => r.id).filter((id) => id && !have.has(id));
  if (missing.length) console.log(`Added ${await Rating.seedRandom(missing)} default ratings for ${missing.length} restaurants`);
}

// GET /api/ratings/top  -> highest rated restaurants (default top 5)
app.get(
  "/api/ratings/top",
  wrap(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    const top = await Rating.aggregate([
      ...avgStage,
      { $sort: { avg: -1, count: -1, _id: 1 } },
      { $limit: limit },
      { $project: { _id: 0, id: "$_id", avg: { $round: ["$avg", 1] }, count: 1 } },
    ]);
    res.json(top);
  })
);

// GET /api/ratings/summary  -> { "restaurant-id": { avg, count }, ... } for the cards
app.get(
  "/api/ratings/summary",
  wrap(async (req, res) => {
    const rows = await Rating.aggregate(avgStage);
    res.json(Object.fromEntries(rows.map((r) => [r._id, { avg: Math.round(r.avg * 10) / 10, count: r.count }])));
  })
);

// GET /api/ratings/mine?voter=...  -> { "restaurant-id": stars } this browser's own ratings
app.get(
  "/api/ratings/mine",
  wrap(async (req, res) => {
    const voter = String(req.query.voter || "");
    if (!validVoter(voter)) return res.json({});
    const rows = await Rating.find({ voter }).lean();
    res.json(Object.fromEntries(rows.map((r) => [r.restaurantId, r.stars])));
  })
);

// POST /api/restaurants/:id/rate   body: { "stars": 1-5, "voter": "<browser id>" }
// Sending it again with the same voter changes that voter's rating.
app.post(
  "/api/restaurants/:id/rate",
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const stars = Number(req.body && req.body.stars);
    const voter = String((req.body && req.body.voter) || "");
    if (!Number.isInteger(stars) || stars < 1 || stars > 5)
      return res.status(400).json({ error: "stars must be a whole number from 1 to 5" });
    if (!validVoter(voter)) return res.status(400).json({ error: "Missing or invalid voter id" });
    if (!id || id.length > 100) return res.status(400).json({ error: "Invalid restaurant id" });

    await Rating.findOneAndUpdate({ restaurantId: id, voter }, { $set: { stars } }, { upsert: true });
    const [row] = await Rating.aggregate([{ $match: { restaurantId: id } }, ...avgStage]);
    res.status(201).json({ id, stars, avg: Math.round(row.avg * 10) / 10, count: row.count });
  })
);

// unknown /api routes get JSON instead of the HTML "Cannot GET" page
app.use("/api", (req, res) => res.status(404).json({ error: "Unknown API route" }));

/* ---------- start ---------- */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    try {
      await Rating.deleteMany({ voter: { $exists: false } }); // ratings from the earlier version
      await Rating.createIndexes();
      await seedMissingRatings();
    } catch (err) {
      console.warn("Ratings setup problem:", err.message);
    }
    app.listen(PORT, () => console.log(`Mangan Tamu running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
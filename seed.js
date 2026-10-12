// Loads public/data/restaurants.json into MongoDB (upserts by id, safe to re-run).
//   npm run seed                    -> upsert
//   npm run seed -- --fresh         -> wipe the collection first
//   npm run seed -- path/to/file.json
require("dotenv").config();

// Some networks/ISPs refuse the DNS SRV lookup that mongodb+srv:// needs
// (error: querySrv ECONNREFUSED). Set DNS_SERVERS in .env to work around it.
if (process.env.DNS_SERVERS) {
  require("node:dns").setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
}
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Restaurant = require("./models/Restaurant");

const args = process.argv.slice(2);
const fresh = args.includes("--fresh");
const fileArg = args.find((a) => !a.startsWith("--"));
const file = path.resolve(fileArg || path.join(__dirname, "public", "data", "restaurants.json"));

(async () => {
  if (!fs.existsSync(file)) {
    console.error(`Cannot find ${file}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(data)) throw new Error("JSON file must contain an array");

  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mangan-tamu");
  if (fresh) await Restaurant.deleteMany({});

  // validate everything first so a bad row doesn't leave a half-imported set
  for (const r of data) await new Restaurant(r).validate();

  await Restaurant.bulkWrite(
    data.map((r) => ({ updateOne: { filter: { id: r.id }, update: { $set: r }, upsert: true } }))
  );
  console.log(`Seeded ${data.length} restaurants from ${path.basename(file)}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});

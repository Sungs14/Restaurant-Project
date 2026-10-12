// Wipes all ratings and gives every restaurant new random default ratings.
//   node seed-rating.js
require("dotenv").config();
if (process.env.DNS_SERVERS) {
  require("node:dns").setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
}
const mongoose = require("mongoose");
const Restaurant = require("./models/Restaurant");
const Rating = require("./models/Rating");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mangan-tamu");
  await Rating.deleteMany({});
  await Rating.createIndexes();
  const ids = (await Restaurant.find({}, "id").lean()).map((r) => r.id).filter(Boolean);
  const n = await Rating.seedRandom(ids);
  console.log(`Added ${n} random ratings across ${ids.length} restaurants`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
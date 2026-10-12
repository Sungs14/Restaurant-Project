const mongoose = require("mongoose");

// One document per voter per restaurant, so a rating can be changed later.
const ratingSchema = new mongoose.Schema(
  {
    restaurantId: { type: String, required: true }, // matches Restaurant.id
    voter: { type: String, required: true }, // anonymous browser id (or "seed-N" for sample ratings)
    stars: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);
ratingSchema.index({ restaurantId: 1, voter: 1 }, { unique: true });

// Default ratings: each restaurant gets a random "personality" (about 3.0 to 4.9)
// and a handful of sample votes scattered around it.
ratingSchema.statics.seedRandom = async function (ids) {
  const docs = [];
  for (const id of ids) {
    const base = 3 + Math.random() * 1.9;
    const votes = 4 + Math.floor(Math.random() * 7); // 4-10 votes
    for (let i = 0; i < votes; i++) {
      const stars = Math.min(5, Math.max(1, Math.round(base + (Math.random() - 0.5) * 1.6)));
      docs.push({ restaurantId: id, voter: `seed-${i}`, stars });
    }
  }
  if (docs.length) await this.insertMany(docs);
  return docs.length;
};

module.exports = mongoose.model("Rating", ratingSchema);
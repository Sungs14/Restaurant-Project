const mongoose = require("mongoose");

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const restaurantSchema = new mongoose.Schema(
  {
    // The front end identifies restaurants by this string id (not Mongo's _id).
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    town: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ["grill", "heritage", "sweets", "wild", "river"],
      index: true,
    },
    signature: { type: String, default: "" },
    blurb: { type: String, default: "" },
    heat: { type: Number, min: 0, max: 3, default: 0 },
    price: { type: Number, min: 1, max: 3, default: 1 },
    open: { type: String, match: HHMM, required: true },
    close: { type: String, match: HHMM, required: true },
    dishes: [
      {
        _id: false,
        name: { type: String, required: true },
        note: { type: String, default: "" },
      },
    ],
  },
  {
    // keep any extra fields that exist in restaurants.json (lat/lng, etc.)
    strict: false,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        return ret;
      },
    },
  }
);

restaurantSchema.index({ name: "text", town: "text", signature: "text", blurb: "text" });

module.exports = mongoose.model("Restaurant", restaurantSchema);

const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true, // Indexed for quick text searches
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      index: true, // Indexed for price sorting/filtering
    },
    category: {
      type: String,
      required: true,
      enum: ["Bracelets", "Necklaces", "Waist Beads", "Anklets"],
      index: true, // Indexed for category filtering
    },
    tag: {
      type: String,
      default: "Standard",
    },
    image: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", ProductSchema);

module.exports = Product;

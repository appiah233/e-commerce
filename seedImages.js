require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/emyafrobeads";
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("Error connecting to DB:", error);
    process.exit(1);
  }
};

const seedImages = async () => {
  await connectDB();

  const products = await Product.find({});
  if (products.length === 0) {
    console.log("No products found in the database. Inserting defaults...");
    await Product.insertMany([
      { name: "Krobo Heritage Bracelet", description: "Recycled glass · handmade", price: 180, category: "Bracelets", tag: "Limited", image: "https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&q=80", rating: 4.9 },
      { name: "Coral Stacked Anklets", description: "Seed beads · gold clasp", price: 220, category: "Anklets", tag: "New", image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&q=80", rating: 4.8 },
      { name: "Adinkra Waist Beads", description: "Cotton thread · glass", price: 150, category: "Waist Beads", tag: "Popular", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80", rating: 5.0 },
      { name: "Kente Bead Necklace", description: "Krobo glass · 18 inch chain", price: 310, category: "Necklaces", tag: "Popular", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80", rating: 4.7 }
    ]);
    console.log("Inserted default products!");
  } else {
    console.log("Products found. Updating images...");
    const images = [
      "https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&q=80",
      "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&q=80",
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80",
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80"
    ];
    for (let i = 0; i < products.length; i++) {
      products[i].image = images[i % images.length];
      await products[i].save();
    }
    console.log("Updated existing products with high-quality images!");
  }

  process.exit();
};

seedImages();

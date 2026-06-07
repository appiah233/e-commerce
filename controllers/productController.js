const Product = require("../models/Product");

// Extremely fast in-memory caching for products list to handle 100,000+ requests
let productCache = {
  data: null,
  updatedAt: 0,
  ttl: 15000, // 15 seconds Cache TTL
};

// Clear cache helper
const invalidateCache = () => {
  productCache.data = null;
  productCache.updatedAt = 0;
};

const buildProductQuery = (query) => {
  const filter = {};

  if (query.keyword) {
    filter.name = { $regex: query.keyword, $options: "i" };
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  return filter;
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const filter = buildProductQuery(req.query);
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 24, 100);
    const sortParam = req.query.sort || "-createdAt";

    if (Object.keys(filter).length === 0 && !req.query.page && !req.query.limit && !req.query.sort) {
      const now = Date.now();
      if (productCache.data && now - productCache.updatedAt < productCache.ttl) {
        res.setHeader("X-Cache", "HIT");
        return res.json({ status: "success", data: productCache.data });
      }
    }

    const sortOrder = {};
    if (sortParam === "price_asc") sortOrder.price = 1;
    else if (sortParam === "price_desc") sortOrder.price = -1;
    else if (sortParam === "name_asc") sortOrder.name = 1;
    else if (sortParam === "name_desc") sortOrder.name = -1;
    else sortOrder.createdAt = sortParam.startsWith("-") ? -1 : 1;

    const products = await Product.find(filter)
      .sort(sortOrder)
      .skip((page - 1) * limit)
      .limit(limit);

    if (Object.keys(filter).length === 0 && !req.query.page && !req.query.limit && !req.query.sort) {
      productCache.data = products;
      productCache.updatedAt = Date.now();
      res.setHeader("X-Cache", "MISS");
    }

    return res.json({ status: "success", data: products });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ status: "error", message: "Product not found" });
    }

    return res.json({ status: "success", data: product });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, tag, image, stock } = req.body;

    if (!name || !description || !price || !category || !image) {
      return res.status(400).json({ status: "error", message: "Missing required product fields" });
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      tag: tag || "Standard",
      image,
      stock: stock || 0,
    });

    const createdProduct = await product.save();
    invalidateCache();

    return res.status(201).json({ status: "success", data: createdProduct });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Update product details
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ status: "error", message: "Product not found" });
    }

    const { name, description, price, category, tag, image, stock } = req.body;

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price ?? product.price;
    product.category = category || product.category;
    product.tag = tag || product.tag;
    product.image = image || product.image;
    product.stock = stock ?? product.stock;

    const updatedProduct = await product.save();
    invalidateCache();

    return res.json({ status: "success", data: updatedProduct });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Remove product from catalog
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ status: "error", message: "Product not found" });
    }

    await product.remove();
    invalidateCache();

    return res.json({ status: "success", message: "Product removed" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Seed database with initial product list
// @route   POST /api/products/seed
// @access  Private/Admin
const seedProducts = async (req, res) => {
  try {
    const initialProducts = [
      {
        name: "African glass bracelet set",
        price: 180,
        category: "Bracelets",
        tag: "New",
        image: "images/waist_beads.png",
        description: "Recycled glass beads in cocoa, clay, and gold tones. Perfect for layered stacking.",
        stock: 50,
      },
      {
        name: "Adwoa bracelet",
        price: 120,
        category: "Bracelets",
        tag: "Bestseller",
        image: "images/waist_beads.png",
        description: "Hand-strung glass rounds with brass spacers. A timeless everyday essential.",
        stock: 35,
      },
      {
        name: "Sankofa necklace",
        price: 280,
        category: "Necklaces",
        tag: "Bestseller",
        image: "images/waist_beads.png",
        description: "Symbolic palette with recycled glass accents. Heritage meets modern elegance.",
        stock: 20,
      },
      {
        name: "Heritage necklace",
        price: 320,
        category: "Necklaces",
        tag: "Premium",
        image: "images/waist_beads.png",
        description: "Long strand inspired by African heirlooms. A statement piece for any occasion.",
        stock: 15,
      },
      {
        name: "Sunrise waist beads",
        price: 220,
        category: "Waist Beads",
        tag: "Handmade",
        image: "images/waist_beads.png",
        description: "Layered strand with warm orange and gold accents for radiant body styling.",
        stock: 40,
      },
      {
        name: "Mocha waist beads",
        price: 210,
        category: "Waist Beads",
        tag: "New",
        image: "images/waist_beads.png",
        description: "Earthy brown mix with brass and seed beads. Subtle and sophisticated.",
        stock: 45,
      },
      {
        name: "Dusk waist beads",
        price: 230,
        category: "Waist Beads",
        tag: "Limited",
        image: "images/waist_beads.png",
        description: "Deep cocoa palette with clay bead details. A limited-edition treasure.",
        stock: 10,
      },
      {
        name: "Palm grove bracelet trio",
        price: 150,
        category: "Bracelets",
        tag: "Set",
        image: "images/waist_beads.png",
        description: "Three stackable bracelets in palm and cocoa hues. Versatile elegance.",
        stock: 25,
      },
      {
        name: "Festival anklet",
        price: 110,
        category: "Anklets",
        tag: "New",
        image: "images/waist_beads.png",
        description: "Delicate anklet with carved clay beads. Dance-ready and festival-worthy.",
        stock: 30,
      },
      {
        name: "Cocoa anklet pair",
        price: 90,
        category: "Anklets",
        tag: "Popular",
        image: "images/waist_beads.png",
        description: "Two matching anklets with cocoa and cream beads. The perfect duo.",
        stock: 50,
      },
      {
        name: "Heritage anklet",
        price: 95,
        category: "Anklets",
        tag: "Popular",
        image: "images/waist_beads.png",
        description: "Minimal anklet with warm terracotta beads. Everyday understated beauty.",
        stock: 45,
      },
      {
        name: "Oba necklace",
        price: 260,
        category: "Necklaces",
        tag: "Limited",
        image: "images/waist_beads.png",
        description: "Chunky African beads with a carved clay center. Royalty-inspired design.",
        stock: 8,
      },
    ];

    const imageMap = {
      "African glass bracelet set": "images/waist_beads.png",
      "Adwoa bracelet": "images/waist_beads.png",
      "Sankofa necklace": "images/waist_beads.png",
      "Heritage necklace": "images/waist_beads.png",
      "Sunrise waist beads": "images/waist_beads.png",
      "Mocha waist beads": "images/waist_beads.png",
      "Dusk waist beads": "images/waist_beads.png",
      "Palm grove bracelet trio": "images/waist_beads.png",
      "Festival anklet": "images/waist_beads.png",
      "Cocoa anklet pair": "images/waist_beads.png",
      "Heritage anklet": "images/waist_beads.png",
      "Oba necklace": "images/waist_beads.png"
    };

    const count = await Product.countDocuments();
    if (count > 0) {
      await Promise.all(
        Object.entries(imageMap).map(([name, image]) =>
          Product.updateMany({ name }, { $set: { image } })
        )
      );
      invalidateCache();
      return res.status(200).json({
        status: "success",
        message: "Existing products updated to local product photos"
      });
    }

    await Product.insertMany(initialProducts);
    invalidateCache();

    return res.status(201).json({ status: "success", message: "Database seeded successfully!" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  seedProducts,
};

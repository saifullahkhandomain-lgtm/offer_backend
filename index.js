require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const Store = require("./models/Store");
const Coupon = require("./models/Coupon");
const Category = require("./models/Category");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10mb" })); // Increased limit for base64 images

// Connect to MongoDB before each request (serverless-friendly)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "ClickOfferz API is running",
    database: "MongoDB",
  });
});

// Public API Routes
app.get("/api/stores", async (req, res) => {
  try {
    const stores = await Store.find().sort({ name: 1 }).lean();

    // Populate specific offer counts
    const storesWithCounts = await Promise.all(
      stores.map(async (store) => {
        const count = await Coupon.countDocuments({
          $or: [
            { storeId: store._id },
            { storeName: store.name },
            { storeName: new RegExp(`^${store.name.trim()}$`, "i") },
          ],
          isActive: true,
        });
        return { ...store, offers: count };
      }),
    );

    res.json(storesWithCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/stores/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const stores = await Store.find();

    const store = stores.find(
      (s) => s.name.trim().toLowerCase().replace(/\s+/g, "-") === slug,
    );

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    res.json(store);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/coupons", async (req, res) => {
  try {
    const { type, category, store, trending, search, page, limit } = req.query;
    const filter = { isActive: true };

    if (type) filter.type = type;
    if (category) filter.category = new RegExp(`^${category}$`, "i");

    if (search) {
      filter.$or = [
        { title: new RegExp(search, "i") },
        { storeName: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    if (store) {
      // Robust store search: matches storeId, exact name, or fuzzy name
      const stores = await Store.find();
      const targetStore = stores.find(
        (s) =>
          s.name.trim().toLowerCase().replace(/\s+/g, "-") ===
          store.trim().toLowerCase().replace(/\s+/g, "-"),
      );

      if (targetStore) {
        const storeFilter = {
          $or: [
            { storeId: targetStore._id },
            { storeName: targetStore.name },
            { storeName: new RegExp(`^${targetStore.name.trim()}$`, "i") },
          ],
        };
        // Merge with existing $or if search exists
        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, { $or: storeFilter.$or }];
          delete filter.$or; // Cleanup top-level $or
        } else {
          Object.assign(filter, storeFilter);
        }
      } else {
        filter.storeName = new RegExp(store, "i");
      }
    }
    if (trending === "true") filter.isTrending = true;

    let query = Coupon.find(filter).sort({ createdAt: -1 });

    // Pagination parameters
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20; // Default to 20 if logic below requires it, but usually query param controls it

    if (page && limit) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    } else if (limit) {
      query = query.limit(parseInt(limit));
    }

    const total = await Coupon.countDocuments(filter);
    const coupons = await query;

    res.json({
      coupons,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/coupons/store/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const stores = await Store.find();

    // Robustly find the store using the same slug logic as frontend
    const store = stores.find(
      (s) => s.name.trim().toLowerCase().replace(/\s+/g, "-") === slug,
    );

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Find coupons for this specific store using robust matching
    // Matches:
    // 1. Exact storeId (ideal)
    // 2. Exact storeName
    // 3. Case-insensitive storeName
    // 4. storeName with varying whitespace
    const coupons = await Coupon.find({
      $or: [
        { storeId: store._id },
        { storeName: store.name },
        { storeName: new RegExp(`^${store.name.trim()}$`, "i") },
      ],
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug Route
app.get("/api/debug/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const stores = await Store.find();
    const robustStore = stores.find(
      (s) => s.name.trim().toLowerCase().replace(/\s+/g, "-") === slug,
    );

    let relatedCoupons = [];
    if (robustStore) {
      relatedCoupons = await Coupon.find({
        $or: [
          { storeId: robustStore._id },
          { storeName: robustStore.name },
          { storeName: new RegExp(`^${robustStore.name.trim()}$`, "i") },
        ],
      });
    }

    // Also find ANY coupons that might look like this store
    const looseMatchCoupons = await Coupon.find({
      storeName: new RegExp(slug.replace(/-/g, " "), "i"),
    }).limit(5);

    res.json({
      requestedSlug: slug,
      foundStore: robustStore,
      robustCouponsCount: relatedCoupons.length,
      robustCoupons: relatedCoupons,
      looseMatchCoupons: looseMatchCoupons,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin/stores", require("./routes/adminStores"));
app.use("/api/admin/coupons", require("./routes/adminCoupons"));

// Blog Routes
app.use("/api/blogs", require("./routes/blogRoutes"));

// Page Routes (Dynamic Static Pages)
app.use("/api/pages", require("./routes/pageRoutes"));

// Site Settings Routes (Social Media, etc.)
app.use("/api/settings", require("./routes/settingRoutes"));

// Message Routes
app.use("/api/messages", require("./routes/messageRoutes"));

// Sitemap Route (Root level)
app.use("/", require("./routes/sitemapRoutes"));

// ===== CATEGORY ROUTES =====
// Get all active categories (public)
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    // Populate coupon counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await Coupon.countDocuments({
          category: new RegExp(`^${cat.name}$`, "i"),
          isActive: true,
        });
        return { ...cat, couponCount: count };
      }),
    );

    res.json(categoriesWithCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all categories (admin)
app.get(
  "/api/admin/categories",
  require("./middleware/auth").protect,
  async (req, res) => {
    try {
      const categories = await Category.find().sort({ name: 1 });
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Create category (admin)
app.post(
  "/api/admin/categories",
  require("./middleware/auth").protect,
  async (req, res) => {
    try {
      console.log("Creating category with body:", {
        ...req.body,
        image: req.body.image
          ? `[Base64 Length: ${req.body.image.length}]`
          : null,
      });
      const category = await Category.create(req.body);
      res.status(201).json(category);
    } catch (error) {
      console.error("Create category error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

// Update category (admin)
app.put(
  "/api/admin/categories/:id",
  require("./middleware/auth").protect,
  async (req, res) => {
    try {
      console.log(`Updating category ${req.params.id} with body:`, {
        ...req.body,
        image: req.body.image
          ? `[Base64 Length: ${req.body.image.length}]`
          : null,
      });
      const category = await Category.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true },
      );
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Update category error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

// Delete category (admin)
app.delete(
  "/api/admin/categories/:id",
  require("./middleware/auth").protect,
  async (req, res) => {
    try {
      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Migration endpoint - Update all coupons with store logos
app.post(
  "/api/admin/migrate-coupon-logos",
  require("./middleware/auth").protect,
  async (req, res) => {
    try {
      const coupons = await Coupon.find({});
      const stores = await Store.find({});

      let updated = 0;
      let skipped = 0;

      for (const coupon of coupons) {
        const store = stores.find((s) => s.name === coupon.storeName);

        if (store && store.logo) {
          coupon.storeLogo = store.logo;
          coupon.storeLogoType = store.logoType || "emoji";
          await coupon.save();
          updated++;
        } else {
          skipped++;
        }
      }

      res.json({
        success: true,
        message: "Migration completed",
        updated,
        skipped,
        total: coupons.length,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Dashboard Stats
app.get(
  "/api/admin/stats",
  require("./middleware/auth").protect,
  async (req, res) => {
    try {
      const totalStores = await Store.countDocuments();
      const totalCoupons = await Coupon.countDocuments();
      const activeCoupons = await Coupon.countDocuments({ isActive: true });
      const expiredCoupons = await Coupon.countDocuments({ isActive: false });

      res.json({
        success: true,
        data: {
          totalStores,
          totalCoupons,
          activeCoupons,
          expiredCoupons,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Start server
// Start server only if running directly
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("❌ Failed to start server:", error.message);
      process.exit(1);
    });
}

module.exports = app;

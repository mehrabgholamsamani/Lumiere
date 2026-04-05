import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET;

if (!process.env.MONGODB_URI || !JWT_SECRET || JWT_SECRET.length < 32 || !process.env.ADMIN_PANEL_PASSWORD) {
  console.error("Missing MONGODB_URI, secure JWT_SECRET, or ADMIN_PANEL_PASSWORD. Copy .env.example to .env and fill in all values.");
  process.exit(1);
}

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim());
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" }, referrerPolicy: { policy: "no-referrer" } }));
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error("Origin not allowed")); }, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Access"], maxAge: 86400 }));
app.use(express.json({ limit: "32kb", strict: true, type: "application/json" }));
app.use((req, res, next) => {
  const hasUnsafeKey = (value) => value && typeof value === "object" && Object.entries(value).some(([key, child]) => key.startsWith("$") || key.includes(".") || hasUnsafeKey(child));
  if (hasUnsafeKey(req.body) || hasUnsafeKey(req.query)) return res.status(400).json({ message: "Invalid request format." });
  next();
});
const apiLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: "draft-8", legacyHeaders: false, message: { message: "Too many requests. Please try again later." } });
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false, skipSuccessfulRequests: true, message: { message: "Too many sign-in attempts. Please try again in 15 minutes." } });
const writeLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, message: { message: "Too many requests. Please try again later." } });
app.use("/api", apiLimit);

const addressSchema = new mongoose.Schema({
  label: { type: String, required: true, maxlength: 80 }, full_name: { type: String, default: null },
  line1: { type: String, required: true, maxlength: 200 }, line2: { type: String, default: null },
  city: { type: String, required: true, maxlength: 100 }, postal_code: { type: String, required: true, maxlength: 30 },
  region: { type: String, default: null }, country: { type: String, required: true, maxlength: 100 },
  is_default_shipping: { type: Boolean, default: false }, is_default_billing: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, toJSON: { virtuals: true } });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false }, full_name: { type: String, default: null },
  favorites: [{ type: String }], addresses: [addressSchema],
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, toJSON: { virtuals: true } });
const User = mongoose.model("User", userSchema);

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, email: { type: String, required: true },
  shipping_address: { type: Object, required: true }, shipping_method: { type: String, enum: ["standard", "express"], required: true },
  payment_method: { type: String, enum: ["card", "klarna"], required: true },
  subtotal_cents: { type: Number, required: true, min: 0 }, shipping_cents: { type: Number, required: true, min: 0 },
  tax_cents: { type: Number, required: true, min: 0 }, total_cents: { type: Number, required: true, min: 0 },
  status: { type: String, default: "PLACED" }, items: [{ product_id: String, product_name: String, unit_price_cents: Number, qty: Number }],
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, toJSON: { virtuals: true } });
const Order = mongoose.model("Order", orderSchema);
const Newsletter = mongoose.model("Newsletter", new mongoose.Schema({ email: { type: String, unique: true, lowercase: true, trim: true } }, { timestamps: { createdAt: "created_at", updatedAt: false }, versionKey: false }));
const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 100 }, name: { type: String, required: true, maxlength: 160 },
  category: { type: String, required: true, maxlength: 60 }, priceCents: { type: Number, required: true, min: 0, max: 100000000 },
  material: { type: String, required: true, maxlength: 100 }, materialGroup: { type: String, required: true, maxlength: 40 }, gemstones: { type: String, required: true, maxlength: 100 }, gemShape: { type: String, required: true, maxlength: 40 }, brand: { type: String, required: true, maxlength: 100 }, collection: { type: String, required: true, maxlength: 100 }, description: { type: String, required: true, maxlength: 3000 }, rating: { type: Number, min: 0, max: 5, default: 0 }, image: { type: String, required: true, maxlength: 2000 }, badge: { type: String, enum: ["New", "Bestseller", "Limited", null], default: null }, active: { type: Boolean, default: true },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false, toJSON: { virtuals: true } });
const Product = mongoose.model("Product", productSchema);
const Settings = mongoose.model("Settings", new mongoose.Schema({ key: { type: String, unique: true }, businessName: { type: String, required: true, maxlength: 120 }, email: { type: String, default: "", maxlength: 254 }, phone: { type: String, default: "", maxlength: 50 }, address: { type: String, default: "", maxlength: 500 }, announcement: { type: String, default: "", maxlength: 300 } }, { timestamps: true, versionKey: false }));

const publicUser = (user) => ({ id: user._id.toString(), email: user.email, name: user.full_name || undefined, role: user.role });
const tokenFor = (user) => jwt.sign({ sub: user._id.toString() }, JWT_SECRET, { expiresIn: "1h", issuer: "lumiere-api", audience: "lumiere-web", algorithm: "HS256" });
const auth = async (req, res, next) => {
  try {
    const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ message: "Authentication required." });
    const payload = jwt.verify(token, JWT_SECRET, { issuer: "lumiere-api", audience: "lumiere-web", algorithms: ["HS256"] });
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Account no longer exists." });
    req.user = user; next();
  } catch { res.status(401).json({ message: "Invalid or expired session." }); }
};
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const safeEqual = (left, right) => { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const admin = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Administrator access required." });
  try {
    const grant = req.get("X-Admin-Access");
    const payload = jwt.verify(grant || "", JWT_SECRET, { issuer: "lumiere-api", audience: "lumiere-admin", algorithms: ["HS256"] });
    if (payload.sub !== req.user.id || payload.scope !== "admin") throw new Error("Invalid grant");
    next();
  } catch { return res.status(403).json({ message: "Additional admin password required." }); }
};
const validEmail = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const cleanText = (value, max = 200) => typeof value === "string" ? value.trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max) : "";
const validId = (id) => mongoose.isObjectIdOrHexString(id);
const addressPayload = (body) => {
  const required = ["label", "line1", "city", "postal_code", "country"];
  if (!body || required.some((key) => !cleanText(body[key]))) return null;
  return { label: cleanText(body.label, 80), full_name: cleanText(body.full_name, 120) || null, line1: cleanText(body.line1), line2: cleanText(body.line2) || null, city: cleanText(body.city, 100), postal_code: cleanText(body.postal_code, 30), region: cleanText(body.region, 100) || null, country: cleanText(body.country, 100), is_default_shipping: body.is_default_shipping === true, is_default_billing: body.is_default_billing === true };
};

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/products", asyncRoute(async (_req, res) => res.json(await Product.find({ active: true }).sort({ createdAt: -1 }).lean())));
app.get("/api/settings", asyncRoute(async (_req, res) => res.json((await Settings.findOne({ key: "storefront" }).lean()) || { businessName: "Lumière", email: "", phone: "", address: "", announcement: "" })));
app.post("/api/auth/register", authLimit, asyncRoute(async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!validEmail(email) || typeof password !== "string" || password.length < 12 || password.length > 128) return res.status(400).json({ message: "Provide a valid email and password of 12–128 characters." });
  if (await User.exists({ email: email.trim().toLowerCase() })) return res.status(409).json({ message: "An account already exists for that email." });
  const isBootstrapAdmin = email.trim().toLowerCase() === String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 12), full_name: typeof fullName === "string" ? fullName.trim() || null : null, role: isBootstrapAdmin ? "admin" : "customer" });
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
}));
app.post("/api/auth/login", authLimit, asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || "").trim().toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.passwordHash))) return res.status(401).json({ message: "Incorrect email or password." });
  if (user.email === String(process.env.ADMIN_EMAIL || "").trim().toLowerCase() && user.role !== "admin") { user.role = "admin"; await user.save(); }
  res.json({ token: tokenFor(user), user: publicUser(user) });
}));
app.get("/api/auth/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));
app.post("/api/admin/unlock", auth, authLimit, asyncRoute(async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Administrator access required." });
  if (!safeEqual(String(req.body.password || ""), process.env.ADMIN_PANEL_PASSWORD)) return res.status(401).json({ message: "Incorrect admin password." });
  const token = jwt.sign({ sub: req.user.id, scope: "admin" }, JWT_SECRET, { expiresIn: "15m", issuer: "lumiere-api", audience: "lumiere-admin", algorithm: "HS256" });
  res.json({ token });
}));

app.get("/api/admin/dashboard", auth, admin, asyncRoute(async (_req, res) => {
  const [products, settings] = await Promise.all([Product.find().sort({ updated_at: -1 }).lean(), Settings.findOne({ key: "storefront" }).lean()]);
  res.json({ products, settings: settings || { businessName: "Lumière", email: "", phone: "", address: "", announcement: "" } });
}));
app.post("/api/admin/products", auth, admin, writeLimit, asyncRoute(async (req, res) => res.status(201).json(await Product.create(req.body))));
app.patch("/api/admin/products/:id", auth, admin, writeLimit, asyncRoute(async (req, res) => { const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!product) return res.status(404).json({ message: "Product not found." }); res.json(product); }));
app.delete("/api/admin/products/:id", auth, admin, writeLimit, asyncRoute(async (req, res) => { if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product." }); await Product.findByIdAndDelete(req.params.id); res.status(204).end(); }));
app.put("/api/admin/settings", auth, admin, writeLimit, asyncRoute(async (req, res) => { const payload = { businessName: cleanText(req.body.businessName, 120) || "Lumière", email: cleanText(req.body.email, 254), phone: cleanText(req.body.phone, 50), address: cleanText(req.body.address, 500), announcement: cleanText(req.body.announcement, 300) }; res.json(await Settings.findOneAndUpdate({ key: "storefront" }, { $set: payload }, { upsert: true, new: true, runValidators: true })); }));

app.get("/api/account", auth, asyncRoute(async (req, res) => {
  const orders = await Order.find({ user_id: req.user._id }).sort({ created_at: -1 }).select("total_cents status created_at");
  res.json({ profile: { id: req.user.id, full_name: req.user.full_name, created_at: req.user.created_at }, addresses: req.user.addresses, favorites: req.user.favorites, orders });
}));
app.patch("/api/account/profile", auth, writeLimit, asyncRoute(async (req, res) => { req.user.full_name = cleanText(req.body.full_name, 120) || null; await req.user.save(); res.json({ user: publicUser(req.user) }); }));
app.put("/api/account/favorites/:productId", auth, writeLimit, asyncRoute(async (req, res) => { const productId = cleanText(req.params.productId, 100); if (!productId) return res.status(400).json({ message: "Invalid product." }); req.user.favorites.addToSet(productId); await req.user.save(); res.json({ favorites: req.user.favorites }); }));
app.delete("/api/account/favorites/:productId", auth, writeLimit, asyncRoute(async (req, res) => { req.user.favorites.pull(cleanText(req.params.productId, 100)); await req.user.save(); res.json({ favorites: req.user.favorites }); }));
app.post("/api/account/addresses", auth, writeLimit, asyncRoute(async (req, res) => { const payload = addressPayload(req.body); if (!payload) return res.status(400).json({ message: "Invalid address." }); req.user.addresses.push(payload); await req.user.save(); res.status(201).json(req.user.addresses.at(-1)); }));
app.patch("/api/account/addresses/:id", auth, writeLimit, asyncRoute(async (req, res) => { if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid address." }); const address = req.user.addresses.id(req.params.id); const payload = addressPayload({ ...address?.toObject(), ...req.body }); if (!address || !payload) return res.status(404).json({ message: "Address not found." }); address.set(payload); await req.user.save(); res.json(address); }));
app.delete("/api/account/addresses/:id", auth, writeLimit, asyncRoute(async (req, res) => { if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid address." }); req.user.addresses.id(req.params.id)?.deleteOne(); await req.user.save(); res.status(204).end(); }));
app.post("/api/orders", auth, writeLimit, asyncRoute(async (req, res) => {
  const order = await Order.create({ ...req.body, user_id: req.user._id }); res.status(201).json(order);
}));
app.post("/api/orders/:id/items", auth, writeLimit, asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid order." });
  const order = await Order.findOne({ _id: req.params.id, user_id: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found." });
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ message: "Order items are required." });
  order.items.push(...items.map(({ product_id, product_name, unit_price_cents, qty }) => ({ product_id, product_name, unit_price_cents, qty })));
  await order.save(); res.status(201).json(order);
}));
app.post("/api/newsletter", writeLimit, asyncRoute(async (req, res) => { const email = cleanText(req.body.email, 254).toLowerCase(); if (!validEmail(email)) return res.status(400).json({ message: "Provide a valid email." }); await Newsletter.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true }); res.status(201).json({ ok: true }); }));
app.use((err, _req, res, _next) => { if (process.env.NODE_ENV !== "production") console.error(err); if (err instanceof SyntaxError) return res.status(400).json({ message: "Invalid JSON." }); res.status(500).json({ message: "Something went wrong." }); });

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }).then(() => { const server = app.listen(PORT, () => console.log(`API listening on ${PORT}`)); server.requestTimeout = 15000; server.headersTimeout = 16000; }).catch((error) => { console.error("MongoDB connection failed:", error.message); process.exit(1); });

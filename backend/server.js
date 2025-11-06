import express from "express";
import morgan from "morgan";
import cors from "cors";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------- 'Base de datos' en archivo --------------------
const DATA_PATH = path.join(__dirname, "data.json");

async function loadDB() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === "ENOENT") {
      const initial = { restaurants: [], dishes: [] };
      await fs.writeFile(DATA_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    throw e;
  }
}

async function saveDB(db) {
  const tmpPath = DATA_PATH + ".tmp";
  await fs.writeFile(tmpPath, JSON.stringify(db, null, 2));
  await fs.rename(tmpPath, DATA_PATH);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// -------------------- Middlewares de validación --------------------
const validateIdParam = (paramName) => (req, res, next) => {
  const id = req.params[paramName] || req.query[paramName] || req.query.restaurant;
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({ message: `El id '${paramName || "restaurant"}' no es válido` });
  }
  next();
};

const validateDishBody = (req, res, next) => {
  const { name, price } = req.body;
  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "El campo 'name' es obligatorio y debe ser string" });
  }
  if (typeof price !== "number" || isNaN(price) || price < 0) {
    return res.status(400).json({ message: "El campo 'price' es obligatorio y debe ser un número >= 0" });
  }
  next();
};

// -------------------- Rutas auxiliares --------------------
// Crear restaurante
app.post("/restaurants", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "El campo 'name' es obligatorio" });
    }
    const db = await loadDB();
    const newRestaurant = { _id: nanoid(12), name: name.trim(), createdAt: Date.now() };
    db.restaurants.push(newRestaurant);
    await saveDB(db);
    res.status(201).json(newRestaurant);
  } catch (err) { next(err); }
});

// Listar restaurantes (útil para el frontend)
app.get("/restaurants", async (req, res, next) => {
  try {
    const db = await loadDB();
    res.json(db.restaurants.sort((a,b)=>b.createdAt-a.createdAt));
  } catch (err) { next(err); }
});

// -------------------- ENDPOINT 1: Añadir un plato a un restaurante --------------------
app.post(
  "/restaurants/:restaurantId/dishes",
  validateIdParam("restaurantId"),
  validateDishBody,
  async (req, res, next) => {
    try {
      const { restaurantId } = req.params;
      const { name, price } = req.body;
      const db = await loadDB();

      const restaurant = db.restaurants.find(r => r._id === restaurantId);
      if (!restaurant) return res.status(404).json({ message: "El restaurante indicado no existe" });

      const newDish = {
        _id: nanoid(12),
        name: name.trim(),
        price,
        restaurant: restaurantId,
        createdAt: Date.now()
      };

      db.dishes.push(newDish);
      await saveDB(db);

      return res.status(201).json({
        name: newDish.name,
        price: newDish.price,
        restaurant: { _id: restaurant._id, name: restaurant.name }
      });
    } catch (err) { next(err); }
  }
);

// -------------------- ENDPOINT 2: Listar platos por restaurante con paginación --------------------
app.get("/dishes", validateIdParam("restaurant"), async (req, res, next) => {
  try {
    const restaurantId = req.query.restaurant;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 3;
    const skip = (page - 1) * limit;

    const db = await loadDB();
    const restaurant = db.restaurants.find(r => r._id === restaurantId);
    if (!restaurant) return res.status(404).json({ message: "El restaurante indicado no existe" });

    const allForRestaurant = db.dishes
      .filter(d => d.restaurant === restaurantId)
      .sort((a, b) => b.createdAt - a.createdAt);

    const total = allForRestaurant.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const pageItems = allForRestaurant.slice(skip, skip + limit);

    const data = pageItems.map(d => ({
      name: d.name,
      price: d.price,
      restaurant: { _id: restaurant._id, name: restaurant.name }
    }));

    return res.json({ info: { page, total, totalPages }, data });
  } catch (err) { next(err); }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API (JSON) lista en http://localhost:${PORT}`));

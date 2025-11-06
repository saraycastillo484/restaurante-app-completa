import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(__dirname)); // sirve todos los archivos del frontend

app.listen(8080, () => {
  console.log("🌐 Frontend disponible en http://localhost:8080");
});

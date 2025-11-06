# Backend — Restaurante API (JSON)

- Persistencia en `data.json` (sin MongoDB).
- Endpoints:
  - `POST /restaurants` — crea restaurante
  - `GET /restaurants` — lista restaurantes
  - `POST /restaurants/:restaurantId/dishes` — añade plato (valida existencia)
  - `GET /dishes?restaurant=<id>&page=<n>` — lista platos con paginación (3 por página)

## Uso
```bash
npm install
npm run dev
```
Servidor en `http://localhost:3000`.

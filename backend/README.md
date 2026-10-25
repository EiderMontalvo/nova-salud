# Nova Salud – Backend

API REST para la gestión de inventario y ventas de la botica Nova Salud. Express 5 + MariaDB, autenticación con JWT.

## Puesta en marcha

```sh
cd backend
npm install
cp .env.example .env   # completa los datos de la base y JWT_SECRET (mínimo 32 caracteres)
npm run dev            # http://localhost:3000
```

Si la base está vacía, créala con [database/schema.sql](database/schema.sql). Para crear el primer administrador, completa `ADMIN_NOMBRE`, `ADMIN_CORREO` y `ADMIN_PASSWORD` en el `.env` y ejecuta:

```sh
npm run crear-admin
```

`CORS_ORIGINS` lista los orígenes del frontend permitidos, separados por comas (por defecto `http://localhost:5173` y `http://localhost:3000`).

## Estructura

```
src/
  routes/       URL → middlewares → controlador
  controllers/  arma la respuesta HTTP
  services/     consultas SQL y reglas de negocio
  validators/   esquemas Zod de lo que acepta cada endpoint
  middlewares/  autenticación, roles, validación, subida de imágenes y errores
  utils/        transacciones, dinero, hora de Lima, paginación
database/       schema.sql y script del primer administrador
```

## Cómo conectar el frontend

1. Inicia sesión con `POST /api/auth/login` y body `{ "correo": "...", "password": "..." }`.
2. Guarda `data.token` y envíalo en cada petición: `Authorization: Bearer <token>`. Dura 1 hora.
3. Si recibes 401, vuelve al login. Un 403 significa que el rol no tiene permiso.

Todas las respuestas tienen la misma forma:

```json
{ "success": true, "message": "...", "data": { } }
```

Los listados agregan `pagination: { page, limit, total, total_pages }` y aceptan `?page=1&limit=20&search=texto`. Los errores devuelven `{ "success": false, "message": "...", "errors": [{ "field", "message" }] }`.

Ejemplo con `fetch`:

```js
const API = 'http://localhost:3000/api';

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ correo, password })
}).then(r => r.json());

const productos = await fetch(`${API}/productos?search=para`, {
  headers: { Authorization: `Bearer ${login.data.token}` }
}).then(r => r.json());
```

## Roles

- **ADMIN**: todo.
- **VENDEDOR**: consulta productos, categorías e inventario; gestiona clientes; registra ventas y solo ve las suyas.

## Endpoints

| Método | Ruta | Rol | Uso |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | público | Iniciar sesión (máx. 10 intentos fallidos cada 15 min) |
| GET | `/api/auth/me` | todos | Usuario actual |
| GET | `/api/health`, `/api/health/db` | público | Estado de la API y la base |
| GET | `/api/productos` | todos | Listar (`search`, `id_categoria`, `activo`) |
| GET | `/api/productos/:id` | todos | Ver uno |
| POST, PUT, DELETE | `/api/productos`, `/api/productos/:id` | ADMIN | Crear, editar, desactivar |
| POST | `/api/productos/:id/imagen` | ADMIN | Subir imagen (multipart, campo `imagen`) |
| GET | `/api/categorias`, `/api/categorias/:id` | todos | Listar y ver |
| POST, PUT, DELETE | `/api/categorias`, `/api/categorias/:id` | ADMIN | Crear, editar, desactivar |
| GET, POST | `/api/clientes` | todos | Listar (busca por nombre o documento) y crear |
| GET, PUT | `/api/clientes/:id` | todos | Ver y editar |
| GET, POST | `/api/ventas` | todos | Historial (`desde`, `hasta`, `estado`, `id_cliente`) y registrar |
| GET | `/api/ventas/:id` | todos | Ver venta con detalles |
| PATCH | `/api/ventas/:id/anular` | ADMIN | Anular y devolver el stock |
| GET | `/api/inventario` | todos | Existencias de productos |
| GET | `/api/inventario/stock-bajo` | todos | Alerta: stock ≤ stock mínimo |
| GET | `/api/inventario/por-vencer` | todos | Alerta: vencen en los próximos 30 días |
| GET | `/api/dashboard/resumen` | ADMIN | Totales del día y conteo de alertas |
| GET | `/api/reportes/ventas` | ADMIN | Ventas e ingresos de un período (`desde`, `hasta`) |
| GET, POST | `/api/usuarios` | ADMIN | Listar y crear usuarios |
| GET, PUT, DELETE | `/api/usuarios/:id` | ADMIN | Ver, editar, desactivar |

DELETE nunca borra: desactiva el registro (`activo: false`).

## Bodies principales

**Producto** (`POST /api/productos`):

```json
{
  "id_categoria": 1,
  "codigo": "P001",
  "nombre": "Paracetamol 500 mg",
  "precio": "3.50",
  "stock": 100,
  "stock_minimo": 10,
  "fecha_vencimiento": "2027-05-31",
  "descripcion": null,
  "imagen": null
}
```

En `PUT` se envían todos los campos (más `activo` opcional). Precios y totales siempre vuelven como texto con dos decimales.

**Venta** (`POST /api/ventas`):

```json
{
  "id_cliente": null,
  "metodo_pago": "EFECTIVO",
  "detalles": [{ "id_producto": 1, "cantidad": 2 }]
}
```

`metodo_pago`: `EFECTIVO`, `YAPE`, `PLIN` o `TARJETA`. El servidor toma los precios de la base y calcula el total; no los envíes. El stock se descuenta en la misma operación, y la respuesta trae `alertas_stock` con los productos vendidos que quedaron en stock mínimo o por debajo, para que el frontend avise al instante. No se puede vender un producto inactivo, vencido o sin stock suficiente (409).

**Cliente**: `{ "nombre": "Ana", "documento": "12345678", "telefono": null, "correo": null }`

**Usuario**: `{ "nombre": "...", "correo": "...", "password": "mínimo 12 caracteres", "rol": "VENDEDOR" }`

**Categoría**: `{ "nombre": "Analgésicos", "descripcion": null }`

## Imágenes

`POST /api/productos/:id/imagen` recibe un `FormData` con el archivo en el campo `imagen` (JPEG, PNG o WebP, hasta 5 MB). La API la convierte a WebP, la sube por SFTP al hosting y guarda la URL en el producto. Requiere las variables `IMAGE_*` del `.env`; sin ellas responde 503. En lugar de subir archivos, también se puede guardar una URL HTTPS en el campo `imagen` del producto.

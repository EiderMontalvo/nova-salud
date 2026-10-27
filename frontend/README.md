# Nova Salud — Frontend

Sistema interno de la botica Nova Salud: catálogo de productos, ventas en mostrador e inventario con alertas. Consume la API de Nova Salud.

## Stack

- React 19 + Vite
- React Router 7
- CSS propio con tokens en `src/index.css` (sin frameworks)
- Íconos `lucide-react`; tipografías Inter y Lexend servidas desde el proyecto (`@fontsource`)

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Crear .env.local con la URL de la API
echo "VITE_API_URL=https://api-novasalud.im-ra.com/api" > .env.local

# 3. Arrancar en desarrollo
npm run dev
```

Abre http://localhost:5173

## Documentación de la API (Swagger)

Todos los endpoints, con sus parámetros y respuestas, están en:

**https://api-novasalud.im-ra.com/api-docs**

El navegador pide usuario y contraseña. Ingresa con la cuenta **admin del diseñador** (`frontend-admin@novasalud.im-ra.com`) y su contraseña.

## Credenciales de prueba

El administrador las entrega por un canal privado. No las subas al repositorio.

| Rol | Correo | Acceso |
|-----|--------|--------|
| ADMIN | `frontend-admin@novasalud.im-ra.com` | Todo, incluida la administración de productos y categorías |
| VENDEDOR | `frontend-vendedor@novasalud.im-ra.com` | Catálogo, ventas y alertas |

## Pantallas

| Ruta | Descripción | Rol |
|------|-------------|-----|
| `/login` | Inicio de sesión | Público |
| `/` | Catálogo en hileras por categoría, búsqueda y selector de categoría. Al pasar el mouse por un producto se ve su stock, vencimiento y "Agregar a venta" | Todos |
| `/producto/:id` | Detalle de producto | Todos |
| `/ventas` | Punto de venta: productos con foto, ticket con cantidades, cliente opcional, forma de pago, monto recibido y vuelto en efectivo, y comprobante imprimible | Todos |
| `/stock-bajo` | Alertas de stock bajo y de productos por vencer | Todos |
| `/admin/productos` | CRUD de productos: búsqueda, filtro por categoría, activos/inactivos, paginación, foto con vista previa (arrastrar, cambiar, quitar), desactivar y reactivar | ADMIN |
| `/admin/categorias` | CRUD de categorías con imagen, desactivar y reactivar | ADMIN |

`/admin/productos?nuevo=1` abre el formulario de alta y `/admin/productos?editar=<id>` abre la edición de ese producto.

## Estructura

```
src/
  api.js         → Cliente HTTP, paginación completa (traerTodos) y cuerpos para PUT
  context/       → AuthContext (sesión y roles), VentaContext (venta en curso)
  hooks/         → useCatalogo (catálogo activo), useDebounce
  lib/           → formato (soles, fechas, vencimiento), errores (mensajes de la API)
  components/    → Layout, marca, tiles e hileras, Drawer, ImageDrop, StockEstado, formularios
  pages/         → Pantallas y su CSS
public/
  fondo-login.webp, fondo-login-movil.webp → fondo del login
  sin-imagen.svg → imagen para productos sin foto
```

## Despliegue en Vercel

1. Sube el repo a GitHub sin `.env.local` ni `node_modules`.
2. En Vercel, importa el proyecto con el framework Vite.
3. Agrega la variable de entorno `VITE_API_URL` = `https://api-novasalud.im-ra.com/api`.
4. Llama al proyecto **nova-salud** para que la URL `https://nova-salud.vercel.app` esté autorizada en CORS.

`vercel.json` ya redirige todas las rutas a `index.html` para que funcione el enrutado de la SPA.

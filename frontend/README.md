# Nova Salud — Frontend

Aplicación web interna de la botica Nova Salud: catálogo de productos, ventas en mostrador e inventario con alertas. Consume la API REST del [backend](../backend/README.md).

**Producción:** https://nova-salud-rho.vercel.app

## Stack

- React 19 + Vite 6
- React Router 7
- CSS propio con tokens en `src/index.css` (sin frameworks), con tema claro y oscuro
- Íconos `lucide-react`; tipografías Inter y Lexend servidas desde el proyecto (`@fontsource`)

## Inicio rápido

```bash
npm install
cp .env.example .env.local   # ajusta VITE_API_URL si usas otra API
npm run dev                  # http://localhost:5173
```

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compila a `dist/` para producción |
| `npm run preview` | Sirve `dist/` localmente para revisar el build |

### Variables de entorno

| Variable | Ejemplo | Uso |
|----------|---------|-----|
| `VITE_API_URL` | `https://api-novasalud.im-ra.com/api` | URL base de la API, sin barra final |

Vite incrusta la variable al compilar: si la cambias, vuelve a ejecutar el build o a desplegar.

## Documentación de la API (Swagger)

Todos los endpoints, con sus parámetros y respuestas: **https://api-novasalud.im-ra.com/api-docs**. El navegador pide usuario y contraseña; usa la cuenta admin del diseñador.

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
| `/` | Catálogo en hileras por categoría, con búsqueda y filtro. Cada producto muestra precio, stock, vencimiento y "Agregar a venta" | Todos |
| `/producto/:id` | Detalle de producto | Todos |
| `/ventas` | Punto de venta: productos con foto, ticket con cantidades, cliente opcional, forma de pago (efectivo, Yape, Plin, tarjeta) y comprobante imprimible | Todos |
| `/stock-bajo` | Alertas de stock bajo y de productos por vencer | Todos |
| `/admin/productos` | Alta, edición, foto, desactivación y reactivación de productos, con búsqueda, filtros y paginación | ADMIN |
| `/admin/categorias` | Alta, edición, imagen, desactivación y reactivación de categorías | ADMIN |

`/admin/productos?nuevo=1` abre el formulario de alta y `/admin/productos?editar=<id>` la edición de ese producto.

## Funcionalidades destacadas

- **Punto de venta**: el ticket cabe en pantalla y el total con el botón "Cobrar" siempre queda a la vista. En efectivo calcula el vuelto con billetes rápidos; con Yape, Plin o tarjeta guía el cobro y pide confirmar que el pago llegó.
- **Clientes sin exponer la cartera**: no se lista a los clientes. Se buscan por DNI, RUC o nombre a partir de 3 caracteres (máximo 5 resultados) y se pueden registrar desde la caja con solo el nombre.
- **Avisos flotantes**: las confirmaciones (guardado, desactivación con "Deshacer", venta registrada) aparecen en el lateral derecho y se pausan mientras el cursor o el foco están encima.
- **Navegación**: menú lateral plegable que recuerda su estado; en móvil, barra superior y barra inferior de pestañas.
- **Tema claro y oscuro**: se alterna desde la barra superior o el login, se guarda en el navegador y se aplica antes del primer pintado, sin destellos.
- **Accesibilidad**: enlace "Saltar al contenido", foco al contenido al cambiar de pantalla, controles con nombre accesible, contraste AA en ambos temas y áreas táctiles de 44 px en pantallas táctiles.
- **Carga diferida**: las pantallas de administración se descargan solo cuando se abren.

## Estructura

```
src/
  api.js         → Cliente HTTP, paginación completa (traerTodos) y cuerpos para PUT
  context/       → Auth (sesión y roles), Venta (venta en curso), Theme (tema), Toast (avisos flotantes)
  hooks/         → useCatalogo, useDebounce, usePreferencia (estado guardado en el navegador)
  lib/           → formato (soles, fechas, vencimiento), errores (mensajes de la API), dispositivo
  components/    → Layout, marca, tiles e hileras, Drawer, formularios, buscador de clientes, pago digital
  assets/pagos/  → Logos de formas de pago (origen y licencias en CREDITOS.md)
  pages/         → Pantallas y su CSS
public/
  favicon.svg, apple-touch-icon.png, icon-192.png, icon-512.png, site.webmanifest → isotipo e íconos de la app
  fondo-login.webp, fondo-login-movil.webp → fondo del login
  sin-imagen.svg → imagen para productos sin foto
```

Los estilos globales (`index.css`) se cargan antes que la app, así que el CSS de cada pantalla puede sobrescribirlos con la misma especificidad.

## Despliegue en Vercel

1. Sube el repositorio a GitHub, sin `.env.local` ni `node_modules`.
2. En Vercel, importa el repositorio y en **Root Directory** elige `frontend`. El framework (Vite), el comando `npm run build` y la carpeta `dist` ya están definidos en `vercel.json`.
3. En **Settings → Environment Variables**, agrega `VITE_API_URL` con la URL de la API para Production y Preview.
4. Agrega el dominio de Vercel, `https://nova-salud-rho.vercel.app` (sin barra final), a `CORS_ORIGINS` del backend; si no, el navegador bloqueará las peticiones.

`vercel.json` además:

- Redirige todas las rutas a `index.html` para que funcione el enrutado de la SPA al recargar o abrir un enlace directo.
- Cachea un año los archivos de `/assets/` (llevan hash en el nombre, así que cada build nuevo usa archivos nuevos).
- Envía cabeceras de seguridad básicas: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` y `Permissions-Policy`.

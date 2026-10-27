# Nova Salud — Frontend

Frontend de gestión para farmacia/botica conectado a la API de Nova Salud.

## Stack

- React 19 + Vite
- React Router 7
- CSS puro (sin frameworks)

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variable de entorno (ya existe .env.local de ejemplo)
# VITE_API_URL=https://api-novasalud.im-ra.com/api

# 3. Arrancar en desarrollo
npm run dev
```

Abre http://localhost:5173

## Credenciales de prueba

Te las entrega el administrador por canal privado:

- **ADMIN**: `frontend-admin@novasalud.im-ra.com` → panel completo
- **VENDEDOR**: `frontend-vendedor@novasalud.im-ra.com` → catálogo + ventas

## Funcionalidades

| Ruta | Descripción | Rol |
|------|-------------|-----|
| `/login` | Inicio de sesión | Público |
| `/` | Catálogo de productos | Todos |
| `/producto/:id` | Detalle de producto | Todos |
| `/ventas` | Registrar venta | Todos |
| `/stock-bajo` | Productos con stock bajo | Todos |
| `/admin/productos` | CRUD productos + imágenes | ADMIN |
| `/admin/categorias` | CRUD categorías + imágenes | ADMIN |

## Despliegue en Vercel

1. Sube el repo a GitHub (sin `.env.local` ni `node_modules`)
2. En Vercel → Import project
3. Framework: Vite
4. Environment Variable: `VITE_API_URL` = `https://api-novasalud.im-ra.com/api`
5. El proyecto debe llamarse **nova-salud** para que la URL `https://nova-salud.vercel.app` esté autorizada en CORS

## Estructura

```
src/
  api.js              → Cliente HTTP reutilizable
  context/AuthContext → Login, token, roles
  components/Layout   → Sidebar + layout
  pages/              → Todas las pantallas
```

## Checklist (guía)

- [x] URL de API en variable de entorno
- [x] Token en sessionStorage + cliente HTTP
- [x] 401 → redirige a login
- [x] Roles ADMIN / VENDEDOR
- [x] Imágenes con alt, lazy y fallback
- [x] vercel.json para SPA
- [x] FormData para subir imágenes

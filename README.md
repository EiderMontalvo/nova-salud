# Nova Salud

Sistema de gestión para la botica Nova Salud: catálogo de productos, ventas en mostrador, clientes e inventario con alertas de stock bajo y vencimiento.

## Componentes

| Carpeta | Qué es | Tecnología | Documentación |
|---------|--------|------------|---------------|
| [`backend/`](backend/) | API REST con autenticación JWT y roles | Node.js, Express 5, MariaDB, Zod | [backend/README.md](backend/README.md) |
| [`frontend/`](frontend/) | Aplicación web para el personal de la botica | React 19, Vite, React Router | [frontend/README.md](frontend/README.md) |

```
nova_salud/
├── backend/    API: rutas, controladores, servicios, validadores y esquema SQL
└── frontend/   Web: pantallas, componentes, estilos e íconos
```

## Qué permite hacer

- **Catálogo**: productos agrupados por categoría, con foto, precio, stock y vencimiento.
- **Ventas**: punto de venta con ticket, cliente opcional, pago en efectivo (con vuelto), Yape, Plin o tarjeta, y comprobante imprimible. El stock se descuenta al registrar la venta.
- **Inventario**: alertas de productos con stock bajo y por vencer.
- **Administración** (solo ADMIN): alta, edición y desactivación de productos y categorías, con imágenes.

## Roles

- **ADMIN**: acceso completo, incluida la administración de productos, categorías y usuarios.
- **VENDEDOR**: catálogo, ventas, clientes y alertas.

## Puesta en marcha local

Requisitos: Node.js 20 o superior y una base de datos MariaDB o MySQL.

```bash
# API (http://localhost:3000)
cd backend
npm install
cp .env.example .env      # datos de la base, JWT_SECRET y CORS_ORIGINS
npm run dev

# Web (http://localhost:5173), en otra terminal
cd frontend
npm install
cp .env.example .env.local   # VITE_API_URL apuntando a la API
npm run dev
```

Para crear la base y el primer administrador, sigue los pasos de [backend/README.md](backend/README.md).

## Despliegue

- **Frontend**: Vercel, en https://nova-salud-rho.vercel.app, con `frontend` como Root Directory y la variable `VITE_API_URL`. Detalle en [frontend/README.md](frontend/README.md#despliegue-en-vercel).
- **Backend**: cualquier servidor Node.js con acceso a la base de datos. `CORS_ORIGINS` debe incluir `https://nova-salud-rho.vercel.app`.

## Seguridad

- No subas archivos `.env` ni credenciales al repositorio: cada carpeta incluye un `.env.example` con las variables necesarias.
- Las credenciales de prueba se comparten por un canal privado.

# Nova Salud Backend

API Express 5 con CommonJS y MariaDB. Esta etapa implementa autenticación JWT y categorías; productos conserva su consulta inicial. No incluye frontend ni despliegue.

## Ejecutar

Desde `backend`:

```sh
npm ci
npm run dev
```

La configuración se lee desde `.env`. Usa `.env.example` como referencia sin sobrescribir un `.env` existente. Configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y un `JWT_SECRET` aleatorio de al menos 32 caracteres. El servidor rechaza secretos ausentes o cortos. `PORT` vale 3000 por defecto.

`CORS_ORIGINS` acepta orígenes separados por comas. Por defecto permite `http://localhost:5173` y `http://localhost:3000`. Añade el origen real del frontend cuando corresponda. No se permiten orígenes arbitrarios por defecto. CORS es una política del navegador; la autorización la verifica JWT.

- Swagger UI: [http://localhost:3000/api-docs/](http://localhost:3000/api-docs/)
- OpenAPI JSON: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

Si usas otro puerto, reemplaza 3000 en las URLs.

## Primer administrador

No hay registro público. Para crear el primer administrador, define temporalmente en el `.env` local `ADMIN_NOMBRE`, `ADMIN_CORREO` y `ADMIN_PASSWORD`, con una contraseña de al menos 12 caracteres y hasta 72 bytes UTF-8. Luego ejecuta:

```sh
npm run admin:create
```

El script guarda un hash bcrypt con costo 12, crea un usuario ADMIN activo y usa un bloqueo de MariaDB para serializar ejecuciones simultáneas. Rechaza la operación si ya existe cualquier ADMIN y no sobrescribe usuarios existentes. Retira `ADMIN_PASSWORD` del `.env` al terminar. No subas ese archivo a Git. Este script debe ejecutarse únicamente cuando decidas crear ese usuario; no se ejecuta al iniciar el servidor.

## Conectar el frontend

1. Envía `POST /api/auth/login` con `{ "correo": "tu-correo", "password": "tu-contraseña" }`.
2. Obtén `data.token`. Envía `Authorization: Bearer <token>` en solicitudes protegidas. En Swagger, pulsa **Authorize** y pega solamente el token.
3. `GET /api/auth/me` devuelve el usuario actual sin contraseña ni hash. El token vence en 3600 segundos; un 401 requiere iniciar sesión otra vez.
4. ADMIN y VENDEDOR pueden consultar categorías. Solo ADMIN puede crear, editar y desactivar; VENDEDOR recibe 403 en esas operaciones.

No envíes el rol ni el id del usuario para autorizar operaciones. El backend consulta el usuario activo y su rol en MariaDB en cada solicitud protegida. Desactivar al usuario o cambiar su rol tiene efecto incluso con un token emitido antes.

El login permite hasta 10 intentos fallidos por IP cada 15 minutos, incluyendo solicitudes inválidas. Un 429 incluye `Retry-After` en segundos. El contador se mantiene en memoria y corresponde a una sola instancia; antes de desplegar varias instancias o usar un proxy, debe revisarse el almacenamiento del contador y la configuración de IP confiable.

## Endpoints de esta etapa

| Método | Ruta | Acceso | Resultado |
| --- | --- | --- | --- |
| GET | `/` | Público | Información de la API |
| GET | `/api/health` | Público | Salud de Express |
| GET | `/api/health/db` | Público | Consulta `SELECT 1`; 503 si MariaDB falla |
| POST | `/api/auth/login` | Público, limitado | Token y usuario |
| GET | `/api/auth/me` | JWT | Usuario autenticado |
| GET | `/api/categorias` | JWT | Lista paginada |
| GET | `/api/categorias/:id` | JWT | Categoría activa o inactiva |
| POST | `/api/categorias` | ADMIN | Categoría creada, 201 y cabecera Location |
| PUT | `/api/categorias/:id` | ADMIN | Categoría actualizada |
| DELETE | `/api/categorias/:id` | ADMIN | Eliminación lógica, 204 sin cuerpo |
| GET | `/api/productos` | Público | Array de productos activos |

### Categorías

Listado: `page=1`, `limit=20` (máximo 100), `search` por nombre y `activo=true` por defecto. Para consultar categorías inactivas usa `activo=false`. `page` admite hasta 1000000. La búsqueda usa `LIKE`, por lo que `%` y `_` tienen su significado SQL de comodín.

Crear requiere `nombre` (entre 1 y 100 caracteres tras recortar espacios), con `descripcion` opcional de hasta 255 caracteres o null. El nombre es único según la colación de la base, incluso entre categorías desactivadas. Actualizar requiere `nombre`; una descripción omitida queda en null. `activo` es opcional en PUT y conserva su valor si se omite. Para reactivar una categoría envía `activo: true`.

Desactivar conserva la fila y sus relaciones con productos. No desactiva los productos asociados. Repetir DELETE sobre una categoría existente devuelve 204. Un identificador inexistente devuelve 404. Los parámetros inválidos o desconocidos y los campos desconocidos del cuerpo se rechazan con 400 antes de consultar o escribir los datos de categorías.

Las respuestas de categorías usan `{ success, message, data }`, con `pagination: { page, limit, total, total_pages }` en el listado. Los errores usan `{ success: false, message, errors: [] }`; los de validación incluyen `field` y `message`. JSON mal formado devuelve 400 y un cuerpo mayor a 1 MB devuelve 413. Un fallo interno no devuelve consultas, trazas ni credenciales.

### Productos existentes

`GET /api/productos` mantiene su array original, acceso público, ausencia de filtros y ausencia de paginación para conservar el comportamiento previo. `precio` es una cadena decimal y `fecha_vencimiento` es una cadena ISO 8601 o null, según la serialización actual de mysql2. La protección y el CRUD de productos corresponden al siguiente módulo.

## Organización

`routes` vincula endpoints con validación, autenticación y controladores. `controllers` construye las respuestas HTTP. `services` contiene las consultas parametrizadas y reglas de negocio. `validators` define la validación con Zod. `middlewares` concentra JWT, permisos, validación y errores.

Los contratos están en `src/docs/openapi.yaml`, cargados por swagger-jsdoc con `failOnErrors`. Mantén este archivo sincronizado al modificar rutas o respuestas. Se documentan únicamente operaciones implementadas; los esquemas de clientes y ventas se incorporarán junto con sus módulos.

## Verificación

```sh
npm test
```

Las pruebas usan Node Test Runner, Supertest, bcrypt y JWT reales, con un adaptador SQL aislado en memoria que no se conecta a la base remota. Comprueban autenticación, permisos, validación, paginación, duplicados, eliminación lógica, límites del login, errores, CORS y creación controlada del administrador. Swagger Parser valida OpenAPI y AJV compara respuestas HTTP con sus esquemas.

En esta implementación también se verificaron mediante solo lectura en MariaDB real `SELECT 1`, la respuesta de productos, el listado paginado de categorías y su consulta individual. Las escrituras se verificaron únicamente con el adaptador aislado; falta una prueba de integración de escrituras sobre una base MariaDB independiente. No se ejecutó el bootstrap de administrador sobre la base remota.

Swagger UI devolvió HTTP 200 en pruebas. La inspección visual y los clics en el navegador no se pudieron realizar porque la herramienta de navegador denegó el acceso a localhost.

## Revisión antislop-code

- PASS: se retiró el comentario redundante de `connectTimeout`; los tres comentarios restantes explican el hash señuelo, la revocación de permisos y el bloqueo del bootstrap.
- PASS: sin separadores decorativos, narración por pasos, etiquetas vacías ni TODO vagos en los comentarios.
- PASS: los comentarios se mantienen en una línea y los contratos API se conservan como documentación OpenAPI.
- Reglas visuales del Delivery Gate: no aplican, esta entrega modifica exclusivamente el backend y su documentación técnica.

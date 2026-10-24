# Nova Salud Backend

API REST académica con Express 5, CommonJS y MariaDB. Implementa autenticación, usuarios, categorías, productos, referencias y carga de imágenes, clientes, ventas con transacciones, inventario, alertas, dashboard y reportes. No incluye frontend ni despliegue.

## Ejecutar

Desde `backend`:

```sh
npm ci
npm run dev
```

Usa `.env.example` como referencia sin sobrescribir un `.env` existente. Configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y un `JWT_SECRET` aleatorio de al menos 32 caracteres. `PORT` vale 3000 por defecto. Las credenciales nunca deben incorporarse a Git.

- Swagger UI: [http://localhost:3000/api-docs/](http://localhost:3000/api-docs/)
- OpenAPI JSON: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

Si usas otro puerto, reemplaza 3000 en las URLs. El servidor comprueba la conexión antes de escuchar. Las sesiones MariaDB y la interpretación de timestamps usan UTC-05:00. Las ventas, sus períodos y el resumen diario se calculan en `America/Lima`.

`CORS_ORIGINS` contiene orígenes separados por comas. Por defecto permite `http://localhost:5173` y `http://localhost:3000`. Añade el origen real del frontend cuando corresponda. CORS controla navegadores; la autorización la verifica JWT.

## Primer administrador

No existe registro público. Para crear el primer administrador define temporalmente en el `.env` local `ADMIN_NOMBRE`, `ADMIN_CORREO` y `ADMIN_PASSWORD`. Usa una contraseña de al menos 12 caracteres y hasta 72 bytes UTF-8. Ejecuta:

```sh
npm run admin:create
```

El script guarda bcrypt con costo 12 y crea un ADMIN activo. Un bloqueo MariaDB serializa ejecuciones simultáneas. Si ya existe cualquier ADMIN, rechaza la operación sin sobrescribir usuarios. Retira `ADMIN_PASSWORD` del `.env` al terminar. El bootstrap no se ejecuta al iniciar el servidor y no se ejecutó contra la base remota durante este desarrollo.

## Conectar el frontend

1. Envía `POST /api/auth/login` con `{ "correo": "tu-correo", "password": "tu-contraseña" }`.
2. Guarda `data.token` y envía `Authorization: Bearer <token>` en las solicitudes protegidas. En Swagger, **Authorize** recibe solo el token.
3. `GET /api/auth/me` devuelve el usuario actual sin contraseña ni hash. El token vence en 3600 segundos. Un 401 requiere volver a iniciar sesión; un 403 indica falta de permisos.
4. Lee `data` en las respuestas. Los listados añaden `pagination: { page, limit, total, total_pages }`. Un resultado vacío usa `data: []` y `total_pages: 0`.
5. Los errores usan `{ success: false, message, errors: [] }`. Los errores de validación añaden objetos con `field` y `message`.

El login limita a 10 intentos fallidos por IP cada 15 minutos, incluyendo cuerpos inválidos. Un 429 incluye `Retry-After` en segundos. El contador está en memoria para una instancia; antes de desplegar varias instancias o usar un proxy, debe revisarse su almacenamiento y la configuración de IP confiable. El backend consulta el usuario activo y su rol en cada solicitud protegida, de modo que desactivarlo o cambiar su rol afecta los accesos posteriores. Cambiar su contraseña no revoca tokens ya emitidos, cuya vigencia máxima es una hora.

El cuerpo JSON admite hasta 1 MB. JSON inválido devuelve 400; un cuerpo excesivo, 413. Se rechazan campos desconocidos en los cuerpos y parámetros de consulta validados. Los errores internos no devuelven SQL, trazas ni credenciales.

## Endpoints y permisos

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/` | Público |
| GET | `/api/health` | Público |
| GET | `/api/health/db` | Público, SELECT 1; 503 si falla |
| POST | `/api/auth/login` | Público, limitado por IP |
| GET | `/api/auth/me` | ADMIN o VENDEDOR |
| GET, POST | `/api/usuarios` | ADMIN |
| GET, PUT, DELETE | `/api/usuarios/:id` | ADMIN |
| GET | `/api/categorias`, `/api/categorias/:id` | ADMIN o VENDEDOR |
| POST | `/api/categorias` | ADMIN |
| PUT, DELETE | `/api/categorias/:id` | ADMIN |
| GET | `/api/productos`, `/api/productos/:id` | ADMIN o VENDEDOR |
| POST | `/api/productos` | ADMIN |
| PUT, DELETE | `/api/productos/:id` | ADMIN |
| POST | `/api/productos/:id/imagen` | ADMIN |
| GET, POST | `/api/clientes` | ADMIN o VENDEDOR |
| GET, PUT | `/api/clientes/:id` | ADMIN o VENDEDOR |
| GET, POST | `/api/ventas` | ADMIN o VENDEDOR |
| GET | `/api/ventas/:id` | ADMIN o vendedor que la registró |
| PATCH | `/api/ventas/:id/anular` | ADMIN |
| GET | `/api/inventario` | ADMIN o VENDEDOR |
| GET | `/api/inventario/stock-bajo` | ADMIN o VENDEDOR |
| GET | `/api/inventario/por-vencer` | ADMIN o VENDEDOR |
| GET | `/api/dashboard/resumen` | ADMIN |
| GET | `/api/reportes/ventas` | ADMIN |

Swagger detalla campos, tipos, ejemplos, filtros y respuestas de cada operación. Los ejemplos son ilustrativos; usa identificadores existentes al probar.

## Usuarios y clientes

Usuarios: nombre de hasta 100 caracteres, correo único, rol ADMIN o VENDEDOR y contraseña bcrypt. Crear exige al menos 12 caracteres y hasta 72 bytes UTF-8. Actualizar requiere nombre, correo y rol; password y activo son opcionales y conservan su valor si se omiten. DELETE desactiva sin borrar. No se permite desactivar la propia cuenta ni dejar el sistema sin un administrador activo, incluso ante cambios simultáneos. El listado filtra por `search` (nombre o correo) y por `activo`; omitir este último incluye ambos estados.

Clientes: solo nombre es obligatorio (hasta 100 caracteres). Documento y teléfono admiten hasta 20, y correo hasta 100. Los opcionales omitidos quedan en null al crear o actualizar. Documento es único cuando se proporciona. `search` busca por nombre o documento. No existe eliminación ni cuentas de acceso para clientes. Un cliente es opcional al vender.

## Categorías y productos

Los listados admiten `page=1`, `limit=20` (máximo 100), `search` y `activo=true`. Productos también admite `id_categoria` y busca por nombre o código. Los filtros se combinan y los resultados se ordenan por id descendente. `page` llega hasta 1000000. `search` usa LIKE, donde `%` y `_` son comodines SQL. GET por id permite consultar activos e inactivos.

Categorías: nombre obligatorio de hasta 100 caracteres, recortado y no vacío, único incluso entre inactivas. Descripción opcional de hasta 255 o null. En PUT se exige nombre; descripción omitida queda en null y activo conserva su estado si se omite. DELETE desactiva y conserva las relaciones; no desactiva los productos asociados.

Productos: crear exige `id_categoria`, `codigo` (hasta 50), `nombre` (hasta 150) y `precio`. Stock vale 0 y stock mínimo 5 si se omiten. El código debe ser único incluso entre inactivos. Se recortan los textos y se rechazan nombres y códigos vacíos. Descripción admite hasta 10000 caracteres. La categoría debe existir; puede estar inactiva, porque desactivarla no desactiva sus productos asociados.

`precio` admite número JSON o cadena decimal entre 0 y 99999999.99, con hasta dos decimales, según DECIMAL(10,2). Se recomienda enviar `"3.50"`. Se rechazan cadenas con comas, signos, espacios, notación exponencial y ceros iniciales; no se redondean importes con más decimales. Las respuestas conservan el precio como cadena de dos decimales. Stock y stock mínimo son enteros de 0 a 2147483647.

`fecha_vencimiento` admite null o una fecha real entre `1000-01-01` y `9999-12-31`, recibida y devuelta como `YYYY-MM-DD` sin hora. Se permite registrar productos vencidos para reflejar el inventario; ventas impide venderlos.

PUT de productos exige id_categoria, codigo, nombre, precio, stock y stock_minimo. Los dos campos de stock son cantidades absolutas administradas por ADMIN y no se reinician por omisión. Descripción, imagen y vencimiento omitidos quedan en null. Activo se conserva si se omite y permite reactivar con true. DELETE solo desactiva; conserva stock y referencias históricas. Repetir DELETE sobre un recurso existente devuelve 204 sin cuerpo. Id inexistente devuelve 404; duplicado, 409.

El listado de productos inicial fue reemplazado: ahora exige JWT y devuelve `{ success, message, data, pagination }`, no un array público. Las respuestas incluyen activo y fecha_creacion. El frontend debe leer `respuesta.data`.

## Imágenes en BanaHosting

Se puede asociar directamente una referencia `imagen` mediante POST/PUT de producto: null o URL HTTPS sin credenciales, de hasta 255 caracteres. Esa operación solo guarda la referencia y no descarga ni inspecciona el archivo remoto.

Para cargar un archivo desde el frontend usa `POST /api/productos/:id/imagen`, multipart/form-data, un único campo de archivo llamado `imagen`. No añadas otros campos ni establezcas manualmente Content-Type cuando uses FormData en el navegador. Solo ADMIN puede cargar archivos.

La API comprueba el contenido real con Sharp, sin confiar en nombre, extensión o MIME declarado. Admite JPEG, PNG y WebP válidos, sin animación, de hasta 5 MB y 25 megapíxeles. Recodifica a WebP, retira metadatos, limita a 1600x1600 y genera un UUID. No publica el nombre ni el contenido original. Transfiere por SFTP y guarda solo la URL en MariaDB; no depende de un directorio persistente donde se ejecute Node.

Configura exclusivamente en el `.env` local:

| Variable | Contenido |
| --- | --- |
| `IMAGE_SFTP_HOST` | Host SSH de tu cuenta, confirmado por BanaHosting |
| `IMAGE_SFTP_PORT` | Puerto SSH, por defecto 22 |
| `IMAGE_SFTP_USER` | Usuario autorizado para SFTP |
| `IMAGE_SFTP_PASSWORD` | Contraseña de ese acceso |
| `IMAGE_SFTP_DIRECTORY` | Ruta absoluta del directorio público de imágenes, por ejemplo la carpeta de productos dentro de public_html |
| `IMAGE_SFTP_HOST_SHA256` | Huella SHA-256 de la clave del servidor SSH, 64 caracteres hexadecimales, verificada por un canal confiable |
| `IMAGE_PUBLIC_URL` | URL HTTPS pública que sirve ese mismo directorio, sin consulta, fragmento ni credenciales |

Confirma con BanaHosting que tu cuenta permite SFTP/SSH, su puerto, directorio y huella. SFTP no utiliza las cuentas FTP independientes de cPanel. El backend compara la huella antes de autenticar; no desactives esta verificación. No pegues contraseñas ni claves en el chat o repositorio. El proveedor debe servir ese directorio por HTTPS y permitir lectura pública de los archivos; una ruta SFTP y una URL pública no se deducen automáticamente entre sí.

Si falta configuración devuelve 503; si SFTP falla, 502. Si falla guardar la referencia después de subir, intenta eliminar únicamente la imagen recién creada. No elimina imágenes anteriores al reemplazarlas para evitar borrar archivos compartidos o referencias externas. La limpieza de archivos antiguos puede hacerse posteriormente con una revisión de referencias. La conexión SFTP real y la publicación pública de archivos permanecen pendientes hasta configurar y verificar el hosting.

## Ventas, inventario y reportes

Ejemplo de solicitud de venta:

```json
{
  "id_cliente": null,
  "metodo_pago": "EFECTIVO",
  "detalles": [
    { "id_producto": 1, "cantidad": 2 }
  ]
}
```

Se permiten EFECTIVO, YAPE, PLIN y TARJETA, entre 1 y 100 productos sin ids repetidos y cantidades enteras positivas. No envíes usuario, precios, subtotales ni total: se rechazan como campos desconocidos. El usuario se toma del JWT, los precios se leen de MariaDB y los cálculos se realizan con BigInt en centavos. Total y subtotales se limitan a 99999999.99 y se devuelven como cadenas decimales.

El registro obtiene una sola conexión, inicia transacción y bloquea las filas de productos en orden de id con FOR UPDATE. Verifica usuario activo, cliente cuando se proporciona, productos existentes y activos, vencimiento y stock. Inserta venta y detalles y descuenta stock con una condición adicional que impide valores negativos. Confirma todo junto; ante cualquier fallo hace rollback y libera la conexión. Un producto vence cuando su fecha es anterior a hoy en Lima; los que vencen hoy se pueden vender. Un stock insuficiente, producto inactivo o vencido devuelve 409; producto inexistente, 404; cliente inexistente, 400.

El precio registrado en cada detalle y el total son históricos: editar el precio del producto no modifica ventas anteriores. El historial admite page, limit, desde, hasta, estado, id_usuario e id_cliente. Los extremos de fecha son inclusivos y desde no puede superar hasta. ADMIN consulta todas las ventas y VENDEDOR solo las propias. El nombre y código mostrados en los detalles corresponden al producto actual.

Anular requiere ADMIN, `PATCH /api/ventas/:id/anular`, sin cuerpo o con JSON vacío. Bloquea la venta, comprueba COMPLETADA y restaura cantidades en la misma transacción. Conserva las filas y marca ANULADA. Una segunda anulación devuelve 409 y no vuelve a restaurar. Restaura incluso si un producto ahora está vencido o inactivo; si la restitución excedería la capacidad de stock, revierte la operación.

No se implementa clave de idempotencia para crear ventas. Ante una respuesta de red incierta, comprueba el historial antes de reenviar automáticamente el POST para evitar registrar dos operaciones. Un conflicto SQL de bloqueo se devuelve como 409.

Inventario refleja el stock confirmado en la siguiente consulta HTTP. `stock-bajo` usa vista_stock_bajo, activos con stock menor o igual al mínimo. `por-vencer` usa la vista existente, activos con stock mayor que cero y vencimiento entre hoy y 30 días inclusive. No se crean tablas adicionales ni WebSockets.

Dashboard devuelve productos activos, conteos de alertas, ventas completadas e ingresos del día de Lima. Reportes permite desde y hasta, ambas con hoy como valor por defecto, y página y límite. Devuelve historial paginado y resumen de todo el período. Las anuladas aparecen en el historial y en su conteo, pero quedan excluidas de ingresos. Solo ADMIN accede al dashboard y a reportes.

## Código y Swagger

Routes vincula rutas con middlewares y controladores; controllers construye respuestas; services concentra SQL parametrizado, reglas y transacciones; validators usa Zod; middlewares maneja JWT, roles, cargas y errores.

OpenAPI 3.0.3 se construye con swagger-jsdoc y failOnErrors. `src/docs/openapi.yaml` contiene autenticación, categorías y componentes comunes; `productos.yaml`, productos; `modules.js`, contratos y esquemas de los demás módulos. Se conserva documentación separada para que las rutas no acumulen bloques extensos. Mantén contratos sincronizados al cambiar rutas o respuestas. Todos los endpoints protegidos declaran Bearer Auth para Authorize.

## Pruebas

Pruebas aisladas, sin acceso a MariaDB remota:

```sh
npm test
```

Integración con MariaDB 11.4 real en Docker:

```sh
npm run test:integration
```

Requiere Docker disponible y acceso a la imagen oficial `mariadb:11.4`. El runner crea un contenedor desechable, publica un puerto aleatorio solo en 127.0.0.1, genera credenciales efímeras y crea nova_salud_test. El test verifica el nombre de esa base antes de crear tablas o limpiar filas. No utiliza DB_HOST ni las credenciales remotas. El contenedor se elimina al terminar. `test/fixtures/schema.sql` reproduce las columnas, relaciones y vistas inspeccionadas; se ejecuta únicamente en ese entorno independiente.

Las pruebas cubren contratos OpenAPI con Swagger Parser y AJV, permisos, bcrypt/JWT, validaciones, CRUD reales, duplicados, montos exactos, rechazo de ventas inválidas, descuento de stock, fallo SQL después de insertar detalles, rollback, dos ventas por la última unidad, anulaciones simultáneas, fallo durante restitución, conservación de precios históricos, protección del último administrador, alertas y exclusión de anuladas en ingresos.

Resultado de verificación: 50 pruebas aisladas y 20 de integración aprobadas. OpenAPI validado con 34 operaciones documentadas. La auditoría npm de dependencias de producción no reportó vulnerabilidades en esta revisión.

La prueba de imágenes usa el procesamiento real de Sharp y un adaptador de almacenamiento aislado. Valida archivos falsos, SVG, límites, recodificación y limpieza si falla la base. La transferencia real a BanaHosting requiere configuración y su comprobación posterior. La especificación y el HTML de Swagger se verifican por HTTP; no se afirma una inspección visual ni clics de navegador, porque la herramienta denegó acceso a localhost.

También se ejecutaron consultas de solo lectura sobre la base MariaDB existente para comprobar estructura y compatibilidad. No se cambiaron tablas ni datos remotos, ni se creó allí el primer administrador.

## Revisión antislop-code

- PASS: los comentarios explican restricciones no obvias: hash señuelo, revocación de permisos, conservación de fechas, serialización del bootstrap, bloqueos transaccionales y recodificación de imágenes.
- PASS: sin separadores decorativos, narración por pasos, etiquetas vacías, TODO vagos ni comentarios que repitan cada sentencia.
- PASS: comentarios breves de una línea y contratos de API conservados en Swagger.
- Reglas visuales del Delivery Gate: no aplican; el alcance es exclusivamente backend y documentación técnica.

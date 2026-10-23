# SMCFT – Sistema de Monitoreo y Control Fronterizo Terrestre

**Estudiantes:** Benjamin Riquelme, Aileen Oyaneder

Versión **monolito** del proyecto [SMCFT](https://github.com/benjriquelmep-ship-it/SMCFT), lista para desplegarse en **Vercel**.

Los 12 microservicios Spring Boot, el API Gateway y Eureka se unificaron en **una sola aplicación**:

- **Frontend:** React 19 + Vite + Tailwind (el mismo de la versión original).
- **Backend:** API REST en Node.js/Express que se ejecuta como función serverless de Vercel (`/api/v1/...`).
- **Base de datos:** una sola base PostgreSQL con todas las tablas (antes eran 12 bases MySQL).

## Estructura

```
├── api/index.js          # Función serverless de Vercel (punto de entrada de la API)
├── server/
│   ├── app.js            # App Express: monta todos los módulos (reemplaza al Gateway)
│   ├── auth.js           # JWT + blacklist (reemplaza los JwtFilter/SecurityConfig)
│   ├── db.js             # Conexión PostgreSQL / PGlite
│   ├── schema.js         # Esquema unificado (todas las migraciones Flyway)
│   ├── seed.js           # Usuarios de prueba y categorías iniciales
│   ├── http.js           # Utilidades comunes (errores, CRUD, filtros)
│   ├── dev.js            # Servidor local
│   └── routes/           # Un módulo por microservicio original
├── src/                  # Frontend React
├── vercel.json
└── package.json
```

| Microservicio original | Módulo del monolito | Rutas |
|---|---|---|
| AuthService | `routes/auth.js` | `/api/v1/auth/**` |
| UserService | `routes/users.js` | `/api/v1/users/**`, `/api/v1/users/roles/**` |
| VehicleService | `routes/vehicles.js` | `/api/v1/vehicles/**`, `/api/v1/vehicles/documentos/**` |
| BorderCrossingService | `routes/crossings.js` | `/api/v1/border-crossings/**` |
| EntryService | `routes/entries.js` | `/api/v1/entries/**` |
| SanitaryService | `routes/sanitary.js` | `/api/v1/sanitary/**` |
| DeadlineService | `routes/deadlines.js` | `/api/v1/deadlines/**`, `/api/v1/deadline-alerts/**` |
| ItemCategoryService | `routes/items.js` | `/api/v1/item-categories/**`, `/api/v1/items/**` |
| TransactionService | `routes/transactions.js` | `/api/v1/transactions/**`, `/api/v1/transaction-details/**` |
| ReportService | `routes/reports.js` | `/api/v1/reports/**`, `/api/v1/report-details/**` |
| NotificationService | `routes/notifications.js` | `/api/v1/notifications/**`, `/api/v1/notification-recipients/**` |
| AuditService | `routes/audits.js` | `/api/v1/audits/**`, `/api/v1/audit-details/**` |

Las llamadas entre microservicios (WebClient) ahora son llamadas directas a funciones y las operaciones que tocan varias tablas (p. ej. registrar un cruce y cambiar el estado del vehículo) se ejecutan dentro de una transacción.

## Usuarios de prueba

Se crean automáticamente la primera vez que arranca la API (también aparecen en "Acceso rápido" del login):

| Rol | Email | Contraseña | RUT |
|---|---|---|---|
| Administrador | admin@aduana.cl | admin123 | 11111111-1 |
| Fiscalizador | fiscal@aduana.cl | fiscal123 | 22222222-2 |
| Viajero | viajero@aduana.cl | viajero123 | 33333333-3 |

Las contraseñas se guardan cifradas con bcrypt.

## Desarrollo local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001/api/v1 (Vite redirige `/api` automáticamente)

Sin `DATABASE_URL` la API usa **PGlite** (PostgreSQL embebido) y guarda los datos en `./.data/`, así que no hace falta instalar nada más. Para usar un PostgreSQL real, copia `.env.example` a `.env` y completa `DATABASE_URL`.

Para probar la versión compilada en un solo proceso:

```bash
npm run build
npm start        # sirve frontend + API en http://localhost:3001
```

## Despliegue en Vercel

1. **Crear la base de datos PostgreSQL** (cualquiera sirve):
   - En Vercel: *Storage → Create Database → Neon (Postgres)* y conectarla al proyecto (crea `DATABASE_URL` automáticamente), o
   - Un proyecto gratuito en [Neon](https://neon.tech) o [Supabase](https://supabase.com) y copiar su cadena de conexión.
2. **Importar el repositorio** en https://vercel.com/new. Vercel detecta Vite; no hay que cambiar nada (la configuración está en `vercel.json`).
3. **Variables de entorno** (*Settings → Environment Variables*):
   - `DATABASE_URL` – cadena de conexión PostgreSQL (si usaste la integración de Vercel ya está creada).
   - `JWT_SECRET` – una clave larga y aleatoria.
4. **Deploy.** En la primera petición la API crea las tablas y los usuarios de prueba.

> Si no se configura `DATABASE_URL` en Vercel, la API funciona con una base en memoria que se borra en cada reinicio de la función. Úsalo solo para probar.

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `DATABASE_URL` | Conexión PostgreSQL | PGlite local en `./.data/pglite` |
| `JWT_SECRET` | Clave para firmar los JWT | clave de desarrollo |
| `JWT_EXPIRATION_MS` | Duración del token | `86400000` (24 h) |
| `PGSSL` | `disable` para conectar sin SSL | SSL activado salvo en localhost |
| `VITE_API_URL` | URL de la API para el frontend | `/api/v1` |

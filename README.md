# SMCFT – Sistema de Monitoreo y Control Fronterizo Terrestre

**Estudiantes:** Benjamin Riquelme, Aileen Oyaneder

Versión **monolito** del proyecto [SMCFT](https://github.com/benjriquelmep-ship-it/SMCFT), lista para desplegarse en **Vercel**.

Los 12 microservicios Spring Boot, el API Gateway y Eureka se unificaron en **una sola aplicación**:

- **Frontend:** React 19 + Vite + Tailwind (el mismo de la versión original).
- **Backend:** API REST en Node.js/Express que se ejecuta como función serverless de Vercel (`/api/v1/...`).
- **Base de datos:** una sola base **Oracle Database** (Oracle Cloud) con todas las tablas (antes eran 12 bases MySQL). Para desarrollo local también funciona con PostgreSQL o con una base embebida.

## Estructura

```
├── api/index.js          # Función serverless de Vercel (punto de entrada de la API)
├── database/oracle/
│   └── schema.sql        # Script para SQL Developer: tablas + datos iniciales
├── server/
│   ├── app.js            # App Express: monta todos los módulos (reemplaza al Gateway)
│   ├── auth.js           # JWT + blacklist (reemplaza los JwtFilter/SecurityConfig)
│   ├── db.js             # Conexión a la base (Oracle / PostgreSQL / PGlite)
│   ├── oracle.js         # Adaptador Oracle (node-oracledb, modo Thin)
│   ├── schema.js         # Esquema para PostgreSQL/PGlite (desarrollo local)
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

## Base de datos Oracle (Oracle Cloud)

La base la administra otra persona del equipo desde **SQL Developer**. Lo que necesita hacer:

1. Conectarse con el usuario/esquema que usará la aplicación.
2. Abrir `database/oracle/schema.sql` y ejecutarlo completo (**F5 – Ejecutar script**). Crea las 24 tablas, índices, los usuarios de prueba y las categorías iniciales. Funciona en Oracle 19c, 21c y 23ai (incluida Autonomous Database).
3. Entregar estos datos para configurar Vercel:
   - `ORACLE_USER` y `ORACLE_PASSWORD`: usuario y contraseña del esquema.
   - `ORACLE_CONNECT_STRING`: la cadena de conexión. En Autonomous Database está en *Database connection → Connection strings* (usar la de tipo **TLS**, p. ej. la `_low`).
4. **Acceso de red:** Vercel no tiene IP fija, así que la base debe aceptar conexiones desde Internet. En Autonomous Database: *Network → Access control list* permitiendo `0.0.0.0/0` (o "acceso seguro desde cualquier lugar"), y en lo posible **desactivar "Mutual TLS (mTLS) authentication"** para conectarse sin wallet.
   - Si se mantiene mTLS, también hacen falta `ORACLE_WALLET_PEM` (contenido del archivo `ewallet.pem` del wallet) y `ORACLE_WALLET_PASSWORD`.

Reglas para no romper la aplicación: no renombrar tablas ni columnas; las columnas booleanas son `NUMBER(1)` (1 = sí, 0 = no).

## Usuarios de prueba

Los crea el script de Oracle (y la API los crea automáticamente en PostgreSQL/PGlite). También aparecen en "Acceso rápido" del login:

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

Sin configuración la API usa **PGlite** (PostgreSQL embebido) y guarda los datos en `./.data/`, así que no hace falta instalar nada más. Para conectarte a la base Oracle real, copia `.env.example` a `.env` y completa las variables `ORACLE_*`.

Para probar la versión compilada en un solo proceso:

```bash
npm run build
npm start        # sirve frontend + API en http://localhost:3001
```

## Despliegue en Vercel

1. **Importar el repositorio** en https://vercel.com/new (rama `main`). Vercel detecta Vite; la configuración está en `vercel.json`.
2. **Variables de entorno** (*Settings → Environment Variables*):
   - `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING` – los entrega quien administra la base Oracle.
   - `ORACLE_WALLET_PEM`, `ORACLE_WALLET_PASSWORD` – solo si la base exige mTLS.
   - `JWT_SECRET` – una clave larga y aleatoria.
3. **Deploy.** Para comprobar la conexión abre `https://<tu-app>.vercel.app/api/v1/health` y luego inicia sesión con `admin@aduana.cl` / `admin123`. Si la base no responde o faltan las tablas, el error lo indica.

> Si no se configura ninguna base en Vercel, la API funciona con una base en memoria que se borra en cada reinicio de la función. Úsalo solo para probar.

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `ORACLE_USER` / `ORACLE_PASSWORD` | Credenciales del esquema Oracle | – |
| `ORACLE_CONNECT_STRING` | Cadena de conexión Oracle (activa el modo Oracle) | – |
| `ORACLE_WALLET_PEM` / `ORACLE_WALLET_PASSWORD` | Wallet, solo si la base exige mTLS | – |
| `DATABASE_URL` | Conexión PostgreSQL (alternativa) | PGlite local en `./.data/pglite` |
| `JWT_SECRET` | Clave para firmar los JWT | clave de desarrollo |
| `JWT_EXPIRATION_MS` | Duración del token | `86400000` (24 h) |
| `PGSSL` | `disable` para conectar sin SSL | SSL activado salvo en localhost |
| `VITE_API_URL` | URL de la API para el frontend | `/api/v1` |

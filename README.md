# SMCFT – Sistema de Monitoreo y Control Fronterizo Terrestre

**Equipo:** Jael Reyes, Benjamin Riquelme Pozo, Aileen Oyaneder

Página web del proyecto SMCFT como **monolito** listo para **Vercel**, conectado a la base
**Oracle Database en Oracle Cloud (esquema `SMCFT`)** descrita en el *Informe EP2 – Taller de Base de Datos*.

- **Frontend:** React 19 + Vite + Tailwind (diseño del proyecto [SMCFT original](https://github.com/benjriquelmep-ship-it/SMCFT)).
- **Backend:** API REST en Node.js/Express que corre como una función serverless de Vercel (`/api/v1/...`).
  Reemplaza a los 12 microservicios Spring Boot, el API Gateway y Eureka.
- **Base de datos:** el esquema `SMCFT` del informe (27 tablas) y sus objetos PL/SQL. La página **usa** el package
  `PKG_GESTION_FRONTERA`, los procedimientos, las funciones y los triggers en lugar de repetir esa lógica.

  - **Aplicación Web:** [https://nuevo-smcft-drab.vercel.app](https://nuevo-smcft-drab.vercel.app)
- **Diagnóstico (Health Check):** [https://nuevo-smcft-drab.vercel.app/api/v1/health](https://nuevo-smcft-drab.vercel.app/api/v1/health)

## Funcionalidades por rol

| Módulo | Tablas / objetos PL/SQL | Roles |
|---|---|---|
| Dashboard | indicadores, `FN_TOTAL_PLAZOS_VENCIDOS` | todos |
| Cruces fronterizos | `CRUCE_FRONTERIZO`, `DETALLE_CRUCE_PERSONA`, `CRUCE_DOCUMENTO`, `CONTROL`, `sp_registrar_cruce`, `FN_VALOR_DECLARADO` | todos (viajero: solo los suyos) |
| Personas | `PERSONA` | Admin, Fiscalizador |
| Vehículos | `VEHICULO` | Admin, Fiscalizador, Viajero (los suyos) |
| Documentos | `DOCUMENTO` + triggers de auditoría | Admin, Fiscalizador |
| Autorización de menores | `AUTORIZACION_MENOR` | Admin, Fiscalizador |
| Declaraciones | `DECLARACION`, `ITEM_DECLARADO`, `CATEGORIA_ITEM` | Admin, Fiscalizador, Inspector SAG |
| Inspección SAG | `INSPECCION_SANITARIA`, `INSPECCION_ITEM` | Admin, Inspector SAG |
| Plazos de admisión | `PLAZO_ADMISION`, `ALERTA_PLAZO`, `TRG_CRUCE_PLAZO_AI`, `SP_ACTUALIZAR_PLAZOS` | Admin, Fiscalizador, Auditor, Viajero (los suyos) |
| Notificaciones | `NOTIFICACION`, `NOTIFICACION_DESTINATARIO` | Admin, Fiscalizador, Inspector SAG (+ campana para todos) |
| Reportes | `REPORTE`, `REPORTE_DETALLE`, `SP_REPORTE_CRUCES` | Admin, Auditor |
| Auditoría | `AUDITORIA`, `AUDITORIA_DETALLE` | Admin, Auditor |
| Usuarios, pasos, categorías | `USUARIO`, `USUARIO_ROL`, `ROL`, `FUNCIONARIO`, `PASO_FRONTERIZO`, `CATEGORIA_ITEM` | Admin |
| Triggers | `ALL_TRIGGERS`, `ALL_SOURCE`, `ALL_ERRORS`: ver, editar y compilar el código PL/SQL de los triggers (el cambio queda en Oracle) | Admin |

Los permisos se validan en la API (no solo en el menú). Cada inicio de sesión queda en `LOGIN_ATTEMPT`.

## Estructura

```
├── api/index.js           # Función serverless de Vercel
├── database/oracle/       # Scripts del informe + 04_credenciales_web.sql (ver su README)
├── server/
│   ├── app.js             # App Express: monta todos los módulos
│   ├── auth.js            # Sesiones con JWT
│   ├── db.js              # Conexión Oracle (node-oracledb, modo Thin: sin Instant Client)
│   ├── http.js, lookup.js # Utilidades, permisos y traducción de errores ORA-
│   ├── dev.js             # Servidor local
│   └── routes/            # Un módulo por área (cruces, plazos, reportes...)
├── src/                   # Frontend React
└── vercel.json
```

## Pasos para dejarla funcionando

### 1. Base de datos (compañero, en SQL Developer)

Ver [`database/oracle/README.md`](database/oracle/README.md). En resumen:

1. Si el esquema SMCFT ya está cargado (tablas, package, triggers y `03_datos_prueba.sql`), **ejecutar solo
   `database/oracle/04_credenciales_web.sql`**: asigna contraseña a un usuario de cada rol (la carga de datos
   los deja sin credencial).
2. Permitir el acceso desde Internet a la Autonomous Database (lista de acceso `0.0.0.0/0`) y, si se puede,
   desactivar *mTLS* para conectarse sin wallet.
3. Entregar: usuario (`SMCFT`), contraseña y la *connection string* TLS del servicio `_low`.

### 2. Vercel

1. Importar el repositorio en https://vercel.com/new (rama `main`). La configuración está en `vercel.json`.
2. En *Settings → Environment Variables* agregar:
   - `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING`
   - `JWT_SECRET` (una clave larga y aleatoria)
   - `ORACLE_WALLET_PEM` y `ORACLE_WALLET_PASSWORD` solo si la base exige mTLS
3. Desplegar y abrir `https://<tu-app>.vercel.app/api/v1/health`: debe responder `"status":"UP"` y
   `"objetosInvalidos":0`. Si la conexión falla, ahí aparece el error de Oracle.

### Usuarios para entrar

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | camila.soto@example.com | admin123 |
| Fiscalizador | diego.munoz@example.com | fiscal123 |
| Inspector SAG | valentina.gonzalez@example.com | sag123 |
| Auditor | matias.rojas@example.com | auditor123 |
| Viajero | isidora.perez@example.com | viajero123 |

También están en los botones de "Acceso rápido" del login.

## Desarrollo local

Requisitos: Node.js 20+ y acceso a una base Oracle con el esquema SMCFT.

```bash
cp .env.example .env     # completar ORACLE_*
npm install
npm run dev              # frontend en http://localhost:5173, API en http://localhost:3001/api/v1
```

Versión compilada en un solo proceso: `npm run build && npm start`.

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `ORACLE_USER` / `ORACLE_PASSWORD` | Credenciales de conexión | – |
| `ORACLE_CONNECT_STRING` | Cadena de conexión (TLS, servicio `_low`) | – |
| `ORACLE_SCHEMA` | Esquema con las tablas | `SMCFT` |
| `ORACLE_WALLET_PEM` / `ORACLE_WALLET_PASSWORD` | Wallet, solo con mTLS | – |
| `JWT_SECRET` | Clave para firmar las sesiones | clave de desarrollo |
| `JWT_EXPIRATION_MS` | Duración de la sesión | `86400000` (24 h) |
| `VITE_API_URL` | URL de la API para el frontend | `/api/v1` |

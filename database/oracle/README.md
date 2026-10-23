# Base de datos Oracle – esquema SMCFT

Scripts del **Informe EP2 (Taller de Base de Datos)**, reconstruidos desde los anexos de código del informe
y verificados en Oracle Database 23ai: todos compilan, la carga de datos termina con `OK` y las 7 pruebas pasan.

## Orden de ejecución (SQL Developer, conectado como `SMCFT`)

| # | Script | Contenido |
|---|---|---|
| 1 | `01_tablas.sql` | 27 tablas y sus claves foráneas |
| 2 | `02_secuencias.sql` | Secuencias |
| 3 | `package/01_spec.sql`, `package/02_body.sql` | `PKG_GESTION_FRONTERA` |
| 4 | `procedimientos/*.sql` | `SP_REPORTE_CRUCES`, `SP_ACTUALIZAR_PLAZOS` |
| 5 | `funciones/*.sql` | `FN_VALOR_DECLARADO`, `FN_TOTAL_PLAZOS_VENCIDOS` |
| 6 | `triggers/*.sql` | `TRG_CRUCE_PLAZO_AI`, `TRG_DOCUMENTO_AUDIT`, `TRG_DOCUMENTO_SENTENCIA` |
| 7 | `03_datos_prueba.sql` | Datos de prueba |
| 8 | **`04_credenciales_web.sql`** | **Nuevo:** contraseñas para entrar a la página web |
| 9 | `08_verificar_compilacion.sql`, `pruebas/*.sql` | Verificación y pruebas del informe |

> Si la base en Oracle Cloud ya tiene los pasos 1 a 7 (como indica el informe), **solo hay que ejecutar
> `04_credenciales_web.sql`**. Ese script no cambia tablas, package ni triggers: solo asigna contraseña a
> cinco usuarios de prueba, porque la carga de datos los deja con `PASSWORD_HASH = 'SIN_CREDENCIAL_DE_ACCESO'`.

## Usuarios para entrar a la web

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | camila.soto@example.com | admin123 |
| Fiscalizador | diego.munoz@example.com | fiscal123 |
| Inspector SAG | valentina.gonzalez@example.com | sag123 |
| Auditor | matias.rojas@example.com | auditor123 |
| Viajero | isidora.perez@example.com | viajero123 |

Desde la página (Administrador → Usuarios) se pueden crear más usuarios o cambiar contraseñas.

## Qué objetos PL/SQL usa la página

| Objeto | Dónde se usa en la web |
|---|---|
| `PKG_GESTION_FRONTERA.sp_registrar_cruce` | Cruces fronterizos → *Registrar cruce* (valida vehículo, viajeros y menores) |
| `TRG_CRUCE_PLAZO_AI` | Se dispara al registrar una SALIDA con vehículo → aparece en *Plazos de admisión* |
| `SP_REPORTE_CRUCES` | Reportes → *Generar reporte* |
| `FN_VALOR_DECLARADO` | Columna *Declarado* de la lista de cruces |
| `SP_ACTUALIZAR_PLAZOS` | Plazos de admisión → *Actualizar vencidos* |
| `FN_TOTAL_PLAZOS_VENCIDOS` | Dashboard y Plazos (indicador de vencidos) |
| `TRG_DOCUMENTO_AUDIT` / `TRG_DOCUMENTO_SENTENCIA` | Al crear/editar/eliminar en *Documentos* → aparece en *Auditoría* |

Los errores de negocio del package (por ejemplo `-20002` menor sin autorización, `-20004` vehículo
inexistente o `-20020` rango de fechas inválido) se muestran tal cual en la página.

## Acceso desde Vercel

Vercel no tiene IP fija, por lo que la Autonomous Database debe aceptar conexiones desde Internet:

1. En la consola de Oracle Cloud → la base `SMCFTDB` → **Network → Access control list**: permitir `0.0.0.0/0`
   (o "Secure access from everywhere").
2. En lo posible desactivar **Mutual TLS (mTLS) authentication** (queda "TLS"), para conectarse sin wallet.
3. En **Database connection** copiar la *connection string* TLS del servicio **`_low`**.

Si se mantiene mTLS, en Vercel también hay que configurar `ORACLE_WALLET_PEM` (contenido de `ewallet.pem`
del wallet descargado) y `ORACLE_WALLET_PASSWORD`.

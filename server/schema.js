// Esquema unificado del monolito SMCFT (PostgreSQL).
// Reúne en una sola base las 12 bases de datos que antes tenía cada microservicio.
// Todas las fechas se guardan como hora local de Chile (TIMESTAMP sin zona),
// igual que los LocalDateTime de la versión Spring Boot.

const NOW = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')"

export const schemaSql = `
-- ===================== USUARIOS =====================
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    rut        VARCHAR(12)  NOT NULL UNIQUE,
    nombre     VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    rol        VARCHAR(50)  NOT NULL,
    activo     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS user_roles (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rol         VARCHAR(50) NOT NULL,
    asignado_at TIMESTAMP   DEFAULT ${NOW},
    activo      BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ===================== AUTENTICACIÓN =====================
CREATE TABLE IF NOT EXISTS token_blacklist (
    id            SERIAL PRIMARY KEY,
    token         TEXT         NOT NULL,
    email         VARCHAR(150) NOT NULL,
    invalidado_at TIMESTAMP    DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id                 SERIAL PRIMARY KEY,
    email              VARCHAR(150) NOT NULL,
    exitoso            BOOLEAN      NOT NULL,
    ip_address         VARCHAR(45),
    intento_at         TIMESTAMP    DEFAULT ${NOW},
    token_blacklist_id INTEGER      NULL REFERENCES token_blacklist(id) ON DELETE SET NULL
);

-- ===================== VEHÍCULOS =====================
CREATE TABLE IF NOT EXISTS vehicles (
    id              SERIAL PRIMARY KEY,
    patente         VARCHAR(10)  NOT NULL UNIQUE,
    marca           VARCHAR(50)  NOT NULL,
    modelo          VARCHAR(50)  NOT NULL,
    anio            INTEGER      NOT NULL,
    tipo_vehiculo   VARCHAR(30)  NOT NULL,
    rut_propietario VARCHAR(12)  NOT NULL,
    estado          VARCHAR(30)  NOT NULL DEFAULT 'EN_TERRITORIO_NACIONAL',
    created_at      TIMESTAMP    DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS vehicle_documents (
    id                SERIAL PRIMARY KEY,
    vehicle_id        INTEGER     NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    tipo              VARCHAR(50) NOT NULL,
    numero            VARCHAR(50) NOT NULL UNIQUE,
    fecha_vencimiento DATE        NOT NULL,
    vigente           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP   DEFAULT ${NOW}
);

-- ===================== CATEGORÍAS DE ÍTEMS =====================
CREATE TABLE IF NOT EXISTS item_categories (
    id                   SERIAL PRIMARY KEY,
    nombre               VARCHAR(100)  NOT NULL UNIQUE,
    descripcion          VARCHAR(500)  NOT NULL,
    requiere_declaracion BOOLEAN       NOT NULL DEFAULT FALSE,
    limite_valor_usd     NUMERIC(10,2) NULL,
    activo               BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP     DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS items (
    id           SERIAL PRIMARY KEY,
    categoria_id INTEGER      NOT NULL REFERENCES item_categories(id) ON DELETE CASCADE,
    nombre       VARCHAR(100) NOT NULL,
    descripcion  VARCHAR(300) NOT NULL,
    unidad       VARCHAR(30)  NOT NULL DEFAULT 'unidad',
    activo       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    DEFAULT ${NOW}
);

-- ===================== INGRESOS =====================
CREATE TABLE IF NOT EXISTS entries (
    id               SERIAL PRIMARY KEY,
    patente          VARCHAR(10)  NOT NULL,
    rut_conductor    VARCHAR(12)  NOT NULL,
    pais_origen      VARCHAR(100) NOT NULL,
    paso_fronterizo  VARCHAR(100) NOT NULL,
    fecha_ingreso    TIMESTAMP    NOT NULL,
    tipo_ingreso     VARCHAR(30)  NOT NULL,
    estado           VARCHAR(30)  NOT NULL DEFAULT 'PENDIENTE',
    rut_fiscalizador VARCHAR(12)  NULL,
    observaciones    VARCHAR(500) NULL,
    created_at       TIMESTAMP    DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS entry_items (
    id          SERIAL PRIMARY KEY,
    entry_id    INTEGER       NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    descripcion VARCHAR(200)  NOT NULL,
    cantidad    INTEGER       NOT NULL DEFAULT 1,
    valor_usd   NUMERIC(10,2) NOT NULL DEFAULT 0,
    aprobado    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP     DEFAULT ${NOW}
);

-- ===================== CRUCES FRONTERIZOS =====================
CREATE TABLE IF NOT EXISTS border_crossings (
    id               SERIAL PRIMARY KEY,
    patente          VARCHAR(10)  NOT NULL,
    rut_conductor    VARCHAR(12)  NOT NULL,
    pais_destino     VARCHAR(100) NOT NULL,
    paso_fronterizo  VARCHAR(100) NOT NULL,
    fecha_cruce      TIMESTAMP    NOT NULL,
    estado           VARCHAR(30)  NOT NULL DEFAULT 'PENDIENTE',
    rut_fiscalizador VARCHAR(12)  NULL,
    observaciones    VARCHAR(500) NULL,
    created_at       TIMESTAMP    DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS border_crossing_items (
    id                 SERIAL PRIMARY KEY,
    border_crossing_id INTEGER       NOT NULL REFERENCES border_crossings(id) ON DELETE CASCADE,
    categoria_id       INTEGER       NOT NULL,
    descripcion        VARCHAR(200)  NOT NULL,
    cantidad           INTEGER       NOT NULL DEFAULT 1,
    valor_usd          NUMERIC(10,2) NOT NULL DEFAULT 0,
    aprobado           BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP     DEFAULT ${NOW}
);

-- ===================== SANIDAD (SAG) =====================
CREATE TABLE IF NOT EXISTS sanitary_inspections (
    id               SERIAL PRIMARY KEY,
    patente          VARCHAR(10)  NOT NULL,
    rut_conductor    VARCHAR(12)  NOT NULL,
    rut_inspector    VARCHAR(12)  NOT NULL,
    paso_fronterizo  VARCHAR(100) NOT NULL,
    fecha_inspeccion TIMESTAMP    NOT NULL,
    resultado        VARCHAR(30)  NOT NULL DEFAULT 'PENDIENTE',
    observaciones    VARCHAR(500) NULL,
    created_at       TIMESTAMP    DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS sanitary_items (
    id             SERIAL PRIMARY KEY,
    inspection_id  INTEGER      NOT NULL REFERENCES sanitary_inspections(id) ON DELETE CASCADE,
    descripcion    VARCHAR(200) NOT NULL,
    resultado_item VARCHAR(30)  NOT NULL DEFAULT 'PENDIENTE',
    observaciones  VARCHAR(300) NULL,
    created_at     TIMESTAMP    DEFAULT ${NOW}
);

-- ===================== PLAZOS (DEADLINES) =====================
CREATE TABLE IF NOT EXISTS deadlines (
    id            SERIAL PRIMARY KEY,
    patente       VARCHAR(10)  NOT NULL,
    rut_conductor VARCHAR(12)  NOT NULL,
    entry_id      INTEGER      NOT NULL,
    fecha_ingreso TIMESTAMP    NOT NULL,
    fecha_limite  TIMESTAMP    NOT NULL,
    tipo          VARCHAR(50)  NOT NULL,
    estado        VARCHAR(30)  NOT NULL DEFAULT 'ACTIVO',
    observaciones VARCHAR(500) NULL,
    created_at    TIMESTAMP    DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS deadline_alerts (
    id             SERIAL PRIMARY KEY,
    deadline_id    INTEGER      NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
    mensaje        VARCHAR(500) NOT NULL,
    dias_restantes INTEGER      NOT NULL,
    tipo_alerta    VARCHAR(30)  NOT NULL,
    enviada        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP    DEFAULT ${NOW}
);

-- ===================== TRANSACCIONES =====================
CREATE TABLE IF NOT EXISTS transactions (
    id            SERIAL PRIMARY KEY,
    rut_usuario   VARCHAR(12)   NOT NULL,
    tipo          VARCHAR(50)   NOT NULL,
    monto_total   NUMERIC(12,2) NOT NULL,
    estado        VARCHAR(30)   NOT NULL DEFAULT 'PENDIENTE',
    descripcion   VARCHAR(500)  NOT NULL,
    referencia    VARCHAR(100)  NULL,
    created_at    TIMESTAMP     DEFAULT ${NOW},
    completada_at TIMESTAMP     NULL
);

CREATE TABLE IF NOT EXISTS transaction_details (
    id             SERIAL PRIMARY KEY,
    transaction_id INTEGER       NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    concepto       VARCHAR(200)  NOT NULL,
    monto          NUMERIC(12,2) NOT NULL,
    cantidad       INTEGER       NOT NULL DEFAULT 1,
    tipo_detalle   VARCHAR(30)   NOT NULL DEFAULT 'COBRO',
    created_at     TIMESTAMP     DEFAULT ${NOW}
);

-- ===================== REPORTES =====================
CREATE TABLE IF NOT EXISTS reports (
    id            SERIAL PRIMARY KEY,
    titulo        VARCHAR(200) NOT NULL,
    tipo_reporte  VARCHAR(50)  NOT NULL,
    fecha_inicio  TIMESTAMP    NOT NULL,
    fecha_fin     TIMESTAMP    NOT NULL,
    generado_por  VARCHAR(12)  NOT NULL,
    estado        VARCHAR(30)  NOT NULL DEFAULT 'GENERANDO',
    observaciones VARCHAR(500) NULL,
    created_at    TIMESTAMP    DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS report_details (
    id          SERIAL PRIMARY KEY,
    report_id   INTEGER       NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    descripcion VARCHAR(300)  NOT NULL,
    valor       NUMERIC(10,2) NOT NULL DEFAULT 0,
    unidad      VARCHAR(50)   NOT NULL DEFAULT 'unidad',
    categoria   VARCHAR(100)  NOT NULL,
    created_at  TIMESTAMP     DEFAULT ${NOW}
);

-- ===================== NOTIFICACIONES =====================
CREATE TABLE IF NOT EXISTS notifications (
    id                SERIAL PRIMARY KEY,
    titulo            VARCHAR(200) NOT NULL,
    mensaje           VARCHAR(500) NOT NULL,
    tipo              VARCHAR(50)  NOT NULL,
    deadline_alert_id INTEGER      NULL,
    estado            VARCHAR(30)  NOT NULL DEFAULT 'PENDIENTE',
    created_at        TIMESTAMP    DEFAULT ${NOW},
    enviada_at        TIMESTAMP    NULL
);

CREATE TABLE IF NOT EXISTS notification_recipients (
    id               SERIAL PRIMARY KEY,
    notification_id  INTEGER      NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    rut_destinatario VARCHAR(12)  NOT NULL,
    email            VARCHAR(150) NOT NULL,
    nombre           VARCHAR(100) NOT NULL,
    leida            BOOLEAN      NOT NULL DEFAULT FALSE,
    leida_at         TIMESTAMP    NULL,
    created_at       TIMESTAMP    DEFAULT ${NOW}
);

-- ===================== AUDITORÍA =====================
CREATE TABLE IF NOT EXISTS audits (
    id             SERIAL PRIMARY KEY,
    rut_auditor    VARCHAR(12)  NOT NULL,
    tipo_auditoria VARCHAR(50)  NOT NULL,
    entidad        VARCHAR(100) NOT NULL,
    entidad_id     INTEGER      NULL,
    descripcion    VARCHAR(500) NOT NULL,
    estado         VARCHAR(30)  NOT NULL DEFAULT 'EN_PROCESO',
    fecha_inicio   TIMESTAMP    NOT NULL,
    fecha_cierre   TIMESTAMP    NULL,
    created_at     TIMESTAMP    DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS audit_details (
    id           SERIAL PRIMARY KEY,
    audit_id     INTEGER      NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    accion       VARCHAR(100) NOT NULL,
    descripcion  VARCHAR(500) NOT NULL,
    rut_usuario  VARCHAR(12)  NOT NULL,
    resultado    VARCHAR(30)  NOT NULL DEFAULT 'EXITOSO',
    ip_address   VARCHAR(45)  NULL,
    fecha_accion TIMESTAMP    NOT NULL,
    created_at   TIMESTAMP    DEFAULT ${NOW}
);
`

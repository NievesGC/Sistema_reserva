-- =============================================================================
-- Migración inicial: Sistema de Reservas de Guardería Canina
-- Versión: 001
-- Descripción: Crea las tablas base del sistema con sus índices de rendimiento.
--
-- Tablas:
--   reservas        - Reservas de clientes con todos sus datos
--   disponibilidad  - Control de plazas y bloqueos por servicio y fecha
--   configuracion   - Parámetros de configuración del negocio (precios, plazas)
--   festivos        - Días festivos con tarifa especial
--
-- Índices de rendimiento (Requisito 13):
--   idx_disponibilidad_servicio_fecha  - Consultas de disponibilidad mensual
--   idx_reservas_estado_fecha          - Filtrado de reservas por estado y fecha
-- =============================================================================

-- Extensión para generación de UUIDs (disponible en Supabase por defecto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Tabla: reservas
-- Almacena todas las reservas realizadas por los clientes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS reservas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tipo de servicio contratado
    servicio        TEXT NOT NULL
                    CHECK (servicio IN ('paseos', 'guarderia', 'alojamiento')),

    -- Rango de fechas de la reserva
    fecha_desde     DATE NOT NULL,
    fecha_hasta     DATE NOT NULL,

    -- Configuración de la reserva
    tarifa          TEXT NOT NULL
                    CHECK (tarifa IN ('normal', 'cachorros')),
    tramo_horario   TEXT NOT NULL,
    perro_extra     BOOLEAN NOT NULL DEFAULT FALSE,
    transporte      TEXT
                    CHECK (transporte IN ('sin-transporte', 'recogida', 'recogida-entrega')),

    -- Estado del ciclo de vida de la reserva
    estado          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'confirmada', 'rechazada', 'cancelada')),

    -- Precio calculado en el momento de la reserva
    precio_total    NUMERIC(8, 2) NOT NULL CHECK (precio_total >= 0),

    -- Datos del cliente (PII — acceso restringido por RLS)
    nombre_dueno    TEXT NOT NULL,
    telefono        TEXT NOT NULL,
    email           TEXT NOT NULL,
    direccion       TEXT,                   -- Obligatoria si transporte incluye recogida

    -- Datos de la mascota
    nombre_perro    TEXT NOT NULL,
    raza            TEXT,
    tamano          TEXT
                    CHECK (tamano IN ('cachorro', 'pequeño', 'mediano', 'grande')),
    notas           TEXT,

    -- Consentimiento de privacidad (Requisito 5.3 y 12.2)
    acepta_privacidad BOOLEAN NOT NULL DEFAULT FALSE,

    -- Auditoría
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Restricción: fecha_hasta >= fecha_desde
    CONSTRAINT chk_fechas_coherentes CHECK (fecha_hasta >= fecha_desde)
);

-- =============================================================================
-- Tabla: disponibilidad
-- Controla las plazas ocupadas y los bloqueos manuales por servicio y fecha.
-- Una fila por (servicio, fecha). Se crea bajo demanda al hacer reservas.
-- =============================================================================

CREATE TABLE IF NOT EXISTS disponibilidad (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    servicio        TEXT NOT NULL
                    CHECK (servicio IN ('paseos', 'guarderia', 'alojamiento')),
    fecha           DATE NOT NULL,

    -- Número de reservas activas (pendientes + confirmadas) en este día
    plazas_ocupadas INTEGER NOT NULL DEFAULT 0 CHECK (plazas_ocupadas >= 0),

    -- Bloqueo manual por el empresario (impide nuevas reservas)
    bloqueado       BOOLEAN NOT NULL DEFAULT FALSE,

    -- Una sola fila por combinación servicio+fecha
    UNIQUE (servicio, fecha)
);

-- =============================================================================
-- Tabla: configuracion
-- Almacena parámetros de configuración del negocio como pares clave-valor.
--
-- Claves esperadas (ejemplos):
--   paseos_precio_normal       → "15.00"
--   paseos_precio_cachorros    → "12.00"
--   paseos_precio_festivo      → "18.00"
--   paseos_precio_perro_extra  → "8.00"
--   paseos_plazas_max          → "5"
--   guarderia_precio_normal    → "20.00"
--   ... (mismo patrón para guarderia y alojamiento)
--   alojamiento_precio_recogida         → "12.00"
--   alojamiento_precio_recogida_entrega → "20.00"
-- =============================================================================

CREATE TABLE IF NOT EXISTS configuracion (
    clave   TEXT PRIMARY KEY,
    valor   TEXT NOT NULL
);

-- Valores por defecto de configuración
INSERT INTO configuracion (clave, valor) VALUES
    -- Paseos
    ('paseos_precio_normal',              '15.00'),
    ('paseos_precio_cachorros',           '12.00'),
    ('paseos_precio_festivo',             '18.00'),
    ('paseos_precio_perro_extra',          '8.00'),
    ('paseos_plazas_max',                     '5'),
    -- Guardería
    ('guarderia_precio_normal',           '20.00'),
    ('guarderia_precio_cachorros',        '16.00'),
    ('guarderia_precio_festivo',          '24.00'),
    ('guarderia_precio_perro_extra',      '10.00'),
    ('guarderia_plazas_max',                  '8'),
    -- Alojamiento
    ('alojamiento_precio_normal',         '35.00'),
    ('alojamiento_precio_cachorros',      '28.00'),
    ('alojamiento_precio_festivo',        '42.00'),
    ('alojamiento_precio_perro_extra',    '18.00'),
    ('alojamiento_plazas_max',                '4'),
    ('alojamiento_precio_recogida',       '12.00'),
    ('alojamiento_precio_recogida_entrega','20.00')
ON CONFLICT (clave) DO NOTHING;

-- =============================================================================
-- Tabla: festivos
-- Días festivos con tarifa especial gestionados por el empresario.
-- =============================================================================

CREATE TABLE IF NOT EXISTS festivos (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha   DATE NOT NULL UNIQUE,
    nombre  TEXT NOT NULL,
    activo  BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Índices de rendimiento (Requisito 13)
-- =============================================================================

-- Consultas de disponibilidad mensual: GET /api/disponibilidad/:servicio/:mes
CREATE INDEX IF NOT EXISTS idx_disponibilidad_servicio_fecha
    ON disponibilidad (servicio, fecha);

-- Filtrado de reservas por estado y fecha en el panel admin
CREATE INDEX IF NOT EXISTS idx_reservas_estado_fecha
    ON reservas (estado, fecha_desde);

-- Búsqueda de reservas por email del cliente (uso interno)
CREATE INDEX IF NOT EXISTS idx_reservas_email
    ON reservas (email);

-- =============================================================================
-- Trigger: actualiza updated_at automáticamente en reservas
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reservas_updated_at
    BEFORE UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

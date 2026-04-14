"""
Entidades de dominio para el módulo de reservas.

Define los enums de estado y tipo, los dataclasses de datos del cliente,
mascota y reserva, y las funciones puras de validación de dominio.

El dominio no importa nada de aplicación ni infraestructura (Clean Architecture).

Requisitos: 2.3, 2.4, 2.5, 2.7, 5.1-5.4, 3.6
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum

from shared.domain.result import (
    DomainError,
    campos_obligatorios,
    direccion_requerida,
    fecha_invalida,
    fecha_pasada,
    privacidad_no_aceptada,
)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class EstadoReserva(str, Enum):
    """Estados posibles del ciclo de vida de una reserva."""
    PENDIENTE = "pendiente"
    CONFIRMADA = "confirmada"
    RECHAZADA = "rechazada"
    CANCELADA = "cancelada"


class TipoServicio(str, Enum):
    """Tipos de servicio ofrecidos por la guardería."""
    PASEOS = "paseos"
    GUARDERIA = "guarderia"
    ALOJAMIENTO = "alojamiento"


class TipoTarifa(str, Enum):
    """Tarifas aplicables a una reserva."""
    NORMAL = "normal"
    CACHORROS = "cachorros"


class TipoTransporte(str, Enum):
    """Opciones de transporte para el servicio de Alojamiento."""
    SIN_TRANSPORTE = "sin-transporte"
    RECOGIDA = "recogida"
    RECOGIDA_ENTREGA = "recogida-entrega"


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class DatosCliente:
    """
    Datos personales del cliente que realiza la reserva.

    Attributes:
        nombre: Nombre completo del propietario (obligatorio).
        telefono: Teléfono de contacto (obligatorio).
        email: Correo electrónico (obligatorio).
        direccion: Dirección de recogida (obligatoria si hay transporte con recogida).
    """
    nombre: str
    telefono: str
    email: str
    direccion: str | None = None


@dataclass
class DatosMascota:
    """
    Datos de la mascota incluida en la reserva.

    Attributes:
        nombre: Nombre del perro (obligatorio).
        tamano: Tamaño del perro: 'cachorro' | 'pequeño' | 'mediano' | 'grande'.
        raza: Raza del perro (opcional).
        notas: Notas adicionales sobre la mascota (opcional).
    """
    nombre: str
    tamano: str  # 'cachorro' | 'pequeño' | 'mediano' | 'grande'
    raza: str | None = None
    notas: str | None = None


@dataclass
class Reserva:
    """
    Entidad principal del dominio de reservas.

    Representa una reserva completa con todos sus datos: servicio, fechas,
    tarifa, datos del cliente y mascota, estado y precio calculado.
    """
    id: str
    servicio: TipoServicio
    fecha_desde: date
    fecha_hasta: date
    tarifa: TipoTarifa
    tramo_horario: str
    perro_extra: bool
    estado: EstadoReserva
    precio_total: float
    cliente: DatosCliente
    mascota: DatosMascota
    acepta_privacidad: bool
    transporte: str | None = None
    creada_en: datetime = field(default_factory=datetime.utcnow)
    actualizada_en: datetime = field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Funciones de validación de dominio (puras, sin efectos secundarios)
# ---------------------------------------------------------------------------

def validar_fechas(
    servicio: str,
    fecha_desde: date,
    fecha_hasta: date,
) -> DomainError | None:
    """
    Valida el rango de fechas según el tipo de servicio.

    - Alojamiento: fecha_desde debe ser estrictamente anterior a fecha_hasta
      (se necesita al menos 1 noche).
    - Paseos / Guardería: fecha_desde puede ser igual a fecha_hasta
      (reserva de un solo día permitida).

    Args:
        servicio: Tipo de servicio ('paseos' | 'guarderia' | 'alojamiento').
        fecha_desde: Fecha de inicio.
        fecha_hasta: Fecha de fin.

    Returns:
        DomainError si la validación falla, None si es válido.
    """
    if servicio == TipoServicio.ALOJAMIENTO.value or servicio == TipoServicio.ALOJAMIENTO:
        # Alojamiento: fecha_desde < fecha_hasta (al menos 1 noche)
        if fecha_desde >= fecha_hasta:
            return fecha_invalida(
                "Para Alojamiento, la fecha de entrada debe ser anterior a la fecha de salida"
            )
    else:
        # Paseos / Guardería: fecha_desde <= fecha_hasta
        if fecha_desde > fecha_hasta:
            return fecha_invalida(
                "La fecha de inicio no puede ser posterior a la fecha de fin"
            )
    return None


def validar_campos_obligatorios(
    cliente: DatosCliente,
    mascota: DatosMascota,
    acepta_privacidad: bool,
) -> DomainError | None:
    """
    Verifica que todos los campos obligatorios estén presentes y no vacíos.

    Campos obligatorios: nombre del cliente, teléfono, email, nombre del perro
    y aceptación de la política de privacidad.

    Args:
        cliente: Datos del cliente.
        mascota: Datos de la mascota.
        acepta_privacidad: True si el cliente aceptó la política de privacidad.

    Returns:
        DomainError si falta algún campo, None si todo es válido.
    """
    if not cliente.nombre or not cliente.nombre.strip():
        return campos_obligatorios("nombre")
    if not cliente.telefono or not cliente.telefono.strip():
        return campos_obligatorios("telefono")
    if not cliente.email or not cliente.email.strip():
        return campos_obligatorios("email")
    if not mascota.nombre or not mascota.nombre.strip():
        return campos_obligatorios("nombre_perro")
    if not acepta_privacidad:
        return privacidad_no_aceptada()
    return None


def validar_direccion_recogida(
    servicio: str,
    transporte: str | None,
    direccion: str | None,
) -> DomainError | None:
    """
    Valida que se proporcione dirección cuando el transporte incluye recogida.

    Solo aplica al servicio de Alojamiento. Si el transporte es 'recogida'
    o 'recogida-entrega', la dirección es obligatoria.

    Args:
        servicio: Tipo de servicio.
        transporte: Opción de transporte seleccionada.
        direccion: Dirección de recogida proporcionada.

    Returns:
        DomainError si falta la dirección, None si es válido.
    """
    _servicios_alojamiento = {TipoServicio.ALOJAMIENTO.value, TipoServicio.ALOJAMIENTO}
    _transportes_con_recogida = {
        TipoTransporte.RECOGIDA.value,
        TipoTransporte.RECOGIDA_ENTREGA.value,
        TipoTransporte.RECOGIDA,
        TipoTransporte.RECOGIDA_ENTREGA,
    }

    if servicio in _servicios_alojamiento and transporte in _transportes_con_recogida:
        if not direccion or not direccion.strip():
            return direccion_requerida()
    return None


def validar_fecha_no_pasada(fecha_desde: date) -> DomainError | None:
    """
    Verifica que la fecha de inicio no sea anterior a la fecha actual.

    Args:
        fecha_desde: Fecha de inicio de la reserva.

    Returns:
        DomainError si la fecha es pasada, None si es válida.
    """
    hoy = date.today()
    if fecha_desde < hoy:
        return fecha_pasada(
            f"No se puede reservar en una fecha pasada ({fecha_desde})"
        )
    return None

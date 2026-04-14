"""
Result pattern para el dominio.

Permite representar éxito (Ok) o fallo (Err) sin lanzar excepciones no controladas.
El dominio no importa nada de aplicación ni infraestructura (Clean Architecture).

Uso:
    resultado: Result = Ok(value=reserva)
    resultado: Result = Err(error=DomainError("FECHA_INVALIDA", "Fecha no válida"))

    if isinstance(resultado, Ok):
        procesar(resultado.value)
    else:
        manejar_error(resultado.error)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class Ok:
    """Representa un resultado exitoso. Contiene el valor de retorno."""
    value: Any


@dataclass
class Err:
    """Representa un resultado fallido. Contiene el error de dominio."""
    error: "DomainError"


# Alias de tipo para anotaciones: Result = Ok | Err
Result = Ok | Err


class DomainError(Exception):
    """
    Error de dominio con código semántico y estado HTTP asociado.

    Catálogo de códigos:
        FECHA_INVALIDA        (400) - Rango de fechas no válido para el servicio
        FECHA_PASADA          (400) - Intento de reservar en fecha pasada
        SIN_DISPONIBILIDAD    (409) - No hay plazas en el rango solicitado
        DIA_BLOQUEADO         (409) - El día está bloqueado por el empresario
        CAMPOS_OBLIGATORIOS   (400) - Faltan campos requeridos
        PRIVACIDAD_NO_ACEPTADA(400) - El cliente no aceptó la política de privacidad
        DIRECCION_REQUERIDA   (400) - Falta dirección para servicio con recogida
        TRANSICION_INVALIDA   (422) - Cambio de estado no permitido
        RESERVA_NO_ENCONTRADA (404) - La reserva solicitada no existe
        NO_AUTENTICADO        (401) - Petición sin autenticación válida
        FESTIVO_INVALIDO      (400) - Festivo sin fecha o nombre
        ERROR_NOTIFICACION    (-  ) - Fallo en envío de email (no interrumpe flujo)
        ERROR_BD              (503) - Fallo de conexión con base de datos
    """

    def __init__(self, code: str, message: str, http_status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status

    def __repr__(self) -> str:
        return f"DomainError(code={self.code!r}, message={self.message!r}, http_status={self.http_status})"


# ---------------------------------------------------------------------------
# Errores de dominio predefinidos (fábrica de instancias)
# ---------------------------------------------------------------------------

def fecha_invalida(detalle: str = "Rango de fechas no válido para el servicio") -> DomainError:
    return DomainError("FECHA_INVALIDA", detalle, 400)


def fecha_pasada(detalle: str = "No se puede reservar en una fecha pasada") -> DomainError:
    return DomainError("FECHA_PASADA", detalle, 400)


def sin_disponibilidad(detalle: str = "No hay plazas disponibles en el rango solicitado") -> DomainError:
    return DomainError("SIN_DISPONIBILIDAD", detalle, 409)


def dia_bloqueado(detalle: str = "El día está bloqueado por el empresario") -> DomainError:
    return DomainError("DIA_BLOQUEADO", detalle, 409)


def campos_obligatorios(campo: str = "") -> DomainError:
    msg = f"Falta el campo obligatorio: {campo}" if campo else "Faltan campos obligatorios"
    return DomainError("CAMPOS_OBLIGATORIOS", msg, 400)


def privacidad_no_aceptada() -> DomainError:
    return DomainError("PRIVACIDAD_NO_ACEPTADA", "Debe aceptar la política de privacidad", 400)


def direccion_requerida() -> DomainError:
    return DomainError("DIRECCION_REQUERIDA", "Se requiere dirección de recogida para este servicio", 400)


def transicion_invalida(desde: str, hacia: str) -> DomainError:
    return DomainError("TRANSICION_INVALIDA", f"No se puede pasar de '{desde}' a '{hacia}'", 422)


def reserva_no_encontrada(reserva_id: str = "") -> DomainError:
    msg = f"Reserva '{reserva_id}' no encontrada" if reserva_id else "Reserva no encontrada"
    return DomainError("RESERVA_NO_ENCONTRADA", msg, 404)


def no_autenticado() -> DomainError:
    return DomainError("NO_AUTENTICADO", "Autenticación requerida", 401)


def festivo_invalido(detalle: str = "El festivo debe tener fecha y nombre") -> DomainError:
    return DomainError("FESTIVO_INVALIDO", detalle, 400)


def error_notificacion(detalle: str = "Fallo en el envío de notificación") -> DomainError:
    # http_status=-1 indica que este error no se traduce a respuesta HTTP
    return DomainError("ERROR_NOTIFICACION", detalle, -1)


def error_bd(detalle: str = "Error de conexión con la base de datos") -> DomainError:
    return DomainError("ERROR_BD", detalle, 503)

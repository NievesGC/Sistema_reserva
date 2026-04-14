"""
Caso de uso: Desbloquear un día del calendario para un servicio.

Restaura la disponibilidad de un día previamente bloqueado.
Devuelve Err si el día no está bloqueado.

Requisitos: 8.5, 8.7
"""

from __future__ import annotations

from datetime import date

from modules.disponibilidad.domain.disponibilidad import IDisponibilidadService
from shared.domain.result import DomainError, Err, Ok, Result
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)


def _dia_no_bloqueado(fecha: date, servicio: str) -> DomainError:
    """Error de dominio para intento de desbloquear un día que no está bloqueado."""
    return DomainError(
        "DIA_NO_BLOQUEADO",
        f"El día {fecha} no está bloqueado para {servicio}",
        400,
    )


class DesbloquearDiaUseCase:
    """
    Desbloquea un día del calendario para un servicio concreto.

    Verifica primero si el día está efectivamente bloqueado para evitar
    operaciones redundantes y devolver un error informativo al empresario.
    """

    def __init__(self, servicio: IDisponibilidadService) -> None:
        self._servicio = servicio

    async def execute(self, servicio: str, fecha: date) -> Result:
        """
        Desbloquea el día indicado para el servicio.

        Args:
            servicio: Tipo de servicio ('paseos' | 'guarderia' | 'alojamiento').
            fecha: Fecha a desbloquear.

        Returns:
            Ok(True) si el desbloqueo se realizó correctamente.
            Err(DomainError) si el día no estaba bloqueado.
        """
        try:
            # Verificar disponibilidad del día para detectar si está bloqueado
            resultado = await self._servicio.verificar_disponibilidad_rango(
                servicio=servicio,
                fecha_desde=fecha,
                fecha_hasta=fecha,
            )

            fecha_iso = fecha.isoformat()
            plazas = resultado.plazas_por_dia.get(fecha_iso, 0)

            # plazas == -1 indica día bloqueado (convenio del repositorio)
            if plazas != -1:
                logger.warning(
                    "desbloquear_dia_no_bloqueado",
                    servicio=servicio,
                )
                return Err(_dia_no_bloqueado(fecha, servicio))

            # Realizar el desbloqueo
            await self._servicio.desbloquear_dia(servicio=servicio, fecha=fecha)
            logger.info("desbloquear_dia_ok", servicio=servicio)
            return Ok(True)

        except Exception as exc:
            logger.error(
                "desbloquear_dia_error",
                servicio=servicio,
                error_type=type(exc).__name__,
            )
            from shared.domain.result import error_bd
            return Err(error_bd())

"""
Caso de uso: Verificar disponibilidad en un rango de fechas.

Orquesta la consulta de disponibilidad validando primero que el rango
de fechas sea coherente (fecha_desde <= fecha_hasta).

Requisitos: 2.2, 2.6, 2.8
"""

from __future__ import annotations

from datetime import date

from modules.disponibilidad.domain.disponibilidad import (
    IDisponibilidadService,
    ResultadoDisponibilidad,
)
from shared.domain.result import Err, Ok, Result, fecha_invalida
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)


class VerificarDisponibilidadUseCase:
    """
    Verifica la disponibilidad de plazas para un servicio en un rango de fechas.

    Valida que fecha_desde <= fecha_hasta antes de delegar al servicio.
    Devuelve ResultadoDisponibilidad via Result pattern.
    """

    def __init__(self, servicio: IDisponibilidadService) -> None:
        self._servicio = servicio

    async def execute(
        self,
        servicio: str,
        fecha_desde: date,
        fecha_hasta: date,
    ) -> Result:
        """
        Ejecuta la verificación de disponibilidad.

        Args:
            servicio: Tipo de servicio ('paseos' | 'guarderia' | 'alojamiento').
            fecha_desde: Fecha de inicio del rango.
            fecha_hasta: Fecha de fin del rango.

        Returns:
            Ok(ResultadoDisponibilidad) si el rango es válido.
            Err(DomainError) si fecha_desde > fecha_hasta.
        """
        # Validar coherencia del rango de fechas
        if fecha_desde > fecha_hasta:
            logger.warning(
                "verificar_disponibilidad_fecha_invalida",
                servicio=servicio,
            )
            return Err(fecha_invalida(
                f"fecha_desde ({fecha_desde}) no puede ser posterior a fecha_hasta ({fecha_hasta})"
            ))

        try:
            resultado = await self._servicio.verificar_disponibilidad_rango(
                servicio=servicio,
                fecha_desde=fecha_desde,
                fecha_hasta=fecha_hasta,
            )
            logger.info(
                "verificar_disponibilidad_ok",
                servicio=servicio,
                disponible=resultado.disponible,
            )
            return Ok(resultado)
        except Exception as exc:
            logger.error(
                "verificar_disponibilidad_error",
                servicio=servicio,
                error_type=type(exc).__name__,
            )
            from shared.domain.result import error_bd
            return Err(error_bd())

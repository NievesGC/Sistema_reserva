"""
Caso de uso: Bloquear un día del calendario para un servicio.

Marca un día como no disponible para nuevas reservas.
Devuelve Err(dia_bloqueado()) si el día ya está bloqueado.

Requisitos: 8.4, 8.6
"""

from __future__ import annotations

from datetime import date

from modules.disponibilidad.domain.disponibilidad import IDisponibilidadService
from shared.domain.result import Err, Ok, Result, dia_bloqueado
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)


class BloquearDiaUseCase:
    """
    Bloquea un día del calendario para un servicio concreto.

    Verifica primero si el día ya está bloqueado para evitar operaciones
    redundantes y devolver un error informativo al empresario.
    """

    def __init__(self, servicio: IDisponibilidadService) -> None:
        self._servicio = servicio

    async def execute(self, servicio: str, fecha: date) -> Result:
        """
        Bloquea el día indicado para el servicio.

        Args:
            servicio: Tipo de servicio ('paseos' | 'guarderia' | 'alojamiento').
            fecha: Fecha a bloquear.

        Returns:
            Ok(True) si el bloqueo se realizó correctamente.
            Err(DomainError) si el día ya estaba bloqueado.
        """
        try:
            # Verificar disponibilidad del día para detectar si ya está bloqueado
            resultado = await self._servicio.verificar_disponibilidad_rango(
                servicio=servicio,
                fecha_desde=fecha,
                fecha_hasta=fecha,
            )

            # Si el día ya está bloqueado (sin disponibilidad por bloqueo), informar
            fecha_iso = fecha.isoformat()
            plazas = resultado.plazas_por_dia.get(fecha_iso, -1)

            # plazas == -1 indica día bloqueado (convenio del repositorio)
            if plazas == -1:
                logger.warning(
                    "bloquear_dia_ya_bloqueado",
                    servicio=servicio,
                )
                return Err(dia_bloqueado(f"El día {fecha} ya está bloqueado para {servicio}"))

            # Realizar el bloqueo
            await self._servicio.bloquear_dia(servicio=servicio, fecha=fecha)
            logger.info("bloquear_dia_ok", servicio=servicio)
            return Ok(True)

        except Exception as exc:
            logger.error(
                "bloquear_dia_error",
                servicio=servicio,
                error_type=type(exc).__name__,
            )
            from shared.domain.result import error_bd
            return Err(error_bd())

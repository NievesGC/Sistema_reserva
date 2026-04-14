"""
Caso de uso: Rechazar una reserva pendiente.

Transición de estado: pendiente → rechazada.
Libera las plazas ocupadas y notifica al cliente.

Requisitos: 7.5, 6.3
"""

from __future__ import annotations

from modules.disponibilidad.domain.disponibilidad import IDisponibilidadService
from modules.notificaciones.application.enviar_notificacion import (
    EnviarNotificacionRechazo,
)
from modules.notificaciones.domain.notificaciones_service import INotificacionesService
from modules.reservas.domain.reserva import EstadoReserva
from modules.reservas.domain.reserva_repository import IReservaRepository
from shared.domain.result import Err, Ok, Result, transicion_invalida
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)

_TRANSICION_ORIGEN = EstadoReserva.PENDIENTE
_TRANSICION_DESTINO = EstadoReserva.RECHAZADA


class RechazarReservaUseCase:
    """
    Rechaza una reserva que está en estado pendiente.

    Libera las plazas de disponibilidad y notifica al cliente.
    """

    def __init__(
        self,
        reserva_repo: IReservaRepository,
        disponibilidad_service: IDisponibilidadService,
        notificaciones_service: INotificacionesService,
    ) -> None:
        self._reserva_repo = reserva_repo
        self._disponibilidad = disponibilidad_service
        self._notificaciones = notificaciones_service

    async def execute(self, reserva_id: str) -> Result:
        """
        Rechaza la reserva indicada.

        Args:
            reserva_id: UUID de la reserva a rechazar.

        Returns:
            Ok(Reserva) con la reserva rechazada.
            Err(DomainError) si la reserva no existe o la transición no es válida.
        """
        # Obtener la reserva
        resultado = await self._reserva_repo.obtener_por_id(reserva_id)
        if isinstance(resultado, Err):
            return resultado

        reserva = resultado.value

        # Validar transición de estado
        if reserva.estado != _TRANSICION_ORIGEN:
            return Err(transicion_invalida(
                desde=reserva.estado.value if hasattr(reserva.estado, "value") else str(reserva.estado),
                hacia=_TRANSICION_DESTINO.value,
            ))

        # Actualizar estado
        resultado_update = await self._reserva_repo.actualizar_estado(
            reserva_id=reserva_id,
            nuevo_estado=_TRANSICION_DESTINO,
        )
        if isinstance(resultado_update, Err):
            return resultado_update

        reserva_rechazada = resultado_update.value

        # Liberar plazas (Propiedad 7: consistencia reserva-disponibilidad)
        try:
            await self._disponibilidad.liberar_plazas(
                servicio=reserva.servicio.value if hasattr(reserva.servicio, "value") else reserva.servicio,
                fecha_desde=reserva.fecha_desde,
                fecha_hasta=reserva.fecha_hasta,
            )
        except Exception as exc:
            logger.error(
                "rechazar_reserva_error_liberar_plazas",
                reserva_id=reserva_id,
                error_type=type(exc).__name__,
            )

        # Notificar al cliente (sin interrumpir si falla)
        reserva_dict = _reserva_a_dict(reserva_rechazada)
        notif_uc = EnviarNotificacionRechazo(servicio=self._notificaciones)
        await notif_uc.execute(reserva_dict)

        logger.info("rechazar_reserva_ok", reserva_id=reserva_id)
        return Ok(reserva_rechazada)


def _reserva_a_dict(reserva) -> dict:
    return {
        "id": reserva.id,
        "servicio": reserva.servicio.value if hasattr(reserva.servicio, "value") else reserva.servicio,
        "fecha_desde": str(reserva.fecha_desde),
        "fecha_hasta": str(reserva.fecha_hasta),
        "estado": reserva.estado.value if hasattr(reserva.estado, "value") else reserva.estado,
        "precio_total": reserva.precio_total,
        "email": reserva.cliente.email,
        "nombre_dueno": reserva.cliente.nombre,
        "nombre_perro": reserva.mascota.nombre,
    }

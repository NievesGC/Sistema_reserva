"""
Caso de uso: Confirmar una reserva pendiente.

Transición de estado: pendiente → confirmada.
Valida la transición, actualiza el estado y notifica al cliente.

Requisitos: 7.4, 6.2
"""

from __future__ import annotations

from modules.notificaciones.application.enviar_notificacion import (
    EnviarNotificacionConfirmacion,
)
from modules.notificaciones.domain.notificaciones_service import INotificacionesService
from modules.reservas.domain.reserva import EstadoReserva
from modules.reservas.domain.reserva_repository import IReservaRepository
from shared.domain.result import Err, Ok, Result, transicion_invalida
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)

# Transiciones válidas: solo pendiente → confirmada
_TRANSICION_ORIGEN = EstadoReserva.PENDIENTE
_TRANSICION_DESTINO = EstadoReserva.CONFIRMADA


class ConfirmarReservaUseCase:
    """
    Confirma una reserva que está en estado pendiente.

    Valida que la transición sea válida (pendiente → confirmada),
    actualiza el estado en el repositorio y notifica al cliente.
    """

    def __init__(
        self,
        reserva_repo: IReservaRepository,
        notificaciones_service: INotificacionesService,
    ) -> None:
        self._reserva_repo = reserva_repo
        self._notificaciones = notificaciones_service

    async def execute(self, reserva_id: str) -> Result:
        """
        Confirma la reserva indicada.

        Args:
            reserva_id: UUID de la reserva a confirmar.

        Returns:
            Ok(Reserva) con la reserva confirmada.
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

        reserva_confirmada = resultado_update.value

        # Notificar al cliente (sin interrumpir si falla)
        reserva_dict = _reserva_a_dict(reserva_confirmada)
        notif_uc = EnviarNotificacionConfirmacion(servicio=self._notificaciones)
        await notif_uc.execute(reserva_dict)

        logger.info("confirmar_reserva_ok", reserva_id=reserva_id)
        return Ok(reserva_confirmada)


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

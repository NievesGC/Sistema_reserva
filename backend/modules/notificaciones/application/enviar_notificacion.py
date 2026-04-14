"""
Casos de uso para el envío de notificaciones por email.

Cada use case encapsula el envío de un tipo específico de notificación.
Si el envío falla, el error se registra en el log sin propagarse,
garantizando que el flujo principal de la reserva no se interrumpa.

Requisito 6.6: Los fallos de notificación no interrumpen el flujo de la reserva.
"""

from __future__ import annotations

from modules.notificaciones.domain.notificaciones_service import INotificacionesService
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)


class EnviarNotificacionNuevaReserva:
    """
    Notifica al cliente y al empresario cuando se crea una nueva reserva.

    Requisitos: 6.1, 6.5
    """

    def __init__(self, servicio: INotificacionesService) -> None:
        self._servicio = servicio

    async def execute(self, reserva: dict) -> None:
        """
        Envía notificación de nueva reserva al cliente y al empresario.

        Si el envío falla, registra el error sin propagar la excepción.

        Args:
            reserva: Datos de la reserva recién creada.
        """
        # Notificar al cliente
        try:
            await self._servicio.notificar_nueva_reserva(reserva)
            logger.info(
                "notificacion_nueva_reserva_cliente_ok",
                reserva_id=reserva.get("id"),
            )
        except Exception as exc:
            # Requisito 6.6: registrar sin propagar, sin PII en el log
            logger.error(
                "notificacion_nueva_reserva_cliente_error",
                reserva_id=reserva.get("id"),
                error_type=type(exc).__name__,
            )

        # Notificar al empresario
        try:
            await self._servicio.notificar_empresario(reserva, evento="nueva_reserva")
            logger.info(
                "notificacion_nueva_reserva_empresario_ok",
                reserva_id=reserva.get("id"),
            )
        except Exception as exc:
            logger.error(
                "notificacion_nueva_reserva_empresario_error",
                reserva_id=reserva.get("id"),
                error_type=type(exc).__name__,
            )


class EnviarNotificacionConfirmacion:
    """
    Notifica al cliente cuando su reserva es confirmada.

    Requisito: 6.2
    """

    def __init__(self, servicio: INotificacionesService) -> None:
        self._servicio = servicio

    async def execute(self, reserva: dict) -> None:
        """
        Envía notificación de confirmación al cliente.

        Si el envío falla, registra el error sin propagar la excepción.

        Args:
            reserva: Datos de la reserva confirmada.
        """
        try:
            await self._servicio.notificar_confirmacion(reserva)
            logger.info(
                "notificacion_confirmacion_ok",
                reserva_id=reserva.get("id"),
            )
        except Exception as exc:
            logger.error(
                "notificacion_confirmacion_error",
                reserva_id=reserva.get("id"),
                error_type=type(exc).__name__,
            )


class EnviarNotificacionRechazo:
    """
    Notifica al cliente cuando su reserva es rechazada.

    Requisito: 6.3
    """

    def __init__(self, servicio: INotificacionesService) -> None:
        self._servicio = servicio

    async def execute(self, reserva: dict) -> None:
        """
        Envía notificación de rechazo al cliente.

        Si el envío falla, registra el error sin propagar la excepción.

        Args:
            reserva: Datos de la reserva rechazada.
        """
        try:
            await self._servicio.notificar_rechazo(reserva)
            logger.info(
                "notificacion_rechazo_ok",
                reserva_id=reserva.get("id"),
            )
        except Exception as exc:
            logger.error(
                "notificacion_rechazo_error",
                reserva_id=reserva.get("id"),
                error_type=type(exc).__name__,
            )


class EnviarNotificacionCancelacion:
    """
    Notifica al cliente cuando su reserva confirmada es cancelada.

    Requisito: 6.4
    """

    def __init__(self, servicio: INotificacionesService) -> None:
        self._servicio = servicio

    async def execute(self, reserva: dict) -> None:
        """
        Envía notificación de cancelación al cliente.

        Si el envío falla, registra el error sin propagar la excepción.

        Args:
            reserva: Datos de la reserva cancelada.
        """
        try:
            await self._servicio.notificar_cancelacion(reserva)
            logger.info(
                "notificacion_cancelacion_ok",
                reserva_id=reserva.get("id"),
            )
        except Exception as exc:
            logger.error(
                "notificacion_cancelacion_error",
                reserva_id=reserva.get("id"),
                error_type=type(exc).__name__,
            )

"""
Protocolo del servicio de notificaciones.

Define el contrato que deben implementar los servicios concretos de
notificación (SMTP, SendGrid, mock para tests, etc.) sin depender
de infraestructura.

El dominio no importa nada de aplicación ni infraestructura (Clean Architecture).

Requisitos: 6.1-6.6
"""

from __future__ import annotations

from typing import Protocol


class INotificacionesService(Protocol):
    """
    Contrato del servicio de notificaciones por email.

    Cada método corresponde a un evento del ciclo de vida de una reserva.
    Los implementadores deben capturar excepciones internamente y registrarlas
    en el log sin propagarlas (Requisito 6.6).
    """

    async def notificar_nueva_reserva(self, reserva: dict) -> None:
        """
        Notifica al cliente que su reserva ha sido recibida y está pendiente.

        Se invoca cuando el cliente crea una nueva reserva (estado: pendiente).

        Args:
            reserva: Diccionario con los datos de la reserva (id, servicio,
                     fechas, nombre_dueno, email, etc.).
        """
        ...

    async def notificar_confirmacion(self, reserva: dict) -> None:
        """
        Notifica al cliente que su reserva ha sido confirmada.

        Se invoca cuando el empresario confirma una reserva pendiente.

        Args:
            reserva: Diccionario con los datos de la reserva confirmada.
        """
        ...

    async def notificar_rechazo(self, reserva: dict) -> None:
        """
        Notifica al cliente que su reserva ha sido rechazada.

        Se invoca cuando el empresario rechaza una reserva pendiente.

        Args:
            reserva: Diccionario con los datos de la reserva rechazada.
        """
        ...

    async def notificar_cancelacion(self, reserva: dict) -> None:
        """
        Notifica al cliente que su reserva confirmada ha sido cancelada.

        Se invoca cuando el empresario cancela una reserva confirmada.

        Args:
            reserva: Diccionario con los datos de la reserva cancelada.
        """
        ...

    async def notificar_empresario(self, reserva: dict, evento: str) -> None:
        """
        Notifica al empresario sobre un evento en una reserva.

        Se invoca principalmente cuando se crea una nueva reserva para
        alertar al empresario de la nueva solicitud pendiente.

        Args:
            reserva: Diccionario con los datos de la reserva.
            evento: Tipo de evento ('nueva_reserva' | 'confirmada' | etc.).
        """
        ...

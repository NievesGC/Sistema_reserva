"""
Protocolo del repositorio de reservas.

Define el contrato que deben implementar los repositorios concretos
(Supabase, en memoria para tests, etc.) sin depender de infraestructura.

El dominio no importa nada de aplicación ni infraestructura (Clean Architecture).

Requisitos: 7.1, 7.2, 7.3
"""

from __future__ import annotations

from typing import Protocol

from modules.reservas.domain.reserva import EstadoReserva, Reserva
from shared.domain.result import Result


class IReservaRepository(Protocol):
    """
    Contrato del repositorio de reservas.

    Abstrae las operaciones CRUD sobre reservas para que los casos de uso
    no dependan de la implementación concreta de persistencia.
    """

    async def crear(self, reserva: Reserva) -> Result:
        """
        Persiste una nueva reserva en el almacén.

        Args:
            reserva: Entidad Reserva a persistir.

        Returns:
            Ok(Reserva) con la reserva creada (incluyendo id generado).
            Err(DomainError) si falla la persistencia.
        """
        ...

    async def obtener_por_id(self, reserva_id: str) -> Result:
        """
        Recupera una reserva por su identificador único.

        Args:
            reserva_id: UUID de la reserva.

        Returns:
            Ok(Reserva) si existe.
            Err(reserva_no_encontrada) si no existe.
        """
        ...

    async def listar(
        self,
        estado: str | None = None,
        servicio: str | None = None,
    ) -> Result:
        """
        Lista reservas con filtros opcionales.

        Args:
            estado: Filtrar por estado ('pendiente' | 'confirmada' | 'rechazada' | 'cancelada').
            servicio: Filtrar por tipo de servicio ('paseos' | 'guarderia' | 'alojamiento').

        Returns:
            Ok(list[Reserva]) con las reservas que cumplen los filtros.
            Err(DomainError) si falla la consulta.
        """
        ...

    async def actualizar_estado(
        self,
        reserva_id: str,
        nuevo_estado: EstadoReserva,
    ) -> Result:
        """
        Actualiza el estado de una reserva existente.

        Args:
            reserva_id: UUID de la reserva.
            nuevo_estado: Nuevo estado a asignar.

        Returns:
            Ok(Reserva) con la reserva actualizada.
            Err(DomainError) si no existe o falla la actualización.
        """
        ...

    async def actualizar(self, reserva: Reserva) -> Result:
        """
        Actualiza todos los campos modificables de una reserva.

        Args:
            reserva: Entidad Reserva con los datos actualizados.

        Returns:
            Ok(Reserva) con la reserva actualizada.
            Err(DomainError) si no existe o falla la actualización.
        """
        ...

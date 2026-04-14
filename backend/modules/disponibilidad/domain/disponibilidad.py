"""
Entidades de dominio para el módulo de disponibilidad.

Define los dataclasses ResultadoDisponibilidad y BloqueoCalendario,
y el Protocol IDisponibilidadService que abstrae las operaciones de
disponibilidad sin depender de infraestructura.

El dominio no importa nada de aplicación ni infraestructura (Clean Architecture).

Requisitos: 2.2, 2.6, 2.8, 8.1-8.8
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Protocol


@dataclass
class ResultadoDisponibilidad:
    """
    Resultado de una consulta de disponibilidad para un rango de fechas.

    Attributes:
        disponible: True si hay plazas en todos los días del rango.
        plazas_por_dia: Mapa fecha ISO → plazas libres para cada día del rango.
        dias_sin_disponibilidad: Fechas del rango sin plazas disponibles (bloqueadas o llenas).
    """
    disponible: bool
    plazas_por_dia: dict[str, int]  # fecha ISO (YYYY-MM-DD) → plazas libres
    dias_sin_disponibilidad: list[date] = field(default_factory=list)


@dataclass
class BloqueoCalendario:
    """
    Representa el estado de bloqueo de un día concreto para un servicio.

    Attributes:
        servicio: Tipo de servicio ('paseos' | 'guarderia' | 'alojamiento').
        fecha: Fecha del bloqueo.
        bloqueado: True si el día está bloqueado por el empresario.
        plazas_ocupadas: Número de plazas ya reservadas en ese día.
    """
    servicio: str
    fecha: date
    bloqueado: bool
    plazas_ocupadas: int = 0


class IDisponibilidadService(Protocol):
    """
    Contrato del servicio de disponibilidad.

    Abstrae las operaciones de consulta y modificación de disponibilidad
    para que los casos de uso no dependan de la implementación concreta
    (Supabase, base de datos en memoria, etc.).
    """

    async def verificar_disponibilidad_rango(
        self,
        servicio: str,
        fecha_desde: date,
        fecha_hasta: date,
    ) -> ResultadoDisponibilidad:
        """
        Verifica la disponibilidad de plazas para un rango de fechas.

        Calcula plazas_libres = plazas_max - plazas_ocupadas para cada día.
        Los días bloqueados se consideran sin disponibilidad (plazas = 0).

        Args:
            servicio: Tipo de servicio a consultar.
            fecha_desde: Fecha de inicio del rango (inclusive).
            fecha_hasta: Fecha de fin del rango (inclusive).

        Returns:
            ResultadoDisponibilidad con el estado de cada día del rango.
        """
        ...

    async def reservar_plazas(
        self,
        servicio: str,
        fecha_desde: date,
        fecha_hasta: date,
    ) -> None:
        """
        Incrementa plazas_ocupadas en 1 para cada día del rango.

        Se llama al confirmar una reserva para actualizar la disponibilidad.

        Args:
            servicio: Tipo de servicio.
            fecha_desde: Fecha de inicio del rango (inclusive).
            fecha_hasta: Fecha de fin del rango (inclusive).
        """
        ...

    async def liberar_plazas(
        self,
        servicio: str,
        fecha_desde: date,
        fecha_hasta: date,
    ) -> None:
        """
        Decrementa plazas_ocupadas en 1 para cada día del rango (mínimo 0).

        Se llama al rechazar o cancelar una reserva.

        Args:
            servicio: Tipo de servicio.
            fecha_desde: Fecha de inicio del rango (inclusive).
            fecha_hasta: Fecha de fin del rango (inclusive).
        """
        ...

    async def bloquear_dia(self, servicio: str, fecha: date) -> None:
        """
        Marca un día como bloqueado para el servicio indicado.

        Args:
            servicio: Tipo de servicio.
            fecha: Fecha a bloquear.
        """
        ...

    async def desbloquear_dia(self, servicio: str, fecha: date) -> None:
        """
        Elimina el bloqueo de un día para el servicio indicado.

        Args:
            servicio: Tipo de servicio.
            fecha: Fecha a desbloquear.
        """
        ...

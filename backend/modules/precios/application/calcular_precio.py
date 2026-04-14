"""
Caso de uso: Calcular precio de una reserva.

Orquesta la obtención de configuración de precios y festivos activos,
y delega el cálculo puro al dominio.

Requisitos: 4.1, 4.2, 4.3, 9.1, 9.3
"""

from __future__ import annotations

from datetime import date
from typing import Protocol

from modules.precios.domain.calculador_precio import (
    DesglosePrecio,
    ParametrosCalculo,
    calcular_precio,
)
from modules.precios.domain.festivo import Festivo
from modules.precios.domain.tarifa import ConfiguracionPrecios


# ---------------------------------------------------------------------------
# Protocolos de repositorio (interfaces del dominio)
# ---------------------------------------------------------------------------

class IPreciosRepository(Protocol):
    """Interfaz para acceder y actualizar la configuración de precios."""

    async def obtener_configuracion(self, servicio: str) -> ConfiguracionPrecios:
        """Devuelve la configuración de precios para el servicio indicado."""
        ...

    async def actualizar_configuracion(
        self, servicio: str, config: ConfiguracionPrecios
    ) -> None:
        """Persiste la nueva configuración de precios para el servicio."""
        ...


class IFestivosRepository(Protocol):
    """Interfaz para gestionar los días festivos."""

    async def listar_festivos(self) -> list[Festivo]:
        """Devuelve todos los festivos activos."""
        ...

    async def crear_festivo(self, fecha: date, nombre: str) -> Festivo:
        """Crea un nuevo festivo y lo devuelve."""
        ...

    async def eliminar_festivo(self, id: str) -> None:
        """Elimina el festivo con el id indicado."""
        ...


# ---------------------------------------------------------------------------
# Caso de uso
# ---------------------------------------------------------------------------

class CalcularPrecioUseCase:
    """
    Calcula el precio total de una reserva.

    Obtiene la configuración de precios del repositorio, recupera los
    festivos activos y delega el cálculo a la función pura del dominio.
    """

    def __init__(
        self,
        precios_repo: IPreciosRepository,
        festivos_repo: IFestivosRepository,
    ) -> None:
        self._precios_repo = precios_repo
        self._festivos_repo = festivos_repo

    async def execute(self, params: ParametrosCalculo) -> DesglosePrecio:
        """
        Ejecuta el cálculo de precio.

        Args:
            params: Parámetros de la reserva (servicio, tarifa, fechas, opciones).

        Returns:
            DesglosePrecio con todos los conceptos y el total.
        """
        # Obtener configuración de precios del servicio
        config = await self._precios_repo.obtener_configuracion(params.servicio)

        # Obtener festivos activos y extraer solo las fechas
        festivos = await self._festivos_repo.listar_festivos()
        fechas_festivos = [f.fecha for f in festivos if f.activo]

        # Inyectar festivos en los parámetros y calcular
        params_con_festivos = ParametrosCalculo(
            servicio=params.servicio,
            tarifa=params.tarifa,
            fecha_desde=params.fecha_desde,
            fecha_hasta=params.fecha_hasta,
            perro_extra=params.perro_extra,
            transporte=params.transporte,
            festivos=fechas_festivos,
        )

        return calcular_precio(params_con_festivos, config)

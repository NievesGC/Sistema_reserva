"""
Casos de uso para la gestión de días festivos.

Incluye: CrearFestivoUseCase, EliminarFestivoUseCase, ListarFestivosUseCase.

Validación: festivo sin fecha o sin nombre → DomainError FESTIVO_INVALIDO (400).

Requisitos: 10.1, 10.2, 10.3, 10.4
"""

from __future__ import annotations

from datetime import date

from modules.precios.domain.festivo import Festivo
from shared.domain.result import DomainError, festivo_invalido


class CrearFestivoUseCase:
    """
    Crea un nuevo día festivo.

    Valida que la fecha y el nombre sean obligatorios antes de persistir.
    """

    def __init__(self, festivos_repo) -> None:
        self._repo = festivos_repo

    async def execute(self, fecha: date | None, nombre: str | None) -> Festivo:
        """
        Crea el festivo tras validar los campos obligatorios.

        Args:
            fecha:  Fecha del festivo. Obligatoria.
            nombre: Nombre descriptivo del festivo. Obligatorio y no vacío.

        Returns:
            Festivo creado con su id asignado.

        Raises:
            DomainError(FESTIVO_INVALIDO, 400): Si fecha o nombre son inválidos.
        """
        # Validar fecha obligatoria
        if fecha is None:
            raise festivo_invalido("El festivo debe tener una fecha")

        # Validar nombre obligatorio y no vacío
        if not nombre:
            raise festivo_invalido("El festivo debe tener un nombre")

        return await self._repo.crear_festivo(fecha, nombre)


class EliminarFestivoUseCase:
    """Elimina un festivo existente por su id."""

    def __init__(self, festivos_repo) -> None:
        self._repo = festivos_repo

    async def execute(self, festivo_id: str) -> None:
        """
        Elimina el festivo con el id indicado.

        Args:
            festivo_id: Identificador del festivo a eliminar.
        """
        await self._repo.eliminar_festivo(festivo_id)


class ListarFestivosUseCase:
    """Lista todos los festivos activos."""

    def __init__(self, festivos_repo) -> None:
        self._repo = festivos_repo

    async def execute(self) -> list[Festivo]:
        """
        Devuelve la lista de festivos activos.

        Returns:
            Lista de objetos Festivo.
        """
        return await self._repo.listar_festivos()

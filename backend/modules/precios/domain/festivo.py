"""
Entidad de dominio para días festivos.

Un Festivo representa un día marcado por el empresario con tarifa especial.
Cuando una reserva incluye días festivos, el precio puede variar.

El dominio no importa nada de aplicación ni infraestructura (Clean Architecture).

Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class Festivo:
    """
    Día festivo registrado por el empresario.

    Attributes:
        id:     Identificador único (UUID como string).
        fecha:  Fecha del festivo.
        nombre: Nombre descriptivo del festivo (ej: "Navidad").
        activo: Si es False, el festivo no se tiene en cuenta en los cálculos.
    """
    id: str
    fecha: date
    nombre: str
    activo: bool

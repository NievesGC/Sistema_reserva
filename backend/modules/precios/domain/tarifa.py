"""
Entidades de dominio para tarifas y configuración de precios.

Define los enums TipoTarifa y TipoTransporte, y el dataclass
ConfiguracionPrecios que agrupa todos los parámetros de precio
de un servicio concreto.

El dominio no importa nada de aplicación ni infraestructura (Clean Architecture).

Requisitos: 4.1, 4.2, 4.3, 9.1, 9.2
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class TipoTarifa(str, Enum):
    """Tipos de tarifa aplicables a una reserva."""
    NORMAL = 'normal'
    CACHORROS = 'cachorros'


class TipoTransporte(str, Enum):
    """Opciones de transporte disponibles para el servicio de Alojamiento."""
    SIN_TRANSPORTE = 'sin-transporte'
    RECOGIDA = 'recogida'
    RECOGIDA_ENTREGA = 'recogida-entrega'


@dataclass
class ConfiguracionPrecios:
    """
    Configuración de precios para un servicio concreto.

    Almacena todos los precios configurables por el empresario:
    precio base por tarifa, recargo festivo, coste de perro extra,
    número máximo de plazas y costes de transporte (solo Alojamiento).
    """
    # Identificador del servicio: 'paseos' | 'guarderia' | 'alojamiento'
    servicio: str

    # Precio por día/noche según tarifa
    precio_normal: float
    precio_cachorros: float

    # Precio adicional por día/noche en festivos
    precio_festivo: float

    # Coste adicional por día/noche cuando se incluye un segundo perro
    precio_perro_extra: float

    # Número máximo de plazas simultáneas para este servicio
    plazas_max: int

    # Costes de transporte (opcionales, solo aplican a Alojamiento)
    precio_recogida: float | None = None
    precio_recogida_entrega: float | None = None

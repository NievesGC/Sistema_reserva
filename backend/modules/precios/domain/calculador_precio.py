"""
Calculador de precio puro del dominio.

Contiene los dataclasses ParametrosCalculo y DesglosePrecio, y la función
pura `calcular_precio` que aplica la lógica de negocio sin efectos secundarios.

Lógica de unidades:
  - Alojamiento: noches = (fecha_hasta - fecha_desde).days  [diferencia pura]
  - Paseos / Guardería: dias = (fecha_hasta - fecha_desde).days + 1  [ambos extremos incluidos]

Lógica de precio:
  - precio_base = precio_por_unidad * unidades  (según tarifa normal/cachorros)
  - costo_perro_extra = config.precio_perro_extra * unidades  (si perro_extra=True)
  - costo_transporte = precio_recogida o precio_recogida_entrega según opción (solo alojamiento)
  - recargo_festivos = 0  (se aplica en capa de aplicación; aquí solo se identifican los días)
  - dias_festivos = fechas del rango que están en params.festivos
  - total = precio_base + costo_perro_extra + costo_transporte + recargo_festivos  (>= 0)

El dominio no importa nada de aplicación ni infraestructura (Clean Architecture).

Requisitos: 4.1, 4.2, 4.3
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

from modules.precios.domain.tarifa import ConfiguracionPrecios, TipoTransporte

# Servicios que cuentan días (ambos extremos incluidos)
_SERVICIOS_DIAS = {'paseos', 'guarderia'}

# Servicio que cuenta noches (diferencia pura de fechas)
_SERVICIO_NOCHES = 'alojamiento'


@dataclass
class ParametrosCalculo:
    """
    Parámetros de entrada para el cálculo de precio de una reserva.

    Attributes:
        servicio:     'paseos' | 'guarderia' | 'alojamiento'
        tarifa:       'normal' | 'cachorros'
        fecha_desde:  Fecha de inicio del servicio.
        fecha_hasta:  Fecha de fin del servicio.
        perro_extra:  True si se incluye un segundo perro.
        transporte:   Opción de transporte (solo relevante para alojamiento).
        festivos:     Lista de fechas festivas activas para detectar recargos.
    """
    servicio: str
    tarifa: str
    fecha_desde: date
    fecha_hasta: date
    perro_extra: bool
    transporte: str | None
    festivos: list[date] = field(default_factory=list)


@dataclass
class DesglosePrecio:
    """
    Desglose detallado del precio calculado para una reserva.

    Attributes:
        precio_base:       Precio base según tarifa y número de unidades.
        costo_perro_extra: Coste adicional por el segundo perro.
        costo_transporte:  Coste de recogida/entrega (solo alojamiento).
        recargo_festivos:  Recargo por días festivos (calculado en aplicación; aquí siempre 0).
        total:             Suma de todos los conceptos (siempre >= 0).
        dias_festivos:     Fechas del rango que coinciden con días festivos activos.
    """
    precio_base: float
    costo_perro_extra: float
    costo_transporte: float
    recargo_festivos: float
    total: float
    dias_festivos: list[date]


def _calcular_unidades(servicio: str, fecha_desde: date, fecha_hasta: date) -> int:
    """
    Calcula el número de unidades (días o noches) según el tipo de servicio.

    - Alojamiento: noches = diferencia pura de fechas (fecha_hasta - fecha_desde).days
    - Paseos / Guardería: días = diferencia + 1 (ambos extremos incluidos)
    """
    delta = (fecha_hasta - fecha_desde).days
    if servicio == _SERVICIO_NOCHES:
        return max(delta, 0)
    # Paseos y guardería incluyen ambos extremos
    return max(delta + 1, 1)


def _calcular_costo_transporte(
    servicio: str,
    transporte: str | None,
    config: ConfiguracionPrecios,
) -> float:
    """
    Calcula el coste de transporte.

    Solo aplica al servicio de Alojamiento. Para otros servicios devuelve 0.
    """
    if servicio != _SERVICIO_NOCHES or transporte is None:
        return 0.0

    if transporte == TipoTransporte.RECOGIDA.value:
        return float(config.precio_recogida or 0.0)

    if transporte == TipoTransporte.RECOGIDA_ENTREGA.value:
        return float(config.precio_recogida_entrega or 0.0)

    # 'sin-transporte' u otro valor → sin coste
    return 0.0


def _detectar_dias_festivos(
    fecha_desde: date,
    fecha_hasta: date,
    festivos: list[date],
) -> list[date]:
    """
    Devuelve las fechas del rango [fecha_desde, fecha_hasta] que son festivos.

    El rango incluye ambos extremos para cubrir tanto días como noches.
    """
    festivos_set = set(festivos)
    resultado: list[date] = []
    dia_actual = fecha_desde
    while dia_actual <= fecha_hasta:
        if dia_actual in festivos_set:
            resultado.append(dia_actual)
        dia_actual += timedelta(days=1)
    return resultado


def calcular_precio(
    params: ParametrosCalculo,
    config: ConfiguracionPrecios,
) -> DesglosePrecio:
    """
    Función pura que calcula el desglose de precio de una reserva.

    No tiene efectos secundarios ni dependencias externas.
    El recargo por festivos se identifica (dias_festivos) pero no se suma
    al total — esa responsabilidad recae en la capa de aplicación.

    Args:
        params: Parámetros de la reserva (servicio, tarifa, fechas, opciones).
        config: Configuración de precios del servicio.

    Returns:
        DesglosePrecio con todos los conceptos desglosados y el total.
    """
    # 1. Calcular número de unidades (días o noches)
    unidades = _calcular_unidades(params.servicio, params.fecha_desde, params.fecha_hasta)

    # 2. Precio base según tarifa
    if params.tarifa == 'cachorros':
        precio_por_unidad = float(config.precio_cachorros)
    else:
        precio_por_unidad = float(config.precio_normal)

    precio_base = precio_por_unidad * unidades

    # 3. Coste de perro extra
    costo_perro_extra = float(config.precio_perro_extra) * unidades if params.perro_extra else 0.0

    # 4. Coste de transporte (solo alojamiento)
    costo_transporte = _calcular_costo_transporte(params.servicio, params.transporte, config)

    # 5. Recargo festivos: 0 en el dominio (se aplica en aplicación)
    recargo_festivos = 0.0

    # 6. Detectar días festivos en el rango
    dias_festivos = _detectar_dias_festivos(
        params.fecha_desde, params.fecha_hasta, params.festivos
    )

    # 7. Total (siempre >= 0)
    total = max(precio_base + costo_perro_extra + costo_transporte + recargo_festivos, 0.0)

    return DesglosePrecio(
        precio_base=precio_base,
        costo_perro_extra=costo_perro_extra,
        costo_transporte=costo_transporte,
        recargo_festivos=recargo_festivos,
        total=total,
        dias_festivos=dias_festivos,
    )

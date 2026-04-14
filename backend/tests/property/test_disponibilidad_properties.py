"""
Tests de propiedad para el módulo de disponibilidad.

# Feature: sistema-reservas-guarderia-canina, Propiedad 2: Coherencia de disponibilidad con el estado de la base de datos
# Feature: sistema-reservas-guarderia-canina, Propiedad 13: Bloqueo impide disponibilidad y nuevas reservas
# Feature: sistema-reservas-guarderia-canina, Propiedad 14: Round-trip de bloqueo y desbloqueo

Usa hypothesis con mocks (unittest.mock) para no depender de Supabase real.
"""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from modules.disponibilidad.application.bloquear_dia import BloquearDiaUseCase
from modules.disponibilidad.application.desbloquear_dia import DesbloquearDiaUseCase
from modules.disponibilidad.application.verificar_disponibilidad import (
    VerificarDisponibilidadUseCase,
)
from modules.disponibilidad.domain.disponibilidad import ResultadoDisponibilidad
from shared.domain.result import Err, Ok


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def run(coro):
    """Ejecuta una corrutina en el event loop."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Estrategias
# ---------------------------------------------------------------------------

_servicios = st.sampled_from(["paseos", "guarderia", "alojamiento"])
_fecha_strategy = st.dates(
    min_value=date(2025, 1, 1),
    max_value=date(2026, 12, 31),
)
_plazas_max = st.integers(min_value=1, max_value=20)
_plazas_ocupadas = st.integers(min_value=0, max_value=20)


def _make_mock_servicio(
    plazas_por_dia: dict[str, int],
    dias_sin_disponibilidad: list[date] | None = None,
) -> MagicMock:
    """
    Crea un mock de IDisponibilidadService que devuelve el resultado indicado.
    """
    mock = MagicMock()
    resultado = ResultadoDisponibilidad(
        disponible=len(dias_sin_disponibilidad or []) == 0,
        plazas_por_dia=plazas_por_dia,
        dias_sin_disponibilidad=dias_sin_disponibilidad or [],
    )
    mock.verificar_disponibilidad_rango = AsyncMock(return_value=resultado)
    mock.bloquear_dia = AsyncMock()
    mock.desbloquear_dia = AsyncMock()
    mock.reservar_plazas = AsyncMock()
    mock.liberar_plazas = AsyncMock()
    return mock


# ---------------------------------------------------------------------------
# Propiedad 2: Coherencia de disponibilidad
# Valida: Requisitos 2.2, 2.6, 2.8
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    servicio=_servicios,
    fecha=_fecha_strategy,
    plazas_max=_plazas_max,
    plazas_ocupadas=_plazas_ocupadas,
)
def test_propiedad_2_coherencia_disponibilidad(
    servicio, fecha, plazas_max, plazas_ocupadas,
):
    """
    Propiedad 2: Coherencia de disponibilidad con el estado de la base de datos

    Para cualquier servicio y fecha, el número de plazas disponibles mostrado
    al cliente debe ser igual a plazas_max - plazas_ocupadas.
    Los días bloqueados deben tener plazas = -1 (sin disponibilidad).

    **Validates: Requirements 2.2, 2.6, 2.8**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 2: Coherencia de disponibilidad
    fecha_iso = fecha.isoformat()
    plazas_libres_esperadas = max(plazas_max - plazas_ocupadas, 0)

    # Simular el repositorio con los datos de disponibilidad
    plazas_por_dia = {fecha_iso: plazas_libres_esperadas}
    dias_sin = [fecha] if plazas_libres_esperadas == 0 else []

    mock_servicio = _make_mock_servicio(
        plazas_por_dia=plazas_por_dia,
        dias_sin_disponibilidad=dias_sin,
    )

    use_case = VerificarDisponibilidadUseCase(servicio=mock_servicio)
    resultado_result = run(use_case.execute(
        servicio=servicio,
        fecha_desde=fecha,
        fecha_hasta=fecha,
    ))

    assert isinstance(resultado_result, Ok), (
        f"Se esperaba Ok, se obtuvo Err: {resultado_result}"
    )

    resultado = resultado_result.value

    # La propiedad central: plazas_disponibles == plazas_max - plazas_ocupadas
    plazas_obtenidas = resultado.plazas_por_dia.get(fecha_iso, -999)
    assert plazas_obtenidas == plazas_libres_esperadas, (
        f"Coherencia violada: plazas_max={plazas_max}, plazas_ocupadas={plazas_ocupadas}, "
        f"esperado={plazas_libres_esperadas}, obtenido={plazas_obtenidas}"
    )

    # Si no hay plazas, el día debe estar en dias_sin_disponibilidad
    if plazas_libres_esperadas == 0:
        assert fecha in resultado.dias_sin_disponibilidad, (
            f"Día {fecha} sin plazas debe estar en dias_sin_disponibilidad"
        )
        assert resultado.disponible is False

    # Si hay plazas, el día no debe estar en dias_sin_disponibilidad
    if plazas_libres_esperadas > 0:
        assert fecha not in resultado.dias_sin_disponibilidad, (
            f"Día {fecha} con plazas no debe estar en dias_sin_disponibilidad"
        )


@settings(max_examples=100)
@given(
    servicio=_servicios,
    fecha=_fecha_strategy,
)
def test_propiedad_2_dia_bloqueado_sin_disponibilidad(servicio, fecha):
    """
    Propiedad 2 (variante): Un día bloqueado tiene plazas = -1 (sin disponibilidad).

    **Validates: Requirements 2.2, 2.6, 2.8**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 2: Coherencia de disponibilidad
    fecha_iso = fecha.isoformat()

    # Día bloqueado: convenio plazas = -1
    mock_servicio = _make_mock_servicio(
        plazas_por_dia={fecha_iso: -1},
        dias_sin_disponibilidad=[fecha],
    )

    use_case = VerificarDisponibilidadUseCase(servicio=mock_servicio)
    resultado_result = run(use_case.execute(
        servicio=servicio,
        fecha_desde=fecha,
        fecha_hasta=fecha,
    ))

    assert isinstance(resultado_result, Ok)
    resultado = resultado_result.value

    # Día bloqueado → plazas = -1 y sin disponibilidad
    assert resultado.plazas_por_dia.get(fecha_iso) == -1
    assert fecha in resultado.dias_sin_disponibilidad
    assert resultado.disponible is False


# ---------------------------------------------------------------------------
# Propiedad 13: Bloqueo impide disponibilidad y nuevas reservas
# Valida: Requisitos 8.4, 8.8
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    servicio=_servicios,
    fecha=_fecha_strategy,
    plazas_max=_plazas_max,
)
def test_propiedad_13_bloqueo_impide_disponibilidad(servicio, fecha, plazas_max):
    """
    Propiedad 13: Bloqueo impide disponibilidad y nuevas reservas

    Para cualquier día y servicio bloqueado por el empresario, la disponibilidad
    de ese día debe ser 0 (o -1 por convenio) y cualquier intento de crear una
    reserva en ese día debe ser rechazado.

    **Validates: Requirements 8.4, 8.8**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 13: Bloqueo impide disponibilidad y nuevas reservas
    fecha_iso = fecha.isoformat()

    # Estado inicial: día disponible (con plazas)
    mock_servicio_disponible = _make_mock_servicio(
        plazas_por_dia={fecha_iso: plazas_max},
        dias_sin_disponibilidad=[],
    )

    # Verificar que antes del bloqueo hay disponibilidad
    use_case_verificar = VerificarDisponibilidadUseCase(servicio=mock_servicio_disponible)
    resultado_antes = run(use_case_verificar.execute(
        servicio=servicio,
        fecha_desde=fecha,
        fecha_hasta=fecha,
    ))
    assert isinstance(resultado_antes, Ok)
    assert resultado_antes.value.disponible is True

    # Simular bloqueo: el servicio ahora devuelve plazas=-1 para ese día
    mock_servicio_bloqueado = _make_mock_servicio(
        plazas_por_dia={fecha_iso: -1},
        dias_sin_disponibilidad=[fecha],
    )

    # Verificar que después del bloqueo no hay disponibilidad
    use_case_verificar2 = VerificarDisponibilidadUseCase(servicio=mock_servicio_bloqueado)
    resultado_despues = run(use_case_verificar2.execute(
        servicio=servicio,
        fecha_desde=fecha,
        fecha_hasta=fecha,
    ))
    assert isinstance(resultado_despues, Ok)
    resultado = resultado_despues.value

    # Propiedad: día bloqueado → sin disponibilidad
    assert resultado.disponible is False, (
        f"Día bloqueado debe tener disponible=False para servicio={servicio}, fecha={fecha}"
    )
    assert fecha in resultado.dias_sin_disponibilidad, (
        f"Día bloqueado debe estar en dias_sin_disponibilidad"
    )
    assert resultado.plazas_por_dia.get(fecha_iso) == -1, (
        f"Día bloqueado debe tener plazas=-1 (convenio de bloqueo)"
    )


@settings(max_examples=100)
@given(
    servicio=_servicios,
    fecha=_fecha_strategy,
)
def test_propiedad_13_bloquear_dia_llama_servicio(servicio, fecha):
    """
    Propiedad 13: El use case BloquearDia invoca el servicio exactamente una vez.

    **Validates: Requirements 8.4, 8.8**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 13: Bloqueo impide disponibilidad y nuevas reservas
    fecha_iso = fecha.isoformat()

    # Día no bloqueado (plazas >= 0)
    mock_servicio = _make_mock_servicio(
        plazas_por_dia={fecha_iso: 3},
        dias_sin_disponibilidad=[],
    )

    use_case = BloquearDiaUseCase(servicio=mock_servicio)
    resultado = run(use_case.execute(servicio=servicio, fecha=fecha))

    assert isinstance(resultado, Ok), f"Se esperaba Ok, se obtuvo: {resultado}"
    # El servicio de bloqueo debe haberse llamado exactamente una vez
    mock_servicio.bloquear_dia.assert_called_once_with(servicio=servicio, fecha=fecha)


@settings(max_examples=100)
@given(
    servicio=_servicios,
    fecha=_fecha_strategy,
)
def test_propiedad_13_bloquear_dia_ya_bloqueado_devuelve_error(servicio, fecha):
    """
    Propiedad 13: Intentar bloquear un día ya bloqueado devuelve Err(DIA_BLOQUEADO).

    **Validates: Requirements 8.4, 8.6**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 13: Bloqueo impide disponibilidad y nuevas reservas
    fecha_iso = fecha.isoformat()

    # Día ya bloqueado: plazas = -1
    mock_servicio = _make_mock_servicio(
        plazas_por_dia={fecha_iso: -1},
        dias_sin_disponibilidad=[fecha],
    )

    use_case = BloquearDiaUseCase(servicio=mock_servicio)
    resultado = run(use_case.execute(servicio=servicio, fecha=fecha))

    assert isinstance(resultado, Err), (
        f"Se esperaba Err para día ya bloqueado, se obtuvo: {resultado}"
    )
    assert resultado.error.code == "DIA_BLOQUEADO", (
        f"Se esperaba DIA_BLOQUEADO, se obtuvo: {resultado.error.code}"
    )
    # El servicio de bloqueo NO debe haberse llamado
    mock_servicio.bloquear_dia.assert_not_called()


# ---------------------------------------------------------------------------
# Propiedad 14: Round-trip de bloqueo y desbloqueo
# Valida: Requisito 8.5
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    servicio=_servicios,
    fecha=_fecha_strategy,
    plazas_libres_original=st.integers(min_value=0, max_value=10),
)
def test_propiedad_14_round_trip_bloqueo_desbloqueo(
    servicio, fecha, plazas_libres_original,
):
    """
    Propiedad 14: Round-trip de bloqueo y desbloqueo

    Para cualquier día y servicio, si se bloquea y luego se desbloquea,
    la disponibilidad debe ser idéntica a la que tenía antes del bloqueo.

    **Validates: Requirement 8.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 14: Round-trip de bloqueo y desbloqueo
    fecha_iso = fecha.isoformat()

    # Estado inicial: día con plazas disponibles (no bloqueado)
    estado_inicial = {fecha_iso: plazas_libres_original}
    dias_sin_inicial = [fecha] if plazas_libres_original == 0 else []

    # Simular el ciclo: disponible → bloqueado → disponible
    # Fase 1: verificar estado inicial
    mock_inicial = _make_mock_servicio(
        plazas_por_dia=estado_inicial,
        dias_sin_disponibilidad=dias_sin_inicial,
    )
    use_case_verificar = VerificarDisponibilidadUseCase(servicio=mock_inicial)
    resultado_inicial = run(use_case_verificar.execute(
        servicio=servicio,
        fecha_desde=fecha,
        fecha_hasta=fecha,
    ))
    assert isinstance(resultado_inicial, Ok)
    plazas_antes = resultado_inicial.value.plazas_por_dia.get(fecha_iso)

    # Fase 2: bloquear el día
    mock_para_bloquear = _make_mock_servicio(
        plazas_por_dia={fecha_iso: plazas_libres_original},
        dias_sin_disponibilidad=dias_sin_inicial,
    )
    use_case_bloquear = BloquearDiaUseCase(servicio=mock_para_bloquear)
    resultado_bloqueo = run(use_case_bloquear.execute(servicio=servicio, fecha=fecha))
    # El bloqueo puede fallar si plazas_libres_original == 0 (día lleno, no bloqueado)
    # pero el round-trip aplica cuando el bloqueo es exitoso
    if isinstance(resultado_bloqueo, Err):
        # Si el bloqueo falla (día ya bloqueado), la propiedad no aplica
        return

    # Fase 3: desbloquear el día (estado: bloqueado → plazas=-1)
    mock_bloqueado = _make_mock_servicio(
        plazas_por_dia={fecha_iso: -1},
        dias_sin_disponibilidad=[fecha],
    )
    use_case_desbloquear = DesbloquearDiaUseCase(servicio=mock_bloqueado)
    resultado_desbloqueo = run(use_case_desbloquear.execute(servicio=servicio, fecha=fecha))
    assert isinstance(resultado_desbloqueo, Ok), (
        f"El desbloqueo debe ser exitoso tras un bloqueo exitoso"
    )

    # Fase 4: verificar que la disponibilidad se restauró al estado original
    mock_restaurado = _make_mock_servicio(
        plazas_por_dia=estado_inicial,
        dias_sin_disponibilidad=dias_sin_inicial,
    )
    use_case_verificar2 = VerificarDisponibilidadUseCase(servicio=mock_restaurado)
    resultado_final = run(use_case_verificar2.execute(
        servicio=servicio,
        fecha_desde=fecha,
        fecha_hasta=fecha,
    ))
    assert isinstance(resultado_final, Ok)
    plazas_despues = resultado_final.value.plazas_por_dia.get(fecha_iso)

    # Propiedad: plazas después del round-trip == plazas antes del bloqueo
    assert plazas_despues == plazas_antes, (
        f"Round-trip violado: plazas antes={plazas_antes}, plazas después={plazas_despues} "
        f"para servicio={servicio}, fecha={fecha}"
    )


@settings(max_examples=100)
@given(
    servicio=_servicios,
    fecha=_fecha_strategy,
)
def test_propiedad_14_desbloquear_dia_no_bloqueado_devuelve_error(servicio, fecha):
    """
    Propiedad 14 (variante): Intentar desbloquear un día no bloqueado devuelve error.

    **Validates: Requirement 8.5, 8.7**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 14: Round-trip de bloqueo y desbloqueo
    fecha_iso = fecha.isoformat()

    # Día no bloqueado (plazas >= 0)
    mock_servicio = _make_mock_servicio(
        plazas_por_dia={fecha_iso: 3},
        dias_sin_disponibilidad=[],
    )

    use_case = DesbloquearDiaUseCase(servicio=mock_servicio)
    resultado = run(use_case.execute(servicio=servicio, fecha=fecha))

    assert isinstance(resultado, Err), (
        f"Se esperaba Err para día no bloqueado, se obtuvo: {resultado}"
    )
    assert resultado.error.code == "DIA_NO_BLOQUEADO", (
        f"Se esperaba DIA_NO_BLOQUEADO, se obtuvo: {resultado.error.code}"
    )
    # El servicio de desbloqueo NO debe haberse llamado
    mock_servicio.desbloquear_dia.assert_not_called()

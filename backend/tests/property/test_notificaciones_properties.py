"""
Tests de propiedad para el módulo de notificaciones.

# Feature: sistema-reservas-guarderia-canina, Propiedad 8: Notificaciones por cambio de estado
# Feature: sistema-reservas-guarderia-canina, Propiedad 9: Resiliencia ante fallos de notificación

Usa hypothesis con mocks para el servicio de email.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, call

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from modules.notificaciones.application.enviar_notificacion import (
    EnviarNotificacionCancelacion,
    EnviarNotificacionConfirmacion,
    EnviarNotificacionNuevaReserva,
    EnviarNotificacionRechazo,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def run(coro):
    """Ejecuta una corrutina en el event loop."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Estrategias
# ---------------------------------------------------------------------------

_reserva_id = st.uuids().map(str)
_servicio = st.sampled_from(["paseos", "guarderia", "alojamiento"])
_fecha_str = st.dates(
    min_value=__import__("datetime").date(2025, 1, 1),
    max_value=__import__("datetime").date(2027, 12, 31),
).map(lambda d: d.isoformat())


@st.composite
def _reserva_dict(draw):
    """Genera un diccionario de reserva con datos mínimos."""
    return {
        "id": draw(_reserva_id),
        "servicio": draw(_servicio),
        "fecha_desde": draw(_fecha_str),
        "fecha_hasta": draw(_fecha_str),
        "email": "cliente@test.com",  # No PII real en tests
        "estado": "pendiente",
    }


# ---------------------------------------------------------------------------
# Propiedad 8: Notificaciones por cambio de estado
# Valida: Requisitos 6.1, 6.2, 6.3, 6.4, 6.5
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(reserva=_reserva_dict())
def test_propiedad_8_nueva_reserva_invoca_servicio_exactamente_una_vez(reserva):
    """
    Propiedad 8: Notificaciones por cambio de estado — Nueva reserva

    Al crear una nueva reserva, el servicio de notificaciones debe ser
    invocado exactamente una vez para el cliente y una vez para el empresario.

    **Validates: Requirements 6.1, 6.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 8: Notificaciones por cambio de estado
    mock_servicio = MagicMock()
    mock_servicio.notificar_nueva_reserva = AsyncMock()
    mock_servicio.notificar_empresario = AsyncMock()

    use_case = EnviarNotificacionNuevaReserva(servicio=mock_servicio)
    run(use_case.execute(reserva))

    # El servicio debe haberse invocado exactamente una vez para el cliente
    mock_servicio.notificar_nueva_reserva.assert_called_once_with(reserva)

    # Y exactamente una vez para el empresario
    mock_servicio.notificar_empresario.assert_called_once_with(
        reserva, evento="nueva_reserva"
    )


@settings(max_examples=100)
@given(reserva=_reserva_dict())
def test_propiedad_8_confirmacion_invoca_servicio_exactamente_una_vez(reserva):
    """
    Propiedad 8: Notificaciones por cambio de estado — Confirmación

    Al confirmar una reserva, el servicio de notificaciones debe ser
    invocado exactamente una vez con los datos correctos.

    **Validates: Requirements 6.2**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 8: Notificaciones por cambio de estado
    mock_servicio = MagicMock()
    mock_servicio.notificar_confirmacion = AsyncMock()

    use_case = EnviarNotificacionConfirmacion(servicio=mock_servicio)
    run(use_case.execute(reserva))

    mock_servicio.notificar_confirmacion.assert_called_once_with(reserva)


@settings(max_examples=100)
@given(reserva=_reserva_dict())
def test_propiedad_8_rechazo_invoca_servicio_exactamente_una_vez(reserva):
    """
    Propiedad 8: Notificaciones por cambio de estado — Rechazo

    Al rechazar una reserva, el servicio de notificaciones debe ser
    invocado exactamente una vez.

    **Validates: Requirements 6.3**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 8: Notificaciones por cambio de estado
    mock_servicio = MagicMock()
    mock_servicio.notificar_rechazo = AsyncMock()

    use_case = EnviarNotificacionRechazo(servicio=mock_servicio)
    run(use_case.execute(reserva))

    mock_servicio.notificar_rechazo.assert_called_once_with(reserva)


@settings(max_examples=100)
@given(reserva=_reserva_dict())
def test_propiedad_8_cancelacion_invoca_servicio_exactamente_una_vez(reserva):
    """
    Propiedad 8: Notificaciones por cambio de estado — Cancelación

    Al cancelar una reserva, el servicio de notificaciones debe ser
    invocado exactamente una vez.

    **Validates: Requirements 6.4**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 8: Notificaciones por cambio de estado
    mock_servicio = MagicMock()
    mock_servicio.notificar_cancelacion = AsyncMock()

    use_case = EnviarNotificacionCancelacion(servicio=mock_servicio)
    run(use_case.execute(reserva))

    mock_servicio.notificar_cancelacion.assert_called_once_with(reserva)


# ---------------------------------------------------------------------------
# Propiedad 9: Resiliencia ante fallos de notificación
# Valida: Requisito 6.6
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(reserva=_reserva_dict())
def test_propiedad_9_fallo_email_no_propaga_excepcion_nueva_reserva(reserva):
    """
    Propiedad 9: Resiliencia ante fallos — Nueva reserva

    Si el servicio de email falla al notificar una nueva reserva,
    el use case NO debe propagar la excepción. La reserva queda registrada.

    **Validates: Requirement 6.6**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 9: Resiliencia ante fallos de notificación
    mock_servicio = MagicMock()
    mock_servicio.notificar_nueva_reserva = AsyncMock(
        side_effect=Exception("SMTP connection failed")
    )
    mock_servicio.notificar_empresario = AsyncMock(
        side_effect=Exception("SMTP connection failed")
    )

    use_case = EnviarNotificacionNuevaReserva(servicio=mock_servicio)

    # No debe lanzar excepción aunque el servicio falle
    try:
        run(use_case.execute(reserva))
    except Exception as exc:
        pytest.fail(
            f"El use case no debe propagar excepciones de notificación, "
            f"pero lanzó: {type(exc).__name__}: {exc}"
        )


@settings(max_examples=100)
@given(reserva=_reserva_dict())
def test_propiedad_9_fallo_email_no_propaga_excepcion_confirmacion(reserva):
    """
    Propiedad 9: Resiliencia ante fallos — Confirmación

    Si el servicio de email falla al notificar una confirmación,
    el use case NO debe propagar la excepción.

    **Validates: Requirement 6.6**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 9: Resiliencia ante fallos de notificación
    mock_servicio = MagicMock()
    mock_servicio.notificar_confirmacion = AsyncMock(
        side_effect=RuntimeError("Email service unavailable")
    )

    use_case = EnviarNotificacionConfirmacion(servicio=mock_servicio)

    try:
        run(use_case.execute(reserva))
    except Exception as exc:
        pytest.fail(
            f"El use case de confirmación no debe propagar excepciones: "
            f"{type(exc).__name__}: {exc}"
        )


@settings(max_examples=100)
@given(reserva=_reserva_dict())
def test_propiedad_9_fallo_email_no_propaga_excepcion_rechazo(reserva):
    """
    Propiedad 9: Resiliencia ante fallos — Rechazo

    Si el servicio de email falla al notificar un rechazo,
    el use case NO debe propagar la excepción.

    **Validates: Requirement 6.6**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 9: Resiliencia ante fallos de notificación
    mock_servicio = MagicMock()
    mock_servicio.notificar_rechazo = AsyncMock(
        side_effect=ConnectionError("Cannot connect to SMTP")
    )

    use_case = EnviarNotificacionRechazo(servicio=mock_servicio)

    try:
        run(use_case.execute(reserva))
    except Exception as exc:
        pytest.fail(
            f"El use case de rechazo no debe propagar excepciones: "
            f"{type(exc).__name__}: {exc}"
        )


@settings(max_examples=100)
@given(reserva=_reserva_dict())
def test_propiedad_9_fallo_email_no_propaga_excepcion_cancelacion(reserva):
    """
    Propiedad 9: Resiliencia ante fallos — Cancelación

    Si el servicio de email falla al notificar una cancelación,
    el use case NO debe propagar la excepción.

    **Validates: Requirement 6.6**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 9: Resiliencia ante fallos de notificación
    mock_servicio = MagicMock()
    mock_servicio.notificar_cancelacion = AsyncMock(
        side_effect=TimeoutError("SMTP timeout")
    )

    use_case = EnviarNotificacionCancelacion(servicio=mock_servicio)

    try:
        run(use_case.execute(reserva))
    except Exception as exc:
        pytest.fail(
            f"El use case de cancelación no debe propagar excepciones: "
            f"{type(exc).__name__}: {exc}"
        )


@settings(max_examples=100)
@given(reserva=_reserva_dict())
def test_propiedad_9_servicio_invocado_aunque_falle(reserva):
    """
    Propiedad 9: El servicio de notificación es invocado aunque falle.

    Verificar que el use case intenta enviar la notificación (no la omite)
    aunque el servicio lance una excepción.

    **Validates: Requirement 6.6**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 9: Resiliencia ante fallos de notificación
    mock_servicio = MagicMock()
    mock_servicio.notificar_confirmacion = AsyncMock(
        side_effect=Exception("Fallo simulado")
    )

    use_case = EnviarNotificacionConfirmacion(servicio=mock_servicio)
    run(use_case.execute(reserva))

    # El servicio debe haberse intentado invocar (aunque fallara)
    mock_servicio.notificar_confirmacion.assert_called_once_with(reserva)

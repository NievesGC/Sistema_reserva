"""
Tests de propiedad para seguridad, logs y resiliencia.

# Feature: sistema-reservas-guarderia-canina, Propiedad 21: Logs sin datos personales identificables
# Feature: sistema-reservas-guarderia-canina, Propiedad 22: Resiliencia ante fallo de base de datos

Usa hypothesis para verificar que el logger enmascara PII y que los
errores de BD devuelven respuestas controladas.
"""

from __future__ import annotations

import json
import logging
from io import StringIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from shared.infrastructure.logger import _PII_FIELDS, _mask_value, _sanitize_extra, get_logger


# ---------------------------------------------------------------------------
# Estrategias
# ---------------------------------------------------------------------------

_pii_field_names = st.sampled_from(sorted(_PII_FIELDS))

_email_strategy = st.builds(
    lambda u, d: f"{u}@{d}.com",
    u=st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=1, max_size=10),
    d=st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=2, max_size=8),
)

_telefono_strategy = st.text(
    alphabet="0123456789",
    min_size=6,
    max_size=12,
)

_nombre_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Lu", "Ll"), whitelist_characters=" "),
    min_size=3,
    max_size=50,
)

_pii_values = st.one_of(
    _email_strategy,
    _telefono_strategy,
    _nombre_strategy,
)

_non_pii_values = st.one_of(
    st.integers(min_value=0, max_value=9999).map(str),
    st.uuids().map(str),
    st.sampled_from(["paseos", "guarderia", "alojamiento", "pendiente", "confirmada"]),
)


# ---------------------------------------------------------------------------
# Propiedad 21: Logs sin datos personales identificables
# Valida: Requisito 12.5
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    campo_pii=_pii_field_names,
    valor_pii=_pii_values,
)
def test_propiedad_21_logger_enmascara_pii_en_error(campo_pii, valor_pii):
    """
    Propiedad 21: Logs sin datos personales identificables — ERROR

    Para cualquier campo PII (email, telefono, nombre, direccion, etc.),
    el logger debe enmascarar el valor en logs de nivel ERROR.
    El valor original no debe aparecer en el log.

    **Validates: Requirement 12.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 21: Logs sin datos personales identificables
    extra = {campo_pii: valor_pii}
    sanitizado = _sanitize_extra(logging.ERROR, extra)

    valor_sanitizado = sanitizado.get(campo_pii)

    # El valor sanitizado no debe ser igual al original
    assert valor_sanitizado != valor_pii, (
        f"Campo PII '{campo_pii}' no fue enmascarado en ERROR: "
        f"original='{valor_pii}', sanitizado='{valor_sanitizado}'"
    )

    # El valor sanitizado debe contener '***' (indicador de enmascaramiento)
    assert "***" in str(valor_sanitizado), (
        f"Campo PII '{campo_pii}' debe contener '***' tras enmascarar: "
        f"sanitizado='{valor_sanitizado}'"
    )


@settings(max_examples=100)
@given(
    campo_pii=_pii_field_names,
    valor_pii=_pii_values,
)
def test_propiedad_21_logger_enmascara_pii_en_warning(campo_pii, valor_pii):
    """
    Propiedad 21: Logs sin datos personales identificables — WARNING

    El logger también debe enmascarar PII en logs de nivel WARNING.

    **Validates: Requirement 12.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 21: Logs sin datos personales identificables
    extra = {campo_pii: valor_pii}
    sanitizado = _sanitize_extra(logging.WARNING, extra)

    valor_sanitizado = sanitizado.get(campo_pii)

    assert valor_sanitizado != valor_pii, (
        f"Campo PII '{campo_pii}' no fue enmascarado en WARNING"
    )
    assert "***" in str(valor_sanitizado)


@settings(max_examples=100)
@given(
    campo_pii=_pii_field_names,
    valor_pii=_pii_values,
)
def test_propiedad_21_logger_no_enmascara_pii_en_info(campo_pii, valor_pii):
    """
    Propiedad 21 (inversa): En nivel INFO, los valores PII NO se enmascaran.

    El enmascaramiento solo aplica a ERROR y WARNING.

    **Validates: Requirement 12.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 21: Logs sin datos personales identificables
    extra = {campo_pii: valor_pii}
    sanitizado = _sanitize_extra(logging.INFO, extra)

    valor_sanitizado = sanitizado.get(campo_pii)

    # En INFO, el valor no debe ser enmascarado
    assert valor_sanitizado == valor_pii, (
        f"Campo PII '{campo_pii}' no debe enmascararse en INFO: "
        f"original='{valor_pii}', sanitizado='{valor_sanitizado}'"
    )


@settings(max_examples=100)
@given(
    campo_no_pii=st.sampled_from(["reserva_id", "servicio", "estado", "error_type", "path"]),
    valor=_non_pii_values,
    nivel=st.sampled_from([logging.ERROR, logging.WARNING]),
)
def test_propiedad_21_campos_no_pii_no_se_enmascaran(campo_no_pii, valor, nivel):
    """
    Propiedad 21 (variante): Campos que no son PII no se enmascaran en ningún nivel.

    **Validates: Requirement 12.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 21: Logs sin datos personales identificables
    extra = {campo_no_pii: valor}
    sanitizado = _sanitize_extra(nivel, extra)

    valor_sanitizado = sanitizado.get(campo_no_pii)

    assert valor_sanitizado == valor, (
        f"Campo no-PII '{campo_no_pii}' no debe enmascararse: "
        f"original='{valor}', sanitizado='{valor_sanitizado}'"
    )


@settings(max_examples=100)
@given(
    email=_email_strategy,
)
def test_propiedad_21_email_enmascarado_correctamente(email):
    """
    Propiedad 21: El email se enmascara preservando el formato user@***.***

    **Validates: Requirement 12.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 21: Logs sin datos personales identificables
    enmascarado = _mask_value("email", email)

    # Debe contener @ y ***
    assert "@" in enmascarado, f"Email enmascarado debe contener @: {enmascarado}"
    assert "***" in enmascarado, f"Email enmascarado debe contener ***: {enmascarado}"

    # No debe contener el dominio original
    if "@" in email:
        dominio_original = email.split("@")[1]
        assert dominio_original not in enmascarado, (
            f"Dominio original '{dominio_original}' no debe aparecer en el email enmascarado"
        )


# ---------------------------------------------------------------------------
# Propiedad 22: Resiliencia ante fallo de base de datos
# Valida: Requisito 13.4
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    servicio=st.sampled_from(["paseos", "guarderia", "alojamiento"]),
    error_msg=st.sampled_from([
        "SUPABASE_URL no configurada",
        "Connection refused",
        "timeout",
        "SUPABASE_KEY no configurada",
    ]),
)
def test_propiedad_22_error_bd_devuelve_resultado_controlado(servicio, error_msg):
    """
    Propiedad 22: Resiliencia ante fallo de base de datos

    Para cualquier fallo de conexión con la base de datos durante la
    consulta de disponibilidad, el sistema debe devolver un resultado
    controlado (Err con ERROR_BD) en lugar de propagar la excepción.

    **Validates: Requirement 13.4**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 22: Resiliencia ante fallo de base de datos
    import asyncio
    from datetime import date, timedelta

    from modules.disponibilidad.application.verificar_disponibilidad import (
        VerificarDisponibilidadUseCase,
    )
    from shared.domain.result import Err

    # Mock del servicio de disponibilidad que lanza excepción (simula fallo de BD)
    mock_servicio = MagicMock()
    mock_servicio.verificar_disponibilidad_rango = AsyncMock(
        side_effect=RuntimeError(error_msg)
    )

    use_case = VerificarDisponibilidadUseCase(servicio=mock_servicio)

    fecha_desde = date.today() + timedelta(days=1)
    fecha_hasta = fecha_desde + timedelta(days=2)

    resultado = asyncio.get_event_loop().run_until_complete(
        use_case.execute(
            servicio=servicio,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
        )
    )

    # Propiedad: debe devolver Err controlado, no propagar la excepción
    assert isinstance(resultado, Err), (
        f"Fallo de BD debe devolver Err, se obtuvo: {type(resultado).__name__}"
    )
    assert resultado.error.code == "ERROR_BD", (
        f"Se esperaba ERROR_BD, se obtuvo: {resultado.error.code}"
    )
    assert resultado.error.http_status == 503, (
        f"ERROR_BD debe tener HTTP 503, se obtuvo: {resultado.error.http_status}"
    )


@settings(max_examples=100)
@given(
    error_type=st.sampled_from([
        "ConnectionError",
        "TimeoutError",
        "RuntimeError",
        "Exception",
    ]),
)
def test_propiedad_22_crear_reserva_fallo_bd_devuelve_err(error_type):
    """
    Propiedad 22: Resiliencia ante fallo de BD en CrearReserva

    Si la BD falla durante la creación de una reserva, el use case
    debe devolver Err(ERROR_BD) sin propagar la excepción.

    **Validates: Requirement 13.4**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 22: Resiliencia ante fallo de base de datos
    import asyncio
    from datetime import date, timedelta

    from modules.disponibilidad.domain.disponibilidad import ResultadoDisponibilidad
    from modules.precios.domain.calculador_precio import DesglosePrecio
    from modules.precios.domain.tarifa import ConfiguracionPrecios
    from modules.reservas.application.crear_reserva import CrearReservaUseCase
    from shared.domain.result import Err

    # Mock repositorio de reservas que falla
    mock_reserva_repo = MagicMock()
    mock_reserva_repo.crear = AsyncMock(
        side_effect=RuntimeError("BD connection failed")
    )

    # Mock disponibilidad que funciona
    mock_disponibilidad = MagicMock()
    mock_disponibilidad.verificar_disponibilidad_rango = AsyncMock(
        return_value=ResultadoDisponibilidad(
            disponible=True,
            plazas_por_dia={},
            dias_sin_disponibilidad=[],
        )
    )
    mock_disponibilidad.reservar_plazas = AsyncMock()

    # Mock precios que funciona
    mock_precios_repo = MagicMock()
    config = ConfiguracionPrecios(
        servicio="paseos",
        precio_normal=25.0,
        precio_cachorros=20.0,
        precio_festivo=5.0,
        precio_perro_extra=10.0,
        plazas_max=5,
    )
    mock_precios_repo.obtener_configuracion = AsyncMock(return_value=config)

    mock_festivos_repo = MagicMock()
    mock_festivos_repo.listar_festivos = AsyncMock(return_value=[])

    mock_notificaciones = MagicMock()
    mock_notificaciones.notificar_nueva_reserva = AsyncMock()
    mock_notificaciones.notificar_empresario = AsyncMock()

    use_case = CrearReservaUseCase(
        reserva_repo=mock_reserva_repo,
        disponibilidad_service=mock_disponibilidad,
        precios_repo=mock_precios_repo,
        festivos_repo=mock_festivos_repo,
        notificaciones_service=mock_notificaciones,
    )

    hoy = date.today()
    datos = {
        "servicio": "paseos",
        "fecha_desde": hoy + timedelta(days=1),
        "fecha_hasta": hoy + timedelta(days=3),
        "tarifa": "normal",
        "tramo_horario": "mañana",
        "perro_extra": False,
        "transporte": None,
        "acepta_privacidad": True,
        "cliente": {
            "nombre": "Test",
            "telefono": "612345678",
            "email": "test@test.com",
        },
        "mascota": {
            "nombre": "Rex",
            "tamano": "mediano",
        },
    }

    # El use case debe manejar el error de BD sin propagar excepción
    try:
        resultado = asyncio.get_event_loop().run_until_complete(use_case.execute(datos))
        # Si llega aquí, debe ser un Err controlado
        assert isinstance(resultado, Err), (
            f"Fallo de BD debe devolver Err, se obtuvo Ok"
        )
    except Exception as exc:
        pytest.fail(
            f"El use case no debe propagar excepciones de BD: "
            f"{type(exc).__name__}: {exc}"
        )

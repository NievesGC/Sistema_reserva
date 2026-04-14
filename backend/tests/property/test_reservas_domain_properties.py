"""
Tests de propiedad para el dominio de reservas.

# Feature: sistema-reservas-guarderia-canina, Propiedad 1: Validación de fechas por servicio
# Feature: sistema-reservas-guarderia-canina, Propiedad 3: Fechas pasadas no son reservables
# Feature: sistema-reservas-guarderia-canina, Propiedad 5: Validación de campos obligatorios
# Feature: sistema-reservas-guarderia-canina, Propiedad 25: Dirección obligatoria con transporte de recogida

Solo usa el dominio puro — sin dependencias externas ni mocks.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from modules.reservas.domain.reserva import (
    DatosCliente,
    DatosMascota,
    TipoServicio,
    TipoTransporte,
    validar_campos_obligatorios,
    validar_direccion_recogida,
    validar_fecha_no_pasada,
    validar_fechas,
)
from shared.domain.result import DomainError


# ---------------------------------------------------------------------------
# Estrategias
# ---------------------------------------------------------------------------

_servicios_dias = st.sampled_from(["paseos", "guarderia"])
_servicio_alojamiento = st.just("alojamiento")
_servicios_todos = st.sampled_from(["paseos", "guarderia", "alojamiento"])

_fecha_futura = st.dates(
    min_value=date.today() + timedelta(days=1),
    max_value=date(2027, 12, 31),
)
_fecha_pasada = st.dates(
    min_value=date(2000, 1, 1),
    max_value=date.today() - timedelta(days=1),
)
_fecha_hoy = st.just(date.today())

_texto_valido = st.text(
    alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"), whitelist_characters=" "),
    min_size=1,
    max_size=50,
)
_email_valido = st.builds(
    lambda u, d: f"{u}@{d}.com",
    u=st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=1, max_size=10),
    d=st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=2, max_size=8),
)
_telefono_valido = st.text(
    alphabet="0123456789",
    min_size=9,
    max_size=12,
)
_direccion_valida = st.text(
    alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"), whitelist_characters=" ,.-"),
    min_size=5,
    max_size=100,
)

_transportes_con_recogida = st.sampled_from([
    TipoTransporte.RECOGIDA.value,
    TipoTransporte.RECOGIDA_ENTREGA.value,
])
_transportes_sin_recogida = st.sampled_from([
    TipoTransporte.SIN_TRANSPORTE.value,
    None,
])


def _make_cliente(nombre="Juan García", telefono="612345678", email="juan@test.com", direccion=None):
    return DatosCliente(nombre=nombre, telefono=telefono, email=email, direccion=direccion)


def _make_mascota(nombre="Rex", tamano="mediano"):
    return DatosMascota(nombre=nombre, tamano=tamano)


# ---------------------------------------------------------------------------
# Propiedad 1: Validación de fechas por servicio
# Valida: Requisitos 2.3, 2.4, 2.5
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    fecha_desde=_fecha_futura,
    offset=st.integers(min_value=1, max_value=30),
)
def test_propiedad_1_alojamiento_requiere_fechas_distintas(fecha_desde, offset):
    """
    Propiedad 1: Validación de fechas — Alojamiento

    Para Alojamiento, fecha_desde debe ser estrictamente anterior a fecha_hasta.
    Si fecha_desde == fecha_hasta, debe rechazarse con FECHA_INVALIDA.

    **Validates: Requirements 2.3, 2.4, 2.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 1: Validación de fechas por servicio
    fecha_hasta_valida = fecha_desde + timedelta(days=offset)

    # Caso válido: fecha_desde < fecha_hasta
    error = validar_fechas("alojamiento", fecha_desde, fecha_hasta_valida)
    assert error is None, (
        f"Alojamiento con fechas válidas ({fecha_desde} → {fecha_hasta_valida}) "
        f"no debe dar error, pero se obtuvo: {error}"
    )

    # Caso inválido: fecha_desde == fecha_hasta (0 noches)
    error_igual = validar_fechas("alojamiento", fecha_desde, fecha_desde)
    assert error_igual is not None, (
        f"Alojamiento con fecha_desde == fecha_hasta debe dar error"
    )
    assert error_igual.code == "FECHA_INVALIDA"
    assert error_igual.http_status == 400


@settings(max_examples=100)
@given(
    fecha_desde=_fecha_futura,
    offset=st.integers(min_value=1, max_value=30),
)
def test_propiedad_1_alojamiento_rechaza_fecha_hasta_anterior(fecha_desde, offset):
    """
    Propiedad 1: Alojamiento rechaza fecha_hasta anterior a fecha_desde.

    **Validates: Requirements 2.3, 2.4, 2.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 1: Validación de fechas por servicio
    fecha_hasta_invalida = fecha_desde - timedelta(days=offset)

    error = validar_fechas("alojamiento", fecha_desde, fecha_hasta_invalida)
    assert error is not None, (
        f"Alojamiento con fecha_hasta anterior debe dar error"
    )
    assert error.code == "FECHA_INVALIDA"


@settings(max_examples=100)
@given(
    servicio=_servicios_dias,
    fecha_desde=_fecha_futura,
    offset=st.integers(min_value=0, max_value=30),
)
def test_propiedad_1_paseos_guarderia_permite_mismo_dia(servicio, fecha_desde, offset):
    """
    Propiedad 1: Paseos y Guardería permiten fecha_desde == fecha_hasta (un día).

    **Validates: Requirements 2.3, 2.4, 2.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 1: Validación de fechas por servicio
    fecha_hasta = fecha_desde + timedelta(days=offset)

    # Caso válido: fecha_desde <= fecha_hasta
    error = validar_fechas(servicio, fecha_desde, fecha_hasta)
    assert error is None, (
        f"{servicio} con fechas válidas ({fecha_desde} → {fecha_hasta}) "
        f"no debe dar error, pero se obtuvo: {error}"
    )


@settings(max_examples=100)
@given(
    servicio=_servicios_dias,
    fecha_desde=_fecha_futura,
    offset=st.integers(min_value=1, max_value=30),
)
def test_propiedad_1_paseos_guarderia_rechaza_fecha_hasta_anterior(servicio, fecha_desde, offset):
    """
    Propiedad 1: Paseos y Guardería rechazan fecha_hasta anterior a fecha_desde.

    **Validates: Requirements 2.3, 2.4, 2.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 1: Validación de fechas por servicio
    fecha_hasta_invalida = fecha_desde - timedelta(days=offset)

    error = validar_fechas(servicio, fecha_desde, fecha_hasta_invalida)
    assert error is not None, (
        f"{servicio} con fecha_hasta anterior debe dar error"
    )
    assert error.code == "FECHA_INVALIDA"
    assert error.http_status == 400


# ---------------------------------------------------------------------------
# Propiedad 3: Fechas pasadas no son reservables
# Valida: Requisito 2.7
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(fecha_desde=_fecha_pasada)
def test_propiedad_3_fecha_pasada_rechazada(fecha_desde):
    """
    Propiedad 3: Fechas pasadas no son reservables

    Para cualquier fecha anterior a hoy, validar_fecha_no_pasada debe
    devolver DomainError con código FECHA_PASADA.

    **Validates: Requirement 2.7**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 3: Fechas pasadas no son reservables
    error = validar_fecha_no_pasada(fecha_desde)

    assert error is not None, (
        f"Fecha pasada {fecha_desde} debe ser rechazada"
    )
    assert error.code == "FECHA_PASADA", (
        f"Se esperaba FECHA_PASADA, se obtuvo: {error.code}"
    )
    assert error.http_status == 400


@settings(max_examples=100)
@given(
    offset=st.integers(min_value=0, max_value=365),
)
def test_propiedad_3_fecha_futura_aceptada(offset):
    """
    Propiedad 3 (inversa): Fechas futuras o de hoy son aceptadas.

    **Validates: Requirement 2.7**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 3: Fechas pasadas no son reservables
    fecha_futura = date.today() + timedelta(days=offset)
    error = validar_fecha_no_pasada(fecha_futura)

    assert error is None, (
        f"Fecha futura/hoy {fecha_futura} no debe ser rechazada, pero se obtuvo: {error}"
    )


# ---------------------------------------------------------------------------
# Propiedad 5: Validación de campos obligatorios
# Valida: Requisitos 5.1, 5.3
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    nombre=_texto_valido,
    telefono=_telefono_valido,
    email=_email_valido,
    nombre_perro=_texto_valido,
)
def test_propiedad_5_campos_completos_aceptados(nombre, telefono, email, nombre_perro):
    """
    Propiedad 5: Campos obligatorios completos son aceptados.

    **Validates: Requirements 5.1, 5.3**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 5: Validación de campos obligatorios
    cliente = _make_cliente(nombre=nombre, telefono=telefono, email=email)
    mascota = _make_mascota(nombre=nombre_perro)

    error = validar_campos_obligatorios(cliente, mascota, acepta_privacidad=True)
    assert error is None, (
        f"Campos completos no deben dar error, pero se obtuvo: {error}"
    )


@settings(max_examples=100)
@given(
    nombre=_texto_valido,
    telefono=_telefono_valido,
    email=_email_valido,
    nombre_perro=_texto_valido,
)
def test_propiedad_5_privacidad_no_aceptada_rechazada(nombre, telefono, email, nombre_perro):
    """
    Propiedad 5: Sin aceptar privacidad, la reserva es rechazada.

    **Validates: Requirements 5.1, 5.3**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 5: Validación de campos obligatorios
    cliente = _make_cliente(nombre=nombre, telefono=telefono, email=email)
    mascota = _make_mascota(nombre=nombre_perro)

    error = validar_campos_obligatorios(cliente, mascota, acepta_privacidad=False)
    assert error is not None, "Sin privacidad aceptada debe dar error"
    assert error.code == "PRIVACIDAD_NO_ACEPTADA"
    assert error.http_status == 400


@settings(max_examples=100)
@given(
    telefono=_telefono_valido,
    email=_email_valido,
    nombre_perro=_texto_valido,
    nombre_vacio=st.one_of(st.just(""), st.just("   ")),
)
def test_propiedad_5_nombre_vacio_rechazado(telefono, email, nombre_perro, nombre_vacio):
    """
    Propiedad 5: Nombre vacío o solo espacios es rechazado.

    **Validates: Requirements 5.1, 5.3**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 5: Validación de campos obligatorios
    cliente = _make_cliente(nombre=nombre_vacio, telefono=telefono, email=email)
    mascota = _make_mascota(nombre=nombre_perro)

    error = validar_campos_obligatorios(cliente, mascota, acepta_privacidad=True)
    assert error is not None, f"Nombre vacío '{nombre_vacio}' debe dar error"
    assert error.code == "CAMPOS_OBLIGATORIOS"


@settings(max_examples=100)
@given(
    nombre=_texto_valido,
    email=_email_valido,
    nombre_perro=_texto_valido,
    telefono_vacio=st.one_of(st.just(""), st.just("   ")),
)
def test_propiedad_5_telefono_vacio_rechazado(nombre, email, nombre_perro, telefono_vacio):
    """
    Propiedad 5: Teléfono vacío es rechazado.

    **Validates: Requirements 5.1, 5.3**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 5: Validación de campos obligatorios
    cliente = _make_cliente(nombre=nombre, telefono=telefono_vacio, email=email)
    mascota = _make_mascota(nombre=nombre_perro)

    error = validar_campos_obligatorios(cliente, mascota, acepta_privacidad=True)
    assert error is not None, f"Teléfono vacío debe dar error"
    assert error.code == "CAMPOS_OBLIGATORIOS"


@settings(max_examples=100)
@given(
    nombre=_texto_valido,
    telefono=_telefono_valido,
    nombre_perro=_texto_valido,
    email_vacio=st.one_of(st.just(""), st.just("   ")),
)
def test_propiedad_5_email_vacio_rechazado(nombre, telefono, nombre_perro, email_vacio):
    """
    Propiedad 5: Email vacío es rechazado.

    **Validates: Requirements 5.1, 5.3**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 5: Validación de campos obligatorios
    cliente = _make_cliente(nombre=nombre, telefono=telefono, email=email_vacio)
    mascota = _make_mascota(nombre=nombre_perro)

    error = validar_campos_obligatorios(cliente, mascota, acepta_privacidad=True)
    assert error is not None, f"Email vacío debe dar error"
    assert error.code == "CAMPOS_OBLIGATORIOS"


@settings(max_examples=100)
@given(
    nombre=_texto_valido,
    telefono=_telefono_valido,
    email=_email_valido,
    nombre_perro_vacio=st.one_of(st.just(""), st.just("   ")),
)
def test_propiedad_5_nombre_perro_vacio_rechazado(nombre, telefono, email, nombre_perro_vacio):
    """
    Propiedad 5: Nombre del perro vacío es rechazado.

    **Validates: Requirements 5.1, 5.3**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 5: Validación de campos obligatorios
    cliente = _make_cliente(nombre=nombre, telefono=telefono, email=email)
    mascota = _make_mascota(nombre=nombre_perro_vacio)

    error = validar_campos_obligatorios(cliente, mascota, acepta_privacidad=True)
    assert error is not None, f"Nombre de perro vacío debe dar error"
    assert error.code == "CAMPOS_OBLIGATORIOS"


# ---------------------------------------------------------------------------
# Propiedad 25: Dirección obligatoria con transporte de recogida
# Valida: Requisito 3.6
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    transporte=_transportes_con_recogida,
    direccion=_direccion_valida,
)
def test_propiedad_25_alojamiento_con_recogida_y_direccion_aceptado(transporte, direccion):
    """
    Propiedad 25: Alojamiento con recogida y dirección válida es aceptado.

    **Validates: Requirement 3.6**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 25: Dirección obligatoria con transporte de recogida
    error = validar_direccion_recogida(
        servicio="alojamiento",
        transporte=transporte,
        direccion=direccion,
    )
    assert error is None, (
        f"Alojamiento con recogida y dirección válida no debe dar error, "
        f"pero se obtuvo: {error}"
    )


@settings(max_examples=100)
@given(
    transporte=_transportes_con_recogida,
    direccion_invalida=st.one_of(st.just(None), st.just(""), st.just("   ")),
)
def test_propiedad_25_alojamiento_con_recogida_sin_direccion_rechazado(
    transporte, direccion_invalida
):
    """
    Propiedad 25: Alojamiento con recogida sin dirección es rechazado.

    Para cualquier reserva de Alojamiento con transporte que incluya recogida,
    si no se proporciona dirección, debe rechazarse con DIRECCION_REQUERIDA.

    **Validates: Requirement 3.6**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 25: Dirección obligatoria con transporte de recogida
    error = validar_direccion_recogida(
        servicio="alojamiento",
        transporte=transporte,
        direccion=direccion_invalida,
    )
    assert error is not None, (
        f"Alojamiento con recogida sin dirección debe dar error "
        f"(transporte={transporte}, direccion={direccion_invalida!r})"
    )
    assert error.code == "DIRECCION_REQUERIDA", (
        f"Se esperaba DIRECCION_REQUERIDA, se obtuvo: {error.code}"
    )
    assert error.http_status == 400


@settings(max_examples=100)
@given(
    servicio=_servicios_dias,
    transporte=_transportes_con_recogida,
    direccion_invalida=st.one_of(st.just(None), st.just("")),
)
def test_propiedad_25_paseos_guarderia_no_requieren_direccion(
    servicio, transporte, direccion_invalida
):
    """
    Propiedad 25 (inversa): Paseos y Guardería no requieren dirección aunque
    se especifique transporte con recogida (el transporte no aplica a estos servicios).

    **Validates: Requirement 3.6**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 25: Dirección obligatoria con transporte de recogida
    error = validar_direccion_recogida(
        servicio=servicio,
        transporte=transporte,
        direccion=direccion_invalida,
    )
    # Para paseos/guardería, la dirección no es obligatoria
    assert error is None, (
        f"{servicio} no debe requerir dirección, pero se obtuvo: {error}"
    )


@settings(max_examples=100)
@given(
    transporte=_transportes_sin_recogida,
    direccion_invalida=st.one_of(st.just(None), st.just("")),
)
def test_propiedad_25_alojamiento_sin_recogida_no_requiere_direccion(
    transporte, direccion_invalida
):
    """
    Propiedad 25 (variante): Alojamiento sin transporte de recogida no requiere dirección.

    **Validates: Requirement 3.6**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 25: Dirección obligatoria con transporte de recogida
    error = validar_direccion_recogida(
        servicio="alojamiento",
        transporte=transporte,
        direccion=direccion_invalida,
    )
    assert error is None, (
        f"Alojamiento sin recogida no debe requerir dirección, pero se obtuvo: {error}"
    )

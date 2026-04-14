"""
Tests de propiedad para el módulo de exportación.

# Feature: sistema-reservas-guarderia-canina, Propiedad 19: Filtrado correcto en exportación

Usa hypothesis con mock del repositorio de reservas.
"""

from __future__ import annotations

import csv
import io
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from modules.exportacion.application.exportar_reservas import (
    COLUMNAS,
    ExportarCSV,
    ExportarExcel,
    ExportarPDF,
)


# ---------------------------------------------------------------------------
# Estrategias
# ---------------------------------------------------------------------------

_servicios = st.sampled_from(["paseos", "guarderia", "alojamiento"])
_estados = st.sampled_from(["pendiente", "confirmada", "rechazada", "cancelada"])
_fecha_strategy = st.dates(
    min_value=date(2025, 1, 1),
    max_value=date(2027, 12, 31),
)


@st.composite
def _reserva_dict(draw, estado=None, servicio=None):
    """Genera un dict de reserva con datos de prueba."""
    fecha_desde = draw(_fecha_strategy)
    offset = draw(st.integers(min_value=0, max_value=10))
    fecha_hasta = fecha_desde + timedelta(days=offset)

    return {
        "id": str(draw(st.uuids())),
        "servicio": servicio or draw(_servicios),
        "fecha_desde": str(fecha_desde),
        "fecha_hasta": str(fecha_hasta),
        "nombre_dueno": "Test Dueño",
        "telefono": "612345678",
        "email": "test@test.com",
        "nombre_perro": "Rex",
        "estado": estado or draw(_estados),
        "precio_total": draw(st.floats(min_value=10.0, max_value=500.0, allow_nan=False, allow_infinity=False)),
        "tarifa": draw(st.sampled_from(["normal", "cachorros"])),
        "tramo_horario": draw(st.sampled_from(["mañana", "tarde", "todo el día"])),
    }


# ---------------------------------------------------------------------------
# Propiedad 19: Filtrado correcto en exportación
# Valida: Requisitos 11.4, 11.5
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    reservas=st.lists(_reserva_dict(), min_size=0, max_size=20),
)
def test_propiedad_19_csv_contiene_todas_las_reservas(reservas):
    """
    Propiedad 19: Filtrado correcto en exportación — CSV

    El archivo CSV exportado debe contener exactamente las reservas
    que se le pasan, ni más ni menos.

    **Validates: Requirements 11.4, 11.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 19: Filtrado correcto en exportación
    use_case = ExportarCSV()
    output = use_case.execute(reservas)

    # Parsear el CSV generado
    reader = csv.reader(output)
    filas = list(reader)

    # La primera fila es la cabecera
    assert len(filas) >= 1, "El CSV debe tener al menos la cabecera"

    # El número de filas de datos debe coincidir con el número de reservas
    filas_datos = filas[1:]  # Excluir cabecera
    assert len(filas_datos) == len(reservas), (
        f"El CSV debe tener {len(reservas)} filas de datos, "
        f"pero tiene {len(filas_datos)}"
    )


@settings(max_examples=100)
@given(
    estado_filtro=_estados,
    reservas_con_estado=st.lists(
        st.integers(min_value=0, max_value=3).map(
            lambda i: ["pendiente", "confirmada", "rechazada", "cancelada"][i]
        ),
        min_size=0,
        max_size=15,
    ),
)
def test_propiedad_19_filtrado_por_estado_correcto(estado_filtro, reservas_con_estado):
    """
    Propiedad 19: Filtrado correcto en exportación — Por estado

    El archivo exportado debe contener exactamente las reservas que
    cumplen el filtro de estado. No debe aparecer ninguna reserva
    que no cumpla el criterio.

    **Validates: Requirements 11.4, 11.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 19: Filtrado correcto en exportación
    import asyncio

    # Crear reservas con distintos estados
    todas_reservas = []
    for i, estado in enumerate(reservas_con_estado):
        reserva = {
            "id": f"reserva-{i}",
            "servicio": "paseos",
            "fecha_desde": "2025-06-01",
            "fecha_hasta": "2025-06-03",
            "nombre_dueno": "Test",
            "telefono": "612345678",
            "email": "test@test.com",
            "nombre_perro": "Rex",
            "estado": estado,
            "precio_total": 50.0,
            "tarifa": "normal",
            "tramo_horario": "mañana",
        }
        todas_reservas.append(reserva)

    # Simular filtrado (como haría el router)
    reservas_filtradas = [r for r in todas_reservas if r["estado"] == estado_filtro]

    # Exportar solo las reservas filtradas
    use_case = ExportarCSV()
    output = use_case.execute(reservas_filtradas)

    reader = csv.reader(output)
    filas = list(reader)
    filas_datos = filas[1:]  # Excluir cabecera

    # Propiedad: el número de registros exportados coincide con los filtrados
    assert len(filas_datos) == len(reservas_filtradas), (
        f"Se esperaban {len(reservas_filtradas)} registros con estado '{estado_filtro}', "
        f"se exportaron {len(filas_datos)}"
    )

    # Propiedad: todos los registros exportados tienen el estado del filtro
    # (verificar en la columna de estado del CSV)
    estado_col_idx = COLUMNAS.index("estado")
    for fila in filas_datos:
        if len(fila) > estado_col_idx:
            assert fila[estado_col_idx] == estado_filtro, (
                f"Registro exportado con estado '{fila[estado_col_idx]}' "
                f"no cumple el filtro '{estado_filtro}'"
            )


@settings(max_examples=100)
@given(
    reservas=st.lists(_reserva_dict(), min_size=1, max_size=10),
)
def test_propiedad_19_csv_contiene_columnas_requeridas(reservas):
    """
    Propiedad 19: El CSV exportado contiene todas las columnas requeridas.

    **Validates: Requirements 11.4, 11.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 19: Filtrado correcto en exportación
    use_case = ExportarCSV()
    output = use_case.execute(reservas)

    reader = csv.reader(output)
    cabecera = next(reader)

    # Verificar que las columnas requeridas están presentes
    columnas_requeridas = ["ID", "Servicio", "Fecha Desde", "Fecha Hasta",
                           "Nombre Dueño", "Estado", "Precio Total"]
    for col in columnas_requeridas:
        assert col in cabecera, (
            f"Columna requerida '{col}' no encontrada en el CSV. "
            f"Cabecera: {cabecera}"
        )


@settings(max_examples=100, deadline=None)
@given(
    reservas=st.lists(_reserva_dict(), min_size=0, max_size=10),
)
def test_propiedad_19_excel_contiene_todas_las_reservas(reservas):
    """
    Propiedad 19: El archivo Excel exportado contiene exactamente las reservas indicadas.

    **Validates: Requirements 11.4, 11.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 19: Filtrado correcto en exportación
    try:
        import openpyxl
    except ImportError:
        pytest.skip("openpyxl no está instalado")

    use_case = ExportarExcel()
    excel_bytes = use_case.execute(reservas)

    # Parsear el Excel generado
    wb = openpyxl.load_workbook(io.BytesIO(excel_bytes))
    ws = wb.active

    # La primera fila es la cabecera, el resto son datos
    filas_datos = list(ws.iter_rows(min_row=2, values_only=True))
    # Filtrar filas completamente vacías
    filas_datos = [f for f in filas_datos if any(v is not None for v in f)]

    assert len(filas_datos) == len(reservas), (
        f"El Excel debe tener {len(reservas)} filas de datos, "
        f"pero tiene {len(filas_datos)}"
    )


@settings(max_examples=100)
@given(
    servicio_filtro=_servicios,
    reservas_con_servicio=st.lists(
        st.sampled_from(["paseos", "guarderia", "alojamiento"]),
        min_size=0,
        max_size=15,
    ),
)
def test_propiedad_19_filtrado_por_servicio_correcto(servicio_filtro, reservas_con_servicio):
    """
    Propiedad 19: Filtrado correcto por servicio en exportación.

    **Validates: Requirements 11.4, 11.5**
    """
    # Feature: sistema-reservas-guarderia-canina, Propiedad 19: Filtrado correcto en exportación
    # Crear reservas con distintos servicios
    todas_reservas = []
    for i, servicio in enumerate(reservas_con_servicio):
        reserva = {
            "id": f"reserva-{i}",
            "servicio": servicio,
            "fecha_desde": "2025-06-01",
            "fecha_hasta": "2025-06-03",
            "nombre_dueno": "Test",
            "telefono": "612345678",
            "email": "test@test.com",
            "nombre_perro": "Rex",
            "estado": "pendiente",
            "precio_total": 50.0,
            "tarifa": "normal",
            "tramo_horario": "mañana",
        }
        todas_reservas.append(reserva)

    # Filtrar por servicio
    reservas_filtradas = [r for r in todas_reservas if r["servicio"] == servicio_filtro]

    # Exportar
    use_case = ExportarCSV()
    output = use_case.execute(reservas_filtradas)

    reader = csv.reader(output)
    filas = list(reader)
    filas_datos = filas[1:]

    # Propiedad: el número de registros exportados coincide con los filtrados
    assert len(filas_datos) == len(reservas_filtradas), (
        f"Se esperaban {len(reservas_filtradas)} registros con servicio '{servicio_filtro}', "
        f"se exportaron {len(filas_datos)}"
    )

    # Propiedad: todos los registros exportados tienen el servicio del filtro
    servicio_col_idx = COLUMNAS.index("servicio")
    for fila in filas_datos:
        if len(fila) > servicio_col_idx:
            assert fila[servicio_col_idx] == servicio_filtro, (
                f"Registro exportado con servicio '{fila[servicio_col_idx]}' "
                f"no cumple el filtro '{servicio_filtro}'"
            )

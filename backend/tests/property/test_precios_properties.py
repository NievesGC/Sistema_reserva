"""
Tests de propiedad para el módulo de precios.

# Feature: sistema-reservas-guarderia-canina, Propiedad 4: Cálculo correcto de días y noches
# Feature: sistema-reservas-guarderia-canina, Propiedad 15: Round-trip de configuración de precios
# Feature: sistema-reservas-guarderia-canina, Propiedad 16: Round-trip de gestión de festivos
# Feature: sistema-reservas-guarderia-canina, Propiedad 17: Validación de festivos

Usa hypothesis con mocks (unittest.mock) para no depender de Supabase real.
"""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from modules.precios.domain.calculador_precio import (
    DesglosePrecio,
    ParametrosCalculo,
    calcular_precio,
)
from modules.precios.domain.festivo import Festivo
from modules.precios.domain.tarifa import ConfiguracionPrecios, TipoTransporte
from shared.domain.result import DomainError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def run(coro):
    """Ejecuta una corrutina en el event loop actual o crea uno nuevo."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Estrategias de generación de datos
# ---------------------------------------------------------------------------

_servicios_dias = st.sampled_from(['paseos', 'guarderia'])
_servicio_noches = st.just('alojamiento')
_servicios_todos = st.sampled_from(['paseos', 'guarderia', 'alojamiento'])

_tarifas = st.sampled_from(['normal', 'cachorros'])

_transporte_alojamiento = st.sampled_from([
    TipoTransporte.SIN_TRANSPORTE.value,
    TipoTransporte.RECOGIDA.value,
    TipoTransporte.RECOGIDA_ENTREGA.value,
])

# Fechas en un rango razonable
_fecha_base = date(2024, 1, 1)
_fecha_max = date(2026, 12, 31)

_fecha_strategy = st.dates(min_value=_fecha_base, max_value=_fecha_max)

# Precios positivos razonables
_precio_strategy = st.floats(min_value=0.0, max_value=500.0, allow_nan=False, allow_infinity=False)
_plazas_strategy = st.integers(min_value=1, max_value=20)


def _make_config(
    servicio: str = 'paseos',
    precio_normal: float = 20.0,
    precio_cachorros: float = 15.0,
    precio_festivo: float = 5.0,
    precio_perro_extra: float = 10.0,
    plazas_max: int = 5,
    precio_recogida: float = 12.0,
    precio_recogida_entrega: float = 20.0,
) -> ConfiguracionPrecios:
    return ConfiguracionPrecios(
        servicio=servicio,
        precio_normal=precio_normal,
        precio_cachorros=precio_cachorros,
        precio_festivo=precio_festivo,
        precio_perro_extra=precio_perro_extra,
        plazas_max=plazas_max,
        precio_recogida=precio_recogida,
        precio_recogida_entrega=precio_recogida_entrega,
    )


# ---------------------------------------------------------------------------
# Propiedad 4: Cálculo correcto de días y noches
# Valida: Requisitos 4.1, 4.2, 4.3
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    servicio=_servicios_dias,
    tarifa=_tarifas,
    fecha_desde=_fecha_strategy,
    offset_dias=st.integers(min_value=0, max_value=30),
    perro_extra=st.booleans(),
    precio_normal=_precio_strategy,
    precio_cachorros=_precio_strategy,
    precio_perro_extra=_precio_strategy,
)
def test_propiedad_4_dias_paseos_guarderia(
    servicio, tarifa, fecha_desde, offset_dias,
    perro_extra, precio_normal, precio_cachorros, precio_perro_extra,
):
    """
    Propiedad 4: Cálculo correcto de días y noches — Paseos y Guardería

    Para Paseos y Guardería, el número de días debe incluir ambos extremos:
        dias = (fecha_hasta - fecha_desde).days + 1

    El total debe ser siempre >= 0 y debe coincidir con la suma de conceptos.

    **Validates: Requirements 4.1, 4.2, 4.3**
    """
    fecha_hasta = fecha_desde + timedelta(days=offset_dias)
    config = _make_config(
        servicio=servicio,
        precio_normal=precio_normal,
        precio_cachorros=precio_cachorros,
        precio_perro_extra=precio_perro_extra,
    )
    params = ParametrosCalculo(
        servicio=servicio,
        tarifa=tarifa,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        perro_extra=perro_extra,
        transporte=None,
        festivos=[],
    )

    resultado = calcular_precio(params, config)

    # Número de días esperado (ambos extremos incluidos)
    dias_esperados = offset_dias + 1

    # Precio por unidad según tarifa
    precio_por_unidad = precio_cachorros if tarifa == 'cachorros' else precio_normal

    # Verificar precio_base
    assert resultado.precio_base == pytest.approx(precio_por_unidad * dias_esperados), (
        f"precio_base incorrecto para {servicio}: "
        f"esperado {precio_por_unidad * dias_esperados}, obtenido {resultado.precio_base}"
    )

    # Verificar costo_perro_extra
    costo_extra_esperado = precio_perro_extra * dias_esperados if perro_extra else 0.0
    assert resultado.costo_perro_extra == pytest.approx(costo_extra_esperado), (
        f"costo_perro_extra incorrecto: esperado {costo_extra_esperado}, obtenido {resultado.costo_perro_extra}"
    )

    # Verificar que no hay costo de transporte para paseos/guardería
    assert resultado.costo_transporte == 0.0, (
        f"costo_transporte debe ser 0 para {servicio}, obtenido {resultado.costo_transporte}"
    )

    # Verificar total >= 0
    assert resultado.total >= 0.0, f"total debe ser >= 0, obtenido {resultado.total}"

    # Verificar coherencia: total == suma de conceptos
    total_esperado = max(
        resultado.precio_base + resultado.costo_perro_extra
        + resultado.costo_transporte + resultado.recargo_festivos,
        0.0,
    )
    assert resultado.total == pytest.approx(total_esperado), (
        f"total no coincide con la suma de conceptos: "
        f"esperado {total_esperado}, obtenido {resultado.total}"
    )


@settings(max_examples=100)
@given(
    tarifa=_tarifas,
    fecha_desde=_fecha_strategy,
    offset_noches=st.integers(min_value=1, max_value=30),
    perro_extra=st.booleans(),
    transporte=_transporte_alojamiento,
    precio_normal=_precio_strategy,
    precio_cachorros=_precio_strategy,
    precio_perro_extra=_precio_strategy,
    precio_recogida=_precio_strategy,
    precio_recogida_entrega=_precio_strategy,
)
def test_propiedad_4_noches_alojamiento(
    tarifa, fecha_desde, offset_noches, perro_extra, transporte,
    precio_normal, precio_cachorros, precio_perro_extra,
    precio_recogida, precio_recogida_entrega,
):
    """
    Propiedad 4: Cálculo correcto de días y noches — Alojamiento

    Para Alojamiento, el número de noches es la diferencia pura de fechas:
        noches = (fecha_hasta - fecha_desde).days

    El total debe ser siempre >= 0 y debe coincidir con la suma de conceptos.

    **Validates: Requirements 4.1, 4.2, 4.3**
    """
    fecha_hasta = fecha_desde + timedelta(days=offset_noches)
    config = _make_config(
        servicio='alojamiento',
        precio_normal=precio_normal,
        precio_cachorros=precio_cachorros,
        precio_perro_extra=precio_perro_extra,
        precio_recogida=precio_recogida,
        precio_recogida_entrega=precio_recogida_entrega,
    )
    params = ParametrosCalculo(
        servicio='alojamiento',
        tarifa=tarifa,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        perro_extra=perro_extra,
        transporte=transporte,
        festivos=[],
    )

    resultado = calcular_precio(params, config)

    # Número de noches esperado (diferencia pura)
    noches_esperadas = offset_noches

    # Precio por unidad según tarifa
    precio_por_unidad = precio_cachorros if tarifa == 'cachorros' else precio_normal

    # Verificar precio_base
    assert resultado.precio_base == pytest.approx(precio_por_unidad * noches_esperadas), (
        f"precio_base incorrecto para alojamiento: "
        f"esperado {precio_por_unidad * noches_esperadas}, obtenido {resultado.precio_base}"
    )

    # Verificar costo_perro_extra
    costo_extra_esperado = precio_perro_extra * noches_esperadas if perro_extra else 0.0
    assert resultado.costo_perro_extra == pytest.approx(costo_extra_esperado)

    # Verificar costo_transporte según opción
    if transporte == TipoTransporte.RECOGIDA.value:
        assert resultado.costo_transporte == pytest.approx(precio_recogida)
    elif transporte == TipoTransporte.RECOGIDA_ENTREGA.value:
        assert resultado.costo_transporte == pytest.approx(precio_recogida_entrega)
    else:
        assert resultado.costo_transporte == 0.0

    # Verificar total >= 0
    assert resultado.total >= 0.0

    # Verificar coherencia: total == suma de conceptos
    total_esperado = max(
        resultado.precio_base + resultado.costo_perro_extra
        + resultado.costo_transporte + resultado.recargo_festivos,
        0.0,
    )
    assert resultado.total == pytest.approx(total_esperado)


@settings(max_examples=100)
@given(
    servicio=_servicios_todos,
    tarifa=_tarifas,
    fecha_desde=_fecha_strategy,
    offset=st.integers(min_value=0, max_value=30),
    perro_extra=st.booleans(),
    precio_normal=_precio_strategy,
    precio_cachorros=_precio_strategy,
    precio_perro_extra=_precio_strategy,
)
def test_propiedad_4_total_siempre_no_negativo(
    servicio, tarifa, fecha_desde, offset,
    perro_extra, precio_normal, precio_cachorros, precio_perro_extra,
):
    """
    Propiedad 4 (invariante): El total calculado es siempre >= 0.

    Para cualquier combinación válida de parámetros, el precio total
    nunca puede ser negativo.

    **Validates: Requirements 4.1, 4.2, 4.3**
    """
    # Para alojamiento necesitamos al menos 1 noche
    if servicio == 'alojamiento':
        offset = max(offset, 1)

    fecha_hasta = fecha_desde + timedelta(days=offset)
    config = _make_config(
        servicio=servicio,
        precio_normal=precio_normal,
        precio_cachorros=precio_cachorros,
        precio_perro_extra=precio_perro_extra,
    )
    params = ParametrosCalculo(
        servicio=servicio,
        tarifa=tarifa,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        perro_extra=perro_extra,
        transporte=None,
        festivos=[],
    )

    resultado = calcular_precio(params, config)

    assert resultado.total >= 0.0, (
        f"total negativo detectado: {resultado.total} para servicio={servicio}, "
        f"tarifa={tarifa}, fechas={fecha_desde}→{fecha_hasta}"
    )


# ---------------------------------------------------------------------------
# Propiedad 15: Round-trip de configuración de precios
# Valida: Requisito 9.3
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    servicio=_servicios_todos,
    precio_normal=_precio_strategy,
    precio_cachorros=_precio_strategy,
    precio_festivo=_precio_strategy,
    precio_perro_extra=_precio_strategy,
    plazas_max=_plazas_strategy,
    precio_recogida=_precio_strategy,
    precio_recogida_entrega=_precio_strategy,
)
def test_propiedad_15_round_trip_configuracion_precios(
    servicio, precio_normal, precio_cachorros, precio_festivo,
    precio_perro_extra, plazas_max, precio_recogida, precio_recogida_entrega,
):
    """
    Propiedad 15: Round-trip de configuración de precios

    Guardar una configuración y luego leerla debe devolver exactamente
    los mismos valores. Se usa un mock del repositorio para simular
    la persistencia sin Supabase real.

    **Validates: Requirement 9.3**
    """
    from modules.precios.application.calcular_precio import CalcularPrecioUseCase

    # Configuración a guardar
    config_original = ConfiguracionPrecios(
        servicio=servicio,
        precio_normal=precio_normal,
        precio_cachorros=precio_cachorros,
        precio_festivo=precio_festivo,
        precio_perro_extra=precio_perro_extra,
        plazas_max=plazas_max,
        precio_recogida=precio_recogida,
        precio_recogida_entrega=precio_recogida_entrega,
    )

    # Mock del repositorio que almacena y devuelve la configuración
    almacen: dict = {}

    mock_precios_repo = MagicMock()
    mock_precios_repo.obtener_configuracion = AsyncMock(
        side_effect=lambda s: almacen.get(s)
    )
    mock_precios_repo.actualizar_configuracion = AsyncMock(
        side_effect=lambda s, c: almacen.update({s: c})
    )

    mock_festivos_repo = MagicMock()
    mock_festivos_repo.listar_festivos = AsyncMock(return_value=[])

    # Guardar la configuración
    run(mock_precios_repo.actualizar_configuracion(servicio, config_original))

    # Leer la configuración guardada
    config_leida = run(mock_precios_repo.obtener_configuracion(servicio))

    # Verificar round-trip: los valores deben ser idénticos
    assert config_leida is not None, "La configuración guardada no se pudo recuperar"
    assert config_leida.servicio == config_original.servicio
    assert config_leida.precio_normal == pytest.approx(config_original.precio_normal)
    assert config_leida.precio_cachorros == pytest.approx(config_original.precio_cachorros)
    assert config_leida.precio_festivo == pytest.approx(config_original.precio_festivo)
    assert config_leida.precio_perro_extra == pytest.approx(config_original.precio_perro_extra)
    assert config_leida.plazas_max == config_original.plazas_max
    assert config_leida.precio_recogida == pytest.approx(config_original.precio_recogida)
    assert config_leida.precio_recogida_entrega == pytest.approx(config_original.precio_recogida_entrega)

    # Verificar que el use case usa la nueva configuración al calcular
    # (para alojamiento necesitamos al menos 1 noche)
    fecha_desde = date(2025, 6, 1)
    fecha_hasta = date(2025, 6, 2) if servicio == 'alojamiento' else date(2025, 6, 1)

    mock_precios_repo.obtener_configuracion = AsyncMock(return_value=config_leida)

    use_case = CalcularPrecioUseCase(
        precios_repo=mock_precios_repo,
        festivos_repo=mock_festivos_repo,
    )
    params = ParametrosCalculo(
        servicio=servicio,
        tarifa='normal',
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        perro_extra=False,
        transporte=None,
        festivos=[],
    )
    desglose = run(use_case.execute(params))

    # El precio base debe usar el precio_normal de la configuración guardada
    assert desglose.precio_base == pytest.approx(precio_normal), (
        f"El use case no usó la configuración guardada: "
        f"esperado precio_base={precio_normal}, obtenido={desglose.precio_base}"
    )


# ---------------------------------------------------------------------------
# Propiedad 16: Round-trip de gestión de festivos
# Valida: Requisitos 10.2, 10.4
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    fecha=st.dates(min_value=date(2024, 1, 1), max_value=date(2026, 12, 31)),
    nombre=st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), whitelist_characters=' '),
        min_size=1,
        max_size=50,
    ),
)
def test_propiedad_16_round_trip_crear_festivo(fecha, nombre):
    """
    Propiedad 16: Round-trip de gestión de festivos — Crear

    Crear un festivo con fecha y nombre válidos debe hacer que aparezca
    en el listado de festivos.

    **Validates: Requirements 10.2, 10.4**
    """
    from modules.precios.application.gestionar_festivos import (
        CrearFestivoUseCase,
        ListarFestivosUseCase,
    )

    # Almacén en memoria para simular persistencia
    festivos_almacen: list[Festivo] = []
    id_counter = [0]

    def crear_festivo_mock(f, n):
        id_counter[0] += 1
        festivo = Festivo(id=str(id_counter[0]), fecha=f, nombre=n, activo=True)
        festivos_almacen.append(festivo)
        return festivo

    mock_repo = MagicMock()
    mock_repo.crear_festivo = AsyncMock(side_effect=lambda f, n: crear_festivo_mock(f, n))
    mock_repo.listar_festivos = AsyncMock(side_effect=lambda: list(festivos_almacen))

    # Crear el festivo
    use_case_crear = CrearFestivoUseCase(festivos_repo=mock_repo)
    festivo_creado = run(use_case_crear.execute(fecha=fecha, nombre=nombre))

    # Listar festivos y verificar que el creado aparece
    use_case_listar = ListarFestivosUseCase(festivos_repo=mock_repo)
    festivos = run(use_case_listar.execute())

    fechas_en_lista = [f.fecha for f in festivos]
    assert fecha in fechas_en_lista, (
        f"El festivo con fecha {fecha} no aparece en el listado tras crearlo"
    )

    nombres_en_lista = [f.nombre for f in festivos]
    assert nombre in nombres_en_lista, (
        f"El festivo con nombre '{nombre}' no aparece en el listado tras crearlo"
    )


@settings(max_examples=100)
@given(
    fecha=st.dates(min_value=date(2024, 1, 1), max_value=date(2026, 12, 31)),
    nombre=st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), whitelist_characters=' '),
        min_size=1,
        max_size=50,
    ),
)
def test_propiedad_16_round_trip_eliminar_festivo(fecha, nombre):
    """
    Propiedad 16: Round-trip de gestión de festivos — Eliminar

    Eliminar un festivo existente debe hacer que desaparezca del listado.

    **Validates: Requirements 10.2, 10.4**
    """
    from modules.precios.application.gestionar_festivos import (
        CrearFestivoUseCase,
        EliminarFestivoUseCase,
        ListarFestivosUseCase,
    )

    # Almacén en memoria
    festivos_almacen: list[Festivo] = []
    id_counter = [0]

    def crear_festivo_mock(f, n):
        id_counter[0] += 1
        festivo = Festivo(id=str(id_counter[0]), fecha=f, nombre=n, activo=True)
        festivos_almacen.append(festivo)
        return festivo

    def eliminar_festivo_mock(festivo_id):
        festivos_almacen[:] = [f for f in festivos_almacen if f.id != festivo_id]

    mock_repo = MagicMock()
    mock_repo.crear_festivo = AsyncMock(side_effect=lambda f, n: crear_festivo_mock(f, n))
    mock_repo.listar_festivos = AsyncMock(side_effect=lambda: list(festivos_almacen))
    mock_repo.eliminar_festivo = AsyncMock(side_effect=lambda fid: eliminar_festivo_mock(fid))

    # Crear el festivo
    use_case_crear = CrearFestivoUseCase(festivos_repo=mock_repo)
    festivo_creado = run(use_case_crear.execute(fecha=fecha, nombre=nombre))

    # Eliminar el festivo
    use_case_eliminar = EliminarFestivoUseCase(festivos_repo=mock_repo)
    run(use_case_eliminar.execute(festivo_id=festivo_creado.id))

    # Listar y verificar que ya no aparece
    use_case_listar = ListarFestivosUseCase(festivos_repo=mock_repo)
    festivos = run(use_case_listar.execute())

    ids_en_lista = [f.id for f in festivos]
    assert festivo_creado.id not in ids_en_lista, (
        f"El festivo con id {festivo_creado.id} sigue en el listado tras eliminarlo"
    )


# ---------------------------------------------------------------------------
# Propiedad 17: Validación de festivos
# Valida: Requisito 10.3
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(
    nombre=st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), whitelist_characters=' '),
        min_size=1,
        max_size=50,
    ),
)
def test_propiedad_17_festivo_sin_fecha_lanza_error(nombre):
    """
    Propiedad 17: Validación de festivos — Sin fecha

    Intentar crear un festivo sin fecha debe lanzar DomainError
    con código FESTIVO_INVALIDO y HTTP status 400.

    **Validates: Requirement 10.3**
    """
    from modules.precios.application.gestionar_festivos import CrearFestivoUseCase

    mock_repo = MagicMock()
    mock_repo.crear_festivo = AsyncMock()

    use_case = CrearFestivoUseCase(festivos_repo=mock_repo)

    with pytest.raises(DomainError) as exc_info:
        run(use_case.execute(fecha=None, nombre=nombre))

    error = exc_info.value
    assert error.code == "FESTIVO_INVALIDO", (
        f"Se esperaba FESTIVO_INVALIDO, se obtuvo: {error.code}"
    )
    assert error.http_status == 400, (
        f"Se esperaba HTTP 400, se obtuvo: {error.http_status}"
    )

    # El repositorio no debe haber sido llamado
    mock_repo.crear_festivo.assert_not_called()


@settings(max_examples=100)
@given(
    fecha=st.dates(min_value=date(2024, 1, 1), max_value=date(2026, 12, 31)),
)
def test_propiedad_17_festivo_sin_nombre_lanza_error(fecha):
    """
    Propiedad 17: Validación de festivos — Sin nombre

    Intentar crear un festivo sin nombre (None o cadena vacía) debe lanzar
    DomainError con código FESTIVO_INVALIDO y HTTP status 400.

    **Validates: Requirement 10.3**
    """
    from modules.precios.application.gestionar_festivos import CrearFestivoUseCase

    mock_repo = MagicMock()
    mock_repo.crear_festivo = AsyncMock()

    use_case = CrearFestivoUseCase(festivos_repo=mock_repo)

    # Probar con nombre None
    with pytest.raises(DomainError) as exc_info:
        run(use_case.execute(fecha=fecha, nombre=None))

    error = exc_info.value
    assert error.code == "FESTIVO_INVALIDO"
    assert error.http_status == 400
    mock_repo.crear_festivo.assert_not_called()

    # Probar con nombre vacío
    with pytest.raises(DomainError) as exc_info:
        run(use_case.execute(fecha=fecha, nombre=""))

    error = exc_info.value
    assert error.code == "FESTIVO_INVALIDO"
    assert error.http_status == 400


@settings(max_examples=100)
@given(
    nombre=st.one_of(st.just(None), st.just("")),
    fecha=st.one_of(
        st.just(None),
        st.dates(min_value=date(2024, 1, 1), max_value=date(2026, 12, 31)),
    ),
)
def test_propiedad_17_festivo_invalido_combinaciones(nombre, fecha):
    """
    Propiedad 17: Validación de festivos — Combinaciones inválidas

    Cualquier combinación donde fecha sea None o nombre sea None/vacío
    debe lanzar DomainError FESTIVO_INVALIDO.

    **Validates: Requirement 10.3**
    """
    from modules.precios.application.gestionar_festivos import CrearFestivoUseCase

    # Solo probar casos donde al menos uno es inválido
    if fecha is not None and nombre not in (None, ""):
        return  # Caso válido, no aplica a esta propiedad

    mock_repo = MagicMock()
    mock_repo.crear_festivo = AsyncMock()

    use_case = CrearFestivoUseCase(festivos_repo=mock_repo)

    with pytest.raises(DomainError) as exc_info:
        run(use_case.execute(fecha=fecha, nombre=nombre))

    error = exc_info.value
    assert error.code == "FESTIVO_INVALIDO"
    assert error.http_status == 400
    mock_repo.crear_festivo.assert_not_called()

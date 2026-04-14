"""
Tests de propiedad para el módulo de autenticación.

# Feature: sistema-reservas-guarderia-canina, Propiedad 23: Credenciales inválidas deniegan acceso
# Feature: sistema-reservas-guarderia-canina, Propiedad 24: Sesión invalidada tras logout

Usa hypothesis con mocks (unittest.mock) para no depender de Supabase real.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from modules.autenticacion.infrastructure.supabase_auth import SupabaseAuthService
from shared.domain.result import DomainError

# ---------------------------------------------------------------------------
# Helpers para ejecutar corrutinas en tests síncronos de hypothesis
# ---------------------------------------------------------------------------

def run(coro):
    """Ejecuta una corrutina en el event loop actual o crea uno nuevo."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Estrategias de generación de datos
# ---------------------------------------------------------------------------

# Emails con formato válido pero que NO son las credenciales del empresario real
_email_strategy = st.emails()

# Contraseñas de longitud variable (1-50 caracteres)
_password_strategy = st.text(
    alphabet=st.characters(blacklist_categories=("Cs",)),
    min_size=1,
    max_size=50,
)

# Tokens con formato de cadena no vacía (simulan JWTs inválidos o revocados)
_token_invalido_strategy = st.text(
    alphabet=st.characters(blacklist_categories=("Cs",)),
    min_size=10,
    max_size=200,
)


# ---------------------------------------------------------------------------
# Propiedad 23: Credenciales inválidas deniegan acceso
# Valida: Requisito 1.2
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(email=_email_strategy, password=_password_strategy)
def test_propiedad_23_credenciales_invalidas_deniegan_acceso(email: str, password: str):
    """
    Propiedad 23: Credenciales inválidas deniegan acceso

    Para cualquier par (email, password) que no corresponda a un usuario
    registrado en el sistema:
        1. El intento de autenticación debe ser denegado.
        2. El error debe tener código NO_AUTENTICADO y HTTP status 401.
        3. El mensaje de error debe ser genérico (no revelar si el usuario existe).

    Valida: Requisito 1.2

    Estrategia de mock: Supabase Auth devuelve None en session para simular
    credenciales incorrectas, independientemente del email/password recibido.
    """
    # Arrange: mock del cliente Supabase que simula credenciales incorrectas
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.session = None  # Supabase devuelve None cuando las credenciales son incorrectas
    mock_response.user = None
    mock_client.auth.sign_in_with_password.return_value = mock_response

    service = SupabaseAuthService(supabase_client=mock_client)

    # Act & Assert: el login debe lanzar DomainError con código NO_AUTENTICADO
    with pytest.raises(DomainError) as exc_info:
        run(service.login(email, password))

    error = exc_info.value

    # El error debe ser NO_AUTENTICADO con status 401
    assert error.code == "NO_AUTENTICADO", (
        f"Se esperaba código NO_AUTENTICADO, se obtuvo: {error.code}"
    )
    assert error.http_status == 401, (
        f"Se esperaba HTTP 401, se obtuvo: {error.http_status}"
    )

    # El mensaje NO debe revelar si el usuario existe o no (Propiedad 23)
    mensaje = error.message.lower()
    assert "no existe" not in mensaje, (
        "El mensaje de error revela que el usuario no existe"
    )
    assert "usuario no encontrado" not in mensaje, (
        "El mensaje de error revela que el usuario no fue encontrado"
    )
    assert "email incorrecto" not in mensaje, (
        "El mensaje de error revela que el email es incorrecto"
    )
    assert "contraseña incorrecta" not in mensaje, (
        "El mensaje de error revela que la contraseña es incorrecta"
    )


@settings(max_examples=100)
@given(email=_email_strategy, password=_password_strategy)
def test_propiedad_23_excepcion_supabase_tambien_deniega_acceso(email: str, password: str):
    """
    Propiedad 23 (variante): Cualquier excepción de Supabase durante el login
    también debe resultar en denegación de acceso con mensaje genérico.

    Esto cubre el caso en que Supabase lanza una excepción (ej: usuario no existe,
    error de red) — el sistema debe responder igual que con contraseña incorrecta,
    sin revelar la causa real del fallo.

    Valida: Requisito 1.2
    """
    # Arrange: mock que lanza una excepción genérica (simula error de Supabase)
    mock_client = MagicMock()
    mock_client.auth.sign_in_with_password.side_effect = Exception(
        "Invalid login credentials"  # Mensaje típico de Supabase
    )

    service = SupabaseAuthService(supabase_client=mock_client)

    # Act & Assert
    with pytest.raises(DomainError) as exc_info:
        run(service.login(email, password))

    error = exc_info.value
    assert error.code == "NO_AUTENTICADO"
    assert error.http_status == 401

    # El mensaje debe ser genérico
    mensaje = error.message.lower()
    assert "invalid login credentials" not in mensaje, (
        "El mensaje de error expone el mensaje interno de Supabase"
    )


# ---------------------------------------------------------------------------
# Propiedad 24: Sesión invalidada tras logout
# Valida: Requisito 1.3
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(token=_token_invalido_strategy)
def test_propiedad_24_sesion_invalidada_tras_logout(token: str):
    """
    Propiedad 24: Sesión invalidada tras logout

    Para cualquier token que haya sido usado en un logout exitoso,
    cualquier intento posterior de validar ese token debe ser rechazado
    con DomainError NO_AUTENTICADO (401).

    Estrategia:
        1. Simular un logout exitoso (Supabase acepta el sign_out).
        2. Simular que Supabase ya no reconoce el token (get_user devuelve None).
        3. Verificar que validar_sesion lanza DomainError NO_AUTENTICADO.

    Valida: Requisito 1.3
    """
    # Arrange: mock del cliente Supabase
    mock_client = MagicMock()

    # Logout exitoso: sign_out no lanza excepción
    mock_client.auth.set_session.return_value = None
    mock_client.auth.sign_out.return_value = None

    # Tras el logout, get_user devuelve None (token revocado)
    mock_response_invalido = MagicMock()
    mock_response_invalido.user = None
    mock_client.auth.get_user.return_value = mock_response_invalido

    service = SupabaseAuthService(supabase_client=mock_client)

    # Act: ejecutar logout
    run(service.logout(token))

    # Assert: validar_sesion con el mismo token debe lanzar DomainError
    with pytest.raises(DomainError) as exc_info:
        run(service.validar_sesion(token))

    error = exc_info.value
    assert error.code == "NO_AUTENTICADO", (
        f"Se esperaba NO_AUTENTICADO tras logout, se obtuvo: {error.code}"
    )
    assert error.http_status == 401, (
        f"Se esperaba HTTP 401 tras logout, se obtuvo: {error.http_status}"
    )


@settings(max_examples=100)
@given(token=_token_invalido_strategy)
def test_propiedad_24_token_invalido_rechazado_sin_logout(token: str):
    """
    Propiedad 24 (variante): Cualquier token inválido (no emitido por el sistema,
    expirado o malformado) debe ser rechazado con 401.

    Esto cubre el caso en que Supabase lanza una excepción al intentar
    validar un token que nunca fue válido.

    Valida: Requisito 1.3
    """
    # Arrange: mock que lanza excepción al validar el token
    mock_client = MagicMock()
    mock_client.auth.get_user.side_effect = Exception("JWT expired")

    service = SupabaseAuthService(supabase_client=mock_client)

    # Act & Assert
    with pytest.raises(DomainError) as exc_info:
        run(service.validar_sesion(token))

    error = exc_info.value
    assert error.code == "NO_AUTENTICADO"
    assert error.http_status == 401

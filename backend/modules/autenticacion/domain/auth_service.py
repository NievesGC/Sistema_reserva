"""
Contrato del módulo de autenticación (Protocol).

Define la interfaz IAuthService que deben implementar los adaptadores de
infraestructura. El dominio no conoce detalles de Supabase ni de FastAPI
(Clean Architecture: la capa de dominio no importa infraestructura).

Reglas de negocio:
    - Login con credenciales incorrectas → DomainError NO_AUTENTICADO (401)
    - El mensaje de error NO revela si el usuario existe o no (Propiedad 23)
    - Logout invalida el token; peticiones posteriores → 401 (Propiedad 24)
    - Sesión inactiva > 60 minutos → cierre automático (Requisito 1.5)
    - Contraseñas gestionadas por Supabase Auth (bcrypt, sin texto plano) (Requisito 1.6)
"""

from __future__ import annotations

from typing import Protocol


class IAuthService(Protocol):
    """
    Interfaz del servicio de autenticación.

    Todos los métodos son asíncronos para ser compatibles con FastAPI y
    con el cliente Supabase que opera de forma asíncrona.
    """

    async def login(self, email: str, password: str) -> dict:
        """
        Autentica al empresario con email y contraseña.

        Args:
            email: Dirección de correo del empresario.
            password: Contraseña en texto plano (Supabase la compara con bcrypt).

        Returns:
            dict con al menos las claves:
                - access_token (str): JWT de sesión.
                - user (dict): Datos básicos del usuario autenticado.

        Raises:
            DomainError(NO_AUTENTICADO, 401): Si las credenciales son incorrectas.
                El mensaje es genérico y no revela si el usuario existe (Propiedad 23).
        """
        ...

    async def logout(self, token: str) -> None:
        """
        Cierra la sesión activa e invalida el token.

        Tras el logout, cualquier petición con ese token debe ser rechazada
        con 401 (Propiedad 24).

        Args:
            token: JWT de sesión activa a invalidar.

        Raises:
            DomainError(NO_AUTENTICADO, 401): Si el token ya es inválido.
        """
        ...

    async def validar_sesion(self, token: str) -> dict:
        """
        Valida que el token JWT corresponde a una sesión activa.

        Verifica la firma, la expiración y que la sesión no haya sido
        invalidada por un logout previo.

        Args:
            token: JWT a validar.

        Returns:
            dict con los datos del usuario autenticado (user_id, email, etc.).

        Raises:
            DomainError(NO_AUTENTICADO, 401): Si el token es inválido, expirado
                o la sesión fue cerrada.
        """
        ...

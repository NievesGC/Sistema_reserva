"""
Implementación del servicio de autenticación usando Supabase Auth.

Supabase Auth gestiona:
    - Almacenamiento de contraseñas con bcrypt (Requisito 1.6)
    - Emisión y validación de tokens JWT
    - Expiración automática de sesiones (configurable en el dashboard de Supabase)

Reglas de negocio implementadas:
    - Login fallido → mensaje genérico sin revelar si el usuario existe (Propiedad 23)
    - Logout invalida el token en Supabase; peticiones posteriores → 401 (Propiedad 24)
    - Sesión inactiva > 60 minutos → cierre automático (Requisito 1.5, configurado en Supabase)
"""

from __future__ import annotations

from shared.domain.result import DomainError, no_autenticado
from shared.infrastructure.logger import get_logger
from shared.infrastructure.supabase_client import get_supabase_client

logger = get_logger(__name__)

# Mensaje genérico de error de autenticación.
# NO debe revelar si el usuario existe o no (Propiedad 23 / Requisito 1.2).
_MSG_CREDENCIALES_INVALIDAS = "Credenciales incorrectas"


class SupabaseAuthService:
    """
    Adaptador de infraestructura que implementa IAuthService usando Supabase Auth.

    Supabase Auth se encarga de:
        - Verificar la contraseña contra el hash bcrypt almacenado.
        - Emitir un JWT firmado con la clave secreta del proyecto.
        - Invalidar tokens en el logout (revocación de sesión).
        - Expirar sesiones inactivas según la configuración del proyecto.
    """

    def __init__(self, supabase_client=None):
        """
        Args:
            supabase_client: Cliente Supabase inyectado. Si es None, se obtiene
                el singleton de producción. La inyección permite mockear en tests.
        """
        self._client = supabase_client or get_supabase_client()

    async def login(self, email: str, password: str) -> dict:
        """
        Autentica al empresario con email y contraseña via Supabase Auth.

        Supabase compara la contraseña con el hash bcrypt almacenado.
        Si las credenciales son incorrectas, se lanza DomainError con un
        mensaje genérico que no revela si el usuario existe (Propiedad 23).

        Args:
            email: Dirección de correo del empresario.
            password: Contraseña en texto plano.

        Returns:
            dict con access_token y datos del usuario.

        Raises:
            DomainError(NO_AUTENTICADO, 401): Credenciales incorrectas.
        """
        try:
            response = self._client.auth.sign_in_with_password(
                {"email": email, "password": password}
            )

            # Supabase devuelve None en session si las credenciales son incorrectas
            if response is None or response.session is None:
                logger.warning(
                    "login_fallido",
                    # No logueamos el email en WARNING para no exponer PII en logs
                    motivo="credenciales_invalidas",
                )
                raise no_autenticado()

            session = response.session
            user = response.user

            logger.info("login_exitoso", user_id=str(user.id) if user else "unknown")

            return {
                "access_token": session.access_token,
                "token_type": "bearer",
                "expires_in": session.expires_in,
                "user": {
                    "id": str(user.id) if user else None,
                    "email": user.email if user else None,
                },
            }

        except DomainError:
            # Re-lanzar errores de dominio sin envolver
            raise
        except Exception as exc:
            # Cualquier otro error de Supabase se trata como credenciales inválidas
            # para no revelar información sobre la existencia del usuario (Propiedad 23)
            logger.warning(
                "login_error_supabase",
                error_type=type(exc).__name__,
                # No incluimos el mensaje de error de Supabase porque puede
                # contener información sobre si el usuario existe o no
            )
            raise no_autenticado()

    async def logout(self, token: str) -> None:
        """
        Invalida la sesión activa en Supabase Auth.

        Tras el logout, el token queda revocado en Supabase y cualquier
        petición posterior con ese token será rechazada con 401 (Propiedad 24).

        Args:
            token: JWT de sesión activa a invalidar.

        Raises:
            DomainError(NO_AUTENTICADO, 401): Si el token ya es inválido.
        """
        try:
            # Establecer el token de acceso en el cliente antes de hacer logout
            # para que Supabase invalide la sesión correcta
            self._client.auth.set_session(token, "")
            self._client.auth.sign_out()
            logger.info("logout_exitoso")

        except DomainError:
            raise
        except Exception as exc:
            logger.warning(
                "logout_error",
                error_type=type(exc).__name__,
            )
            raise no_autenticado()

    async def validar_sesion(self, token: str) -> dict:
        """
        Valida que el token JWT corresponde a una sesión activa en Supabase.

        Verifica:
            - Firma del JWT con la clave del proyecto Supabase.
            - Expiración del token (sesiones > 60 min inactivas expiran, Requisito 1.5).
            - Que la sesión no haya sido invalidada por un logout previo (Propiedad 24).

        Args:
            token: JWT a validar.

        Returns:
            dict con los datos del usuario autenticado.

        Raises:
            DomainError(NO_AUTENTICADO, 401): Token inválido, expirado o revocado.
        """
        try:
            # Obtener el usuario asociado al token
            response = self._client.auth.get_user(token)

            if response is None or response.user is None:
                raise no_autenticado()

            user = response.user
            logger.debug("sesion_valida", user_id=str(user.id))

            return {
                "user_id": str(user.id),
                "email": user.email,
                "role": user.role,
            }

        except DomainError:
            raise
        except Exception as exc:
            logger.warning(
                "validacion_sesion_fallida",
                error_type=type(exc).__name__,
            )
            raise no_autenticado()

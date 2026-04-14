"""
Middleware de autenticación para FastAPI.

Proporciona la dependencia `require_auth` que protege los endpoints privados
del panel de administración (/api/admin/*).

Uso en un router FastAPI:
    from modules.autenticacion.infrastructure.auth_middleware import require_auth

    @router.get("/api/admin/reservas")
    async def listar_reservas(usuario: dict = Depends(require_auth)):
        # usuario contiene los datos del empresario autenticado
        ...

Requisitos implementados:
    - Requisito 1.1: Acceso al Panel_Admin requiere credenciales válidas.
    - Requisito 1.4: Sesión activa mantiene el acceso sin requerir nueva autenticación.
    - Propiedad 20: Peticiones sin token válido → 401, sin exponer datos personales.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from modules.autenticacion.infrastructure.supabase_auth import SupabaseAuthService
from shared.domain.result import DomainError
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)

# Esquema de seguridad Bearer para extraer el token del header Authorization
_bearer_scheme = HTTPBearer(auto_error=False)

# Instancia del servicio de autenticación (singleton de producción)
# En tests se puede sobreescribir mediante dependency_overrides de FastAPI
_auth_service = SupabaseAuthService()


async def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict:
    """
    Dependencia FastAPI que valida el token JWT en el header Authorization.

    Lee el token del header `Authorization: Bearer <token>`, lo valida
    contra Supabase Auth y devuelve los datos del usuario autenticado.

    Si el token es inválido, expirado o ausente, lanza HTTPException 401
    sin exponer datos personales ni detalles técnicos (Propiedad 20).

    Args:
        credentials: Credenciales Bearer extraídas automáticamente por FastAPI.

    Returns:
        dict con los datos del usuario autenticado (user_id, email, role).

    Raises:
        HTTPException(401): Token ausente, inválido o sesión expirada.
    """
    # Verificar que se proporcionó el header Authorization
    if credentials is None or not credentials.credentials:
        logger.warning("auth_middleware_sin_token")
        raise HTTPException(
            status_code=401,
            detail="Autenticación requerida",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Delegar la validación al servicio de autenticación
        usuario = await _auth_service.validar_sesion(token)
        return usuario

    except DomainError as exc:
        # Convertir DomainError a HTTPException sin exponer detalles internos
        logger.warning(
            "auth_middleware_token_invalido",
            error_code=exc.code,
        )
        raise HTTPException(
            status_code=401,
            detail="Autenticación requerida",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        # Error inesperado: loguear sin PII y devolver 401 genérico
        logger.error(
            "auth_middleware_error_inesperado",
            error_type=type(exc).__name__,
        )
        raise HTTPException(
            status_code=401,
            detail="Autenticación requerida",
            headers={"WWW-Authenticate": "Bearer"},
        )


def make_require_auth(auth_service) -> callable:
    """
    Fábrica de la dependencia `require_auth` con un servicio inyectado.

    Útil en tests para inyectar un mock del servicio de autenticación
    sin necesidad de usar dependency_overrides de FastAPI.

    Args:
        auth_service: Instancia de IAuthService a usar en la dependencia.

    Returns:
        Función de dependencia FastAPI compatible con Depends().

    Ejemplo en tests:
        mock_service = MagicMock()
        mock_service.validar_sesion = AsyncMock(return_value={"user_id": "123"})
        dep = make_require_auth(mock_service)

        app.dependency_overrides[require_auth] = dep
    """
    async def _require_auth(
        credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    ) -> dict:
        if credentials is None or not credentials.credentials:
            raise HTTPException(
                status_code=401,
                detail="Autenticación requerida",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = credentials.credentials

        try:
            return await auth_service.validar_sesion(token)
        except DomainError:
            raise HTTPException(
                status_code=401,
                detail="Autenticación requerida",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return _require_auth

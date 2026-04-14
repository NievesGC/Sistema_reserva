"""
Router FastAPI para el módulo de disponibilidad.

Endpoints públicos:
  GET  /api/disponibilidad/{servicio}/{mes}  → Disponibilidad mensual

Endpoints privados (requieren JWT):
  POST /api/admin/disponibilidad/bloquear    → Bloquear un día
  POST /api/admin/disponibilidad/desbloquear → Desbloquear un día

Requisitos: 2.2, 2.6, 2.8, 8.4, 8.5
"""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from modules.autenticacion.infrastructure.auth_middleware import require_auth
from modules.disponibilidad.application.bloquear_dia import BloquearDiaUseCase
from modules.disponibilidad.application.desbloquear_dia import DesbloquearDiaUseCase
from modules.disponibilidad.application.verificar_disponibilidad import (
    VerificarDisponibilidadUseCase,
)
from modules.disponibilidad.infrastructure.supabase_disponibilidad_repository import (
    SupabaseDisponibilidadRepository,
)
from shared.domain.result import Err, Ok
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Dependencia: repositorio de disponibilidad
# ---------------------------------------------------------------------------

def get_disponibilidad_repo() -> SupabaseDisponibilidadRepository:
    return SupabaseDisponibilidadRepository()


# ---------------------------------------------------------------------------
# Schemas Pydantic
# ---------------------------------------------------------------------------

class BloquearDiaSchema(BaseModel):
    """Cuerpo de la petición para bloquear/desbloquear un día."""
    servicio: str
    fecha: date


class DisponibilidadDiaSchema(BaseModel):
    """Disponibilidad de un día concreto."""
    fecha: str          # ISO date
    plazas_libres: int  # -1 = bloqueado
    bloqueado: bool


class DisponibilidadMensualSchema(BaseModel):
    """Respuesta de disponibilidad mensual."""
    servicio: str
    mes: str            # YYYY-MM
    dias: list[DisponibilidadDiaSchema]


# ---------------------------------------------------------------------------
# Endpoints públicos
# ---------------------------------------------------------------------------

@router.get(
    "/api/disponibilidad/{servicio}/{mes}",
    response_model=DisponibilidadMensualSchema,
)
async def obtener_disponibilidad_mensual(
    servicio: str,
    mes: str,  # formato YYYY-MM
    repo: SupabaseDisponibilidadRepository = Depends(get_disponibilidad_repo),
):
    """
    Devuelve la disponibilidad de plazas para todos los días del mes indicado.

    El parámetro `mes` debe tener formato YYYY-MM (ej: 2025-06).
    Endpoint público — no requiere autenticación.
    """
    try:
        # Parsear mes → primer y último día
        anio, num_mes = mes.split("-")
        fecha_desde = date(int(anio), int(num_mes), 1)
        # Último día del mes: primer día del mes siguiente - 1 día
        if int(num_mes) == 12:
            fecha_hasta = date(int(anio) + 1, 1, 1) - timedelta(days=1)
        else:
            fecha_hasta = date(int(anio), int(num_mes) + 1, 1) - timedelta(days=1)

        use_case = VerificarDisponibilidadUseCase(servicio=repo)
        resultado_result = await use_case.execute(
            servicio=servicio,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
        )

        if isinstance(resultado_result, Err):
            raise HTTPException(
                status_code=resultado_result.error.http_status,
                detail=resultado_result.error.message,
            )

        resultado = resultado_result.value
        dias = [
            DisponibilidadDiaSchema(
                fecha=fecha_iso,
                plazas_libres=plazas,
                bloqueado=(plazas == -1),
            )
            for fecha_iso, plazas in sorted(resultado.plazas_por_dia.items())
        ]

        return DisponibilidadMensualSchema(servicio=servicio, mes=mes, dias=dias)

    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de mes inválido. Use YYYY-MM")
    except Exception as exc:
        logger.error(
            "disponibilidad_router_mensual_error",
            servicio=servicio,
            mes=mes,
            error_type=type(exc).__name__,
        )
        raise HTTPException(status_code=503, detail="Error al consultar disponibilidad")


# ---------------------------------------------------------------------------
# Endpoints privados (requieren JWT)
# ---------------------------------------------------------------------------

@router.post("/api/admin/disponibilidad/bloquear", status_code=200)
async def bloquear_dia(
    body: BloquearDiaSchema,
    repo: SupabaseDisponibilidadRepository = Depends(get_disponibilidad_repo),
    _usuario: dict = Depends(require_auth),
):
    """
    Bloquea un día del calendario para el servicio indicado.

    Endpoint privado — requiere token JWT válido.
    Devuelve 409 si el día ya está bloqueado.
    """
    use_case = BloquearDiaUseCase(servicio=repo)
    resultado = await use_case.execute(servicio=body.servicio, fecha=body.fecha)

    if isinstance(resultado, Err):
        raise HTTPException(
            status_code=resultado.error.http_status,
            detail=resultado.error.message,
        )

    logger.info("disponibilidad_router_dia_bloqueado", servicio=body.servicio)
    return {"ok": True, "servicio": body.servicio, "fecha": body.fecha.isoformat()}


@router.post("/api/admin/disponibilidad/desbloquear", status_code=200)
async def desbloquear_dia(
    body: BloquearDiaSchema,
    repo: SupabaseDisponibilidadRepository = Depends(get_disponibilidad_repo),
    _usuario: dict = Depends(require_auth),
):
    """
    Desbloquea un día del calendario para el servicio indicado.

    Endpoint privado — requiere token JWT válido.
    Devuelve 400 si el día no está bloqueado.
    """
    use_case = DesbloquearDiaUseCase(servicio=repo)
    resultado = await use_case.execute(servicio=body.servicio, fecha=body.fecha)

    if isinstance(resultado, Err):
        raise HTTPException(
            status_code=resultado.error.http_status,
            detail=resultado.error.message,
        )

    logger.info("disponibilidad_router_dia_desbloqueado", servicio=body.servicio)
    return {"ok": True, "servicio": body.servicio, "fecha": body.fecha.isoformat()}

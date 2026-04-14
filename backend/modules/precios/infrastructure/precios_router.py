"""
Router FastAPI para el módulo de precios y festivos.

Endpoints públicos:
  GET  /api/precios/{servicio}   → Devuelve la configuración de precios del servicio
  GET  /api/festivos             → Lista los festivos activos

Endpoints privados (requieren autenticación):
  PUT  /api/admin/precios        → Actualiza la configuración de precios
  POST /api/admin/festivos       → Crea un nuevo festivo
  DELETE /api/admin/festivos/{id} → Elimina un festivo

Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from modules.autenticacion.infrastructure.auth_middleware import require_auth
from modules.precios.application.calcular_precio import (
    IFestivosRepository,
    IPreciosRepository,
)
from modules.precios.application.gestionar_festivos import (
    CrearFestivoUseCase,
    EliminarFestivoUseCase,
    ListarFestivosUseCase,
)
from modules.precios.domain.tarifa import ConfiguracionPrecios
from modules.precios.infrastructure.supabase_precios_repository import (
    SupabaseFestivosRepository,
    SupabasePreciosRepository,
)
from shared.domain.result import DomainError
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Dependencias (inyección de repositorios)
# ---------------------------------------------------------------------------

def get_precios_repo() -> IPreciosRepository:
    return SupabasePreciosRepository()


def get_festivos_repo() -> IFestivosRepository:
    return SupabaseFestivosRepository()


# ---------------------------------------------------------------------------
# Schemas Pydantic
# ---------------------------------------------------------------------------

class ConfiguracionPreciosSchema(BaseModel):
    """Schema de entrada/salida para la configuración de precios."""
    servicio: str
    precio_normal: float
    precio_cachorros: float
    precio_festivo: float
    precio_perro_extra: float
    plazas_max: int
    precio_recogida: float | None = None
    precio_recogida_entrega: float | None = None


class CrearFestivoSchema(BaseModel):
    """Schema de entrada para crear un festivo."""
    fecha: date
    nombre: str


class FestivoSchema(BaseModel):
    """Schema de salida para un festivo."""
    id: str
    fecha: date
    nombre: str
    activo: bool


# ---------------------------------------------------------------------------
# Endpoints públicos
# ---------------------------------------------------------------------------

@router.get("/api/precios/{servicio}", response_model=ConfiguracionPreciosSchema)
async def obtener_precios(
    servicio: str,
    precios_repo: IPreciosRepository = Depends(get_precios_repo),
):
    """
    Devuelve la configuración de precios vigente para el servicio indicado.

    Endpoint público — no requiere autenticación.
    """
    try:
        config = await precios_repo.obtener_configuracion(servicio)
        return ConfiguracionPreciosSchema(
            servicio=config.servicio,
            precio_normal=config.precio_normal,
            precio_cachorros=config.precio_cachorros,
            precio_festivo=config.precio_festivo,
            precio_perro_extra=config.precio_perro_extra,
            plazas_max=config.plazas_max,
            precio_recogida=config.precio_recogida,
            precio_recogida_entrega=config.precio_recogida_entrega,
        )
    except DomainError as exc:
        raise HTTPException(status_code=exc.http_status, detail=exc.message)
    except Exception as exc:
        logger.error("precios_router_obtener_error", servicio=servicio, error_type=type(exc).__name__)
        raise HTTPException(status_code=503, detail="Error al obtener precios")


@router.get("/api/festivos", response_model=list[FestivoSchema])
async def listar_festivos(
    festivos_repo: IFestivosRepository = Depends(get_festivos_repo),
):
    """
    Lista todos los días festivos activos.

    Endpoint público — no requiere autenticación.
    """
    try:
        use_case = ListarFestivosUseCase(festivos_repo=festivos_repo)
        festivos = await use_case.execute()
        return [
            FestivoSchema(id=f.id, fecha=f.fecha, nombre=f.nombre, activo=f.activo)
            for f in festivos
        ]
    except DomainError as exc:
        raise HTTPException(status_code=exc.http_status, detail=exc.message)
    except Exception as exc:
        logger.error("precios_router_listar_festivos_error", error_type=type(exc).__name__)
        raise HTTPException(status_code=503, detail="Error al listar festivos")


# ---------------------------------------------------------------------------
# Endpoints privados (requieren autenticación)
# ---------------------------------------------------------------------------

@router.put("/api/admin/precios")
async def actualizar_precios(
    config_schema: ConfiguracionPreciosSchema,
    precios_repo: IPreciosRepository = Depends(get_precios_repo),
    _usuario: dict = Depends(require_auth),
):
    """
    Actualiza la configuración de precios para un servicio.

    Endpoint privado — requiere token de autenticación válido.
    """
    try:
        config = ConfiguracionPrecios(
            servicio=config_schema.servicio,
            precio_normal=config_schema.precio_normal,
            precio_cachorros=config_schema.precio_cachorros,
            precio_festivo=config_schema.precio_festivo,
            precio_perro_extra=config_schema.precio_perro_extra,
            plazas_max=config_schema.plazas_max,
            precio_recogida=config_schema.precio_recogida,
            precio_recogida_entrega=config_schema.precio_recogida_entrega,
        )
        await precios_repo.actualizar_configuracion(config_schema.servicio, config)
        logger.info("precios_router_config_actualizada", servicio=config_schema.servicio)
        return {"ok": True, "servicio": config_schema.servicio}
    except DomainError as exc:
        raise HTTPException(status_code=exc.http_status, detail=exc.message)
    except Exception as exc:
        logger.error("precios_router_actualizar_error", error_type=type(exc).__name__)
        raise HTTPException(status_code=503, detail="Error al actualizar precios")


@router.post("/api/admin/festivos", response_model=FestivoSchema, status_code=201)
async def crear_festivo(
    body: CrearFestivoSchema,
    festivos_repo: IFestivosRepository = Depends(get_festivos_repo),
    _usuario: dict = Depends(require_auth),
):
    """
    Crea un nuevo día festivo.

    Endpoint privado — requiere token de autenticación válido.
    """
    try:
        use_case = CrearFestivoUseCase(festivos_repo=festivos_repo)
        festivo = await use_case.execute(fecha=body.fecha, nombre=body.nombre)
        return FestivoSchema(id=festivo.id, fecha=festivo.fecha, nombre=festivo.nombre, activo=festivo.activo)
    except DomainError as exc:
        raise HTTPException(status_code=exc.http_status, detail=exc.message)
    except Exception as exc:
        logger.error("precios_router_crear_festivo_error", error_type=type(exc).__name__)
        raise HTTPException(status_code=503, detail="Error al crear festivo")


@router.delete("/api/admin/festivos/{festivo_id}", status_code=204)
async def eliminar_festivo(
    festivo_id: str,
    festivos_repo: IFestivosRepository = Depends(get_festivos_repo),
    _usuario: dict = Depends(require_auth),
):
    """
    Elimina un festivo existente.

    Endpoint privado — requiere token de autenticación válido.
    """
    try:
        use_case = EliminarFestivoUseCase(festivos_repo=festivos_repo)
        await use_case.execute(festivo_id=festivo_id)
        logger.info("precios_router_festivo_eliminado", festivo_id=festivo_id)
    except DomainError as exc:
        raise HTTPException(status_code=exc.http_status, detail=exc.message)
    except Exception as exc:
        logger.error("precios_router_eliminar_festivo_error", festivo_id=festivo_id, error_type=type(exc).__name__)
        raise HTTPException(status_code=503, detail="Error al eliminar festivo")

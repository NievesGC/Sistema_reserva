"""
Router FastAPI para el módulo de reservas.

Endpoints públicos:
  POST /api/reservas                        → Crear reserva (cliente)

Endpoints privados (requieren JWT):
  GET  /api/admin/reservas                  → Listar con filtros
  GET  /api/admin/reservas/{id}             → Detalle
  PATCH /api/admin/reservas/{id}/confirmar  → Confirmar
  PATCH /api/admin/reservas/{id}/rechazar   → Rechazar
  PATCH /api/admin/reservas/{id}/cancelar   → Cancelar
  PUT  /api/admin/reservas/{id}             → Modificar

Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 12.3
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from modules.autenticacion.infrastructure.auth_middleware import require_auth
from modules.disponibilidad.infrastructure.supabase_disponibilidad_repository import (
    SupabaseDisponibilidadRepository,
)
from modules.notificaciones.infrastructure.email_service import SmtpNotificacionesService
from modules.precios.infrastructure.supabase_precios_repository import (
    SupabaseFestivosRepository,
    SupabasePreciosRepository,
)
from modules.reservas.application.cancelar_reserva import CancelarReservaUseCase
from modules.reservas.application.confirmar_reserva import ConfirmarReservaUseCase
from modules.reservas.application.crear_reserva import CrearReservaUseCase
from modules.reservas.application.rechazar_reserva import RechazarReservaUseCase
from modules.reservas.domain.reserva import (
    DatosCliente,
    DatosMascota,
    EstadoReserva,
    Reserva,
    TipoServicio,
    TipoTarifa,
)
from modules.reservas.infrastructure.supabase_reserva_repository import (
    SupabaseReservaRepository,
)
from shared.domain.result import Err, Ok
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Dependencias
# ---------------------------------------------------------------------------

def get_reserva_repo() -> SupabaseReservaRepository:
    return SupabaseReservaRepository()


def get_disponibilidad_repo() -> SupabaseDisponibilidadRepository:
    return SupabaseDisponibilidadRepository()


def get_notificaciones_service() -> SmtpNotificacionesService:
    return SmtpNotificacionesService()


def get_precios_repo() -> SupabasePreciosRepository:
    return SupabasePreciosRepository()


def get_festivos_repo() -> SupabaseFestivosRepository:
    return SupabaseFestivosRepository()


# ---------------------------------------------------------------------------
# Schemas Pydantic
# ---------------------------------------------------------------------------

class DatosClienteSchema(BaseModel):
    nombre: str
    telefono: str
    email: str
    direccion: Optional[str] = None


class DatosMascotaSchema(BaseModel):
    nombre: str
    tamano: str
    raza: Optional[str] = None
    notas: Optional[str] = None


class CrearReservaSchema(BaseModel):
    servicio: str
    fecha_desde: date
    fecha_hasta: date
    tarifa: str
    tramo_horario: str
    perro_extra: bool = False
    transporte: Optional[str] = None
    acepta_privacidad: bool
    cliente: DatosClienteSchema
    mascota: DatosMascotaSchema


class ModificarReservaSchema(BaseModel):
    servicio: Optional[str] = None
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    tarifa: Optional[str] = None
    tramo_horario: Optional[str] = None
    perro_extra: Optional[bool] = None
    transporte: Optional[str] = None
    precio_total: Optional[float] = None
    cliente: Optional[DatosClienteSchema] = None
    mascota: Optional[DatosMascotaSchema] = None


class ReservaSchema(BaseModel):
    id: str
    servicio: str
    fecha_desde: date
    fecha_hasta: date
    tarifa: str
    tramo_horario: str
    perro_extra: bool
    estado: str
    precio_total: float
    transporte: Optional[str] = None
    nombre_dueno: str
    telefono: str
    email: str
    direccion: Optional[str] = None
    nombre_perro: str
    tamano: str
    raza: Optional[str] = None
    notas: Optional[str] = None


def _reserva_to_schema(reserva: Reserva) -> ReservaSchema:
    return ReservaSchema(
        id=reserva.id,
        servicio=reserva.servicio.value if hasattr(reserva.servicio, "value") else reserva.servicio,
        fecha_desde=reserva.fecha_desde,
        fecha_hasta=reserva.fecha_hasta,
        tarifa=reserva.tarifa.value if hasattr(reserva.tarifa, "value") else reserva.tarifa,
        tramo_horario=reserva.tramo_horario,
        perro_extra=reserva.perro_extra,
        estado=reserva.estado.value if hasattr(reserva.estado, "value") else reserva.estado,
        precio_total=reserva.precio_total,
        transporte=reserva.transporte,
        nombre_dueno=reserva.cliente.nombre,
        telefono=reserva.cliente.telefono,
        email=reserva.cliente.email,
        direccion=reserva.cliente.direccion,
        nombre_perro=reserva.mascota.nombre,
        tamano=reserva.mascota.tamano,
        raza=reserva.mascota.raza,
        notas=reserva.mascota.notas,
    )


# ---------------------------------------------------------------------------
# Endpoints públicos
# ---------------------------------------------------------------------------

@router.post("/api/reservas", response_model=ReservaSchema, status_code=201)
async def crear_reserva(
    body: CrearReservaSchema,
    reserva_repo: SupabaseReservaRepository = Depends(get_reserva_repo),
    disponibilidad_repo: SupabaseDisponibilidadRepository = Depends(get_disponibilidad_repo),
    precios_repo: SupabasePreciosRepository = Depends(get_precios_repo),
    festivos_repo: SupabaseFestivosRepository = Depends(get_festivos_repo),
    notificaciones: SmtpNotificacionesService = Depends(get_notificaciones_service),
):
    """
    Crea una nueva reserva. Endpoint público — no requiere autenticación.
    """
    datos = {
        "servicio": body.servicio,
        "fecha_desde": body.fecha_desde,
        "fecha_hasta": body.fecha_hasta,
        "tarifa": body.tarifa,
        "tramo_horario": body.tramo_horario,
        "perro_extra": body.perro_extra,
        "transporte": body.transporte,
        "acepta_privacidad": body.acepta_privacidad,
        "cliente": body.cliente.model_dump(),
        "mascota": body.mascota.model_dump(),
    }

    use_case = CrearReservaUseCase(
        reserva_repo=reserva_repo,
        disponibilidad_service=disponibilidad_repo,
        precios_repo=precios_repo,
        festivos_repo=festivos_repo,
        notificaciones_service=notificaciones,
    )
    resultado = await use_case.execute(datos)

    if isinstance(resultado, Err):
        raise HTTPException(
            status_code=resultado.error.http_status,
            detail=resultado.error.message,
        )

    return _reserva_to_schema(resultado.value)


# ---------------------------------------------------------------------------
# Endpoints privados (requieren JWT)
# ---------------------------------------------------------------------------

@router.get("/api/admin/reservas", response_model=list[ReservaSchema])
async def listar_reservas(
    estado: Optional[str] = None,
    servicio: Optional[str] = None,
    reserva_repo: SupabaseReservaRepository = Depends(get_reserva_repo),
    _usuario: dict = Depends(require_auth),
):
    """Lista reservas con filtros opcionales. Requiere JWT."""
    resultado = await reserva_repo.listar(estado=estado, servicio=servicio)
    if isinstance(resultado, Err):
        raise HTTPException(status_code=503, detail="Error al listar reservas")
    return [_reserva_to_schema(r) for r in resultado.value]


@router.get("/api/admin/reservas/{reserva_id}", response_model=ReservaSchema)
async def obtener_reserva(
    reserva_id: str,
    reserva_repo: SupabaseReservaRepository = Depends(get_reserva_repo),
    _usuario: dict = Depends(require_auth),
):
    """Detalle de una reserva. Requiere JWT."""
    resultado = await reserva_repo.obtener_por_id(reserva_id)
    if isinstance(resultado, Err):
        raise HTTPException(
            status_code=resultado.error.http_status,
            detail=resultado.error.message,
        )
    return _reserva_to_schema(resultado.value)


@router.patch("/api/admin/reservas/{reserva_id}/confirmar", response_model=ReservaSchema)
async def confirmar_reserva(
    reserva_id: str,
    reserva_repo: SupabaseReservaRepository = Depends(get_reserva_repo),
    notificaciones: SmtpNotificacionesService = Depends(get_notificaciones_service),
    _usuario: dict = Depends(require_auth),
):
    """Confirma una reserva pendiente. Requiere JWT."""
    use_case = ConfirmarReservaUseCase(
        reserva_repo=reserva_repo,
        notificaciones_service=notificaciones,
    )
    resultado = await use_case.execute(reserva_id)
    if isinstance(resultado, Err):
        raise HTTPException(
            status_code=resultado.error.http_status,
            detail=resultado.error.message,
        )
    return _reserva_to_schema(resultado.value)


@router.patch("/api/admin/reservas/{reserva_id}/rechazar", response_model=ReservaSchema)
async def rechazar_reserva(
    reserva_id: str,
    reserva_repo: SupabaseReservaRepository = Depends(get_reserva_repo),
    disponibilidad_repo: SupabaseDisponibilidadRepository = Depends(get_disponibilidad_repo),
    notificaciones: SmtpNotificacionesService = Depends(get_notificaciones_service),
    _usuario: dict = Depends(require_auth),
):
    """Rechaza una reserva pendiente. Requiere JWT."""
    use_case = RechazarReservaUseCase(
        reserva_repo=reserva_repo,
        disponibilidad_service=disponibilidad_repo,
        notificaciones_service=notificaciones,
    )
    resultado = await use_case.execute(reserva_id)
    if isinstance(resultado, Err):
        raise HTTPException(
            status_code=resultado.error.http_status,
            detail=resultado.error.message,
        )
    return _reserva_to_schema(resultado.value)


@router.patch("/api/admin/reservas/{reserva_id}/cancelar", response_model=ReservaSchema)
async def cancelar_reserva(
    reserva_id: str,
    reserva_repo: SupabaseReservaRepository = Depends(get_reserva_repo),
    disponibilidad_repo: SupabaseDisponibilidadRepository = Depends(get_disponibilidad_repo),
    notificaciones: SmtpNotificacionesService = Depends(get_notificaciones_service),
    _usuario: dict = Depends(require_auth),
):
    """Cancela una reserva confirmada. Requiere JWT."""
    use_case = CancelarReservaUseCase(
        reserva_repo=reserva_repo,
        disponibilidad_service=disponibilidad_repo,
        notificaciones_service=notificaciones,
    )
    resultado = await use_case.execute(reserva_id)
    if isinstance(resultado, Err):
        raise HTTPException(
            status_code=resultado.error.http_status,
            detail=resultado.error.message,
        )
    return _reserva_to_schema(resultado.value)


@router.put("/api/admin/reservas/{reserva_id}", response_model=ReservaSchema)
async def modificar_reserva(
    reserva_id: str,
    body: ModificarReservaSchema,
    reserva_repo: SupabaseReservaRepository = Depends(get_reserva_repo),
    _usuario: dict = Depends(require_auth),
):
    """Modifica los datos de una reserva confirmada. Requiere JWT."""
    # Obtener reserva actual
    resultado = await reserva_repo.obtener_por_id(reserva_id)
    if isinstance(resultado, Err):
        raise HTTPException(
            status_code=resultado.error.http_status,
            detail=resultado.error.message,
        )

    reserva_actual = resultado.value

    # Aplicar cambios parciales
    cliente = reserva_actual.cliente
    mascota = reserva_actual.mascota

    if body.cliente:
        cliente = DatosCliente(
            nombre=body.cliente.nombre,
            telefono=body.cliente.telefono,
            email=body.cliente.email,
            direccion=body.cliente.direccion,
        )
    if body.mascota:
        mascota = DatosMascota(
            nombre=body.mascota.nombre,
            tamano=body.mascota.tamano,
            raza=body.mascota.raza,
            notas=body.mascota.notas,
        )

    reserva_modificada = Reserva(
        id=reserva_actual.id,
        servicio=TipoServicio(body.servicio) if body.servicio else reserva_actual.servicio,
        fecha_desde=body.fecha_desde or reserva_actual.fecha_desde,
        fecha_hasta=body.fecha_hasta or reserva_actual.fecha_hasta,
        tarifa=TipoTarifa(body.tarifa) if body.tarifa else reserva_actual.tarifa,
        tramo_horario=body.tramo_horario or reserva_actual.tramo_horario,
        perro_extra=body.perro_extra if body.perro_extra is not None else reserva_actual.perro_extra,
        estado=reserva_actual.estado,
        precio_total=body.precio_total if body.precio_total is not None else reserva_actual.precio_total,
        cliente=cliente,
        mascota=mascota,
        acepta_privacidad=reserva_actual.acepta_privacidad,
        transporte=body.transporte if body.transporte is not None else reserva_actual.transporte,
        creada_en=reserva_actual.creada_en,
    )

    resultado_update = await reserva_repo.actualizar(reserva_modificada)
    if isinstance(resultado_update, Err):
        raise HTTPException(
            status_code=resultado_update.error.http_status,
            detail=resultado_update.error.message,
        )

    logger.info("reserva_router_modificada", reserva_id=reserva_id)
    return _reserva_to_schema(resultado_update.value)

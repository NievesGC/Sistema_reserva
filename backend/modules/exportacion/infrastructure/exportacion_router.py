"""
Router FastAPI para el módulo de exportación.

Endpoint privado (requiere JWT):
  GET /api/admin/exportar?formato=csv|excel|pdf&desde=&hasta=&servicio=&estado=

Consulta reservas con los filtros indicados y devuelve el archivo
en el formato solicitado con el Content-Type correcto.

Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse

from modules.autenticacion.infrastructure.auth_middleware import require_auth
from modules.exportacion.application.exportar_reservas import (
    ExportarCSV,
    ExportarExcel,
    ExportarPDF,
)
from modules.reservas.infrastructure.supabase_reserva_repository import (
    SupabaseReservaRepository,
)
from shared.domain.result import Err
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


def get_reserva_repo() -> SupabaseReservaRepository:
    return SupabaseReservaRepository()


def _reserva_a_dict(reserva) -> dict:
    """Convierte una Reserva al dict de exportación."""
    return {
        "id": reserva.id,
        "servicio": reserva.servicio.value if hasattr(reserva.servicio, "value") else reserva.servicio,
        "fecha_desde": str(reserva.fecha_desde),
        "fecha_hasta": str(reserva.fecha_hasta),
        "nombre_dueno": reserva.cliente.nombre,
        "telefono": reserva.cliente.telefono,
        "email": reserva.cliente.email,
        "nombre_perro": reserva.mascota.nombre,
        "estado": reserva.estado.value if hasattr(reserva.estado, "value") else reserva.estado,
        "precio_total": reserva.precio_total,
        "tarifa": reserva.tarifa.value if hasattr(reserva.tarifa, "value") else reserva.tarifa,
        "tramo_horario": reserva.tramo_horario,
    }


@router.get("/api/admin/exportar")
async def exportar_reservas(
    formato: str = Query(default="csv", description="Formato de exportación: csv, excel, pdf"),
    desde: Optional[date] = Query(default=None, description="Fecha de inicio del filtro"),
    hasta: Optional[date] = Query(default=None, description="Fecha de fin del filtro"),
    servicio: Optional[str] = Query(default=None, description="Filtrar por servicio"),
    estado: Optional[str] = Query(default=None, description="Filtrar por estado"),
    reserva_repo: SupabaseReservaRepository = Depends(get_reserva_repo),
    _usuario: dict = Depends(require_auth),
):
    """
    Exporta reservas en el formato indicado con filtros opcionales.

    Formatos soportados: csv, excel, pdf.
    Endpoint privado — requiere token JWT válido.

    Requisito 11.5: Muestra el número total de registros a exportar.
    """
    # Validar formato
    formatos_validos = {"csv", "excel", "pdf"}
    if formato.lower() not in formatos_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Formato inválido. Use: {', '.join(formatos_validos)}",
        )

    # Obtener reservas con filtros
    resultado = await reserva_repo.listar(estado=estado, servicio=servicio)
    if isinstance(resultado, Err):
        raise HTTPException(status_code=503, detail="Error al obtener reservas")

    reservas = resultado.value

    # Aplicar filtro de fechas si se especificó
    if desde or hasta:
        reservas_filtradas = []
        for r in reservas:
            if desde and r.fecha_desde < desde:
                continue
            if hasta and r.fecha_hasta > hasta:
                continue
            reservas_filtradas.append(r)
        reservas = reservas_filtradas

    # Convertir a dicts para los use cases de exportación
    reservas_dicts = [_reserva_a_dict(r) for r in reservas]
    total = len(reservas_dicts)

    logger.info(
        "exportar_reservas_inicio",
        formato=formato,
        total_registros=total,
    )

    # Exportar según formato
    formato_lower = formato.lower()

    if formato_lower == "csv":
        use_case = ExportarCSV()
        csv_output = use_case.execute(reservas_dicts)
        content = csv_output.getvalue()

        return Response(
            content=content.encode("utf-8-sig"),  # UTF-8 con BOM para Excel
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": "attachment; filename=reservas.csv",
                "X-Total-Records": str(total),
            },
        )

    elif formato_lower == "excel":
        use_case = ExportarExcel()
        try:
            excel_bytes = use_case.execute(reservas_dicts)
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc))

        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=reservas.xlsx",
                "X-Total-Records": str(total),
            },
        )

    elif formato_lower == "pdf":
        use_case = ExportarPDF()
        try:
            pdf_bytes = use_case.execute(reservas_dicts)
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc))

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=reservas.pdf",
                "X-Total-Records": str(total),
            },
        )

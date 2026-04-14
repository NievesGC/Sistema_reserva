"""
Implementación del repositorio de reservas usando Supabase.

Implementa IReservaRepository consultando y modificando la tabla
`reservas` de Supabase.

Requisitos: 7.1, 7.2, 7.3, 7.7, 12.3
"""

from __future__ import annotations

from datetime import datetime

from modules.reservas.domain.reserva import (
    DatosCliente,
    DatosMascota,
    EstadoReserva,
    Reserva,
    TipoServicio,
    TipoTarifa,
)
from shared.domain.result import Err, Ok, Result, error_bd, reserva_no_encontrada
from shared.infrastructure.logger import get_logger
from shared.infrastructure.supabase_client import get_supabase_client

logger = get_logger(__name__)


def _row_a_reserva(row: dict) -> Reserva:
    """Convierte una fila de Supabase al dataclass Reserva."""
    from datetime import date
    cliente = DatosCliente(
        nombre=row.get("nombre_dueno", ""),
        telefono=row.get("telefono", ""),
        email=row.get("email", ""),
        direccion=row.get("direccion"),
    )
    mascota = DatosMascota(
        nombre=row.get("nombre_perro", ""),
        tamano=row.get("tamano", ""),
        raza=row.get("raza"),
        notas=row.get("notas"),
    )

    def _parse_date(val):
        if isinstance(val, date):
            return val
        if isinstance(val, str):
            return date.fromisoformat(val[:10])
        return val

    def _parse_dt(val):
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        return datetime.utcnow()

    return Reserva(
        id=row["id"],
        servicio=TipoServicio(row["servicio"]),
        fecha_desde=_parse_date(row["fecha_desde"]),
        fecha_hasta=_parse_date(row["fecha_hasta"]),
        tarifa=TipoTarifa(row["tarifa"]),
        tramo_horario=row.get("tramo_horario", ""),
        perro_extra=row.get("perro_extra", False),
        estado=EstadoReserva(row["estado"]),
        precio_total=float(row.get("precio_total", 0)),
        cliente=cliente,
        mascota=mascota,
        acepta_privacidad=row.get("acepta_privacidad", True),
        transporte=row.get("transporte"),
        creada_en=_parse_dt(row.get("created_at")),
        actualizada_en=_parse_dt(row.get("updated_at")),
    )


class SupabaseReservaRepository:
    """
    Implementación de IReservaRepository usando Supabase (PostgreSQL).
    """

    def _get_client(self):
        return get_supabase_client()

    async def crear(self, reserva: Reserva) -> Result:
        """
        Inserta una nueva reserva en la tabla reservas.

        Returns:
            Ok(Reserva) con la reserva creada.
            Err(DomainError) si falla la inserción.
        """
        try:
            client = self._get_client()
            data = {
                "id": reserva.id,
                "servicio": reserva.servicio.value if hasattr(reserva.servicio, "value") else reserva.servicio,
                "fecha_desde": str(reserva.fecha_desde),
                "fecha_hasta": str(reserva.fecha_hasta),
                "tarifa": reserva.tarifa.value if hasattr(reserva.tarifa, "value") else reserva.tarifa,
                "tramo_horario": reserva.tramo_horario,
                "perro_extra": reserva.perro_extra,
                "estado": reserva.estado.value if hasattr(reserva.estado, "value") else reserva.estado,
                "precio_total": reserva.precio_total,
                "nombre_dueno": reserva.cliente.nombre,
                "telefono": reserva.cliente.telefono,
                "email": reserva.cliente.email,
                "direccion": reserva.cliente.direccion,
                "nombre_perro": reserva.mascota.nombre,
                "tamano": reserva.mascota.tamano,
                "raza": reserva.mascota.raza,
                "notas": reserva.mascota.notas,
                "transporte": reserva.transporte,
                "acepta_privacidad": reserva.acepta_privacidad,
            }
            resp = client.table("reservas").insert(data).execute()
            if resp.data:
                return Ok(_row_a_reserva(resp.data[0]))
            return Err(error_bd("No se pudo crear la reserva"))
        except Exception as exc:
            logger.error(
                "reserva_repo_crear_error",
                reserva_id=reserva.id,
                error_type=type(exc).__name__,
            )
            return Err(error_bd())

    async def obtener_por_id(self, reserva_id: str) -> Result:
        """
        Recupera una reserva por su UUID.

        Returns:
            Ok(Reserva) si existe.
            Err(reserva_no_encontrada) si no existe.
        """
        try:
            client = self._get_client()
            resp = (
                client.table("reservas")
                .select("*")
                .eq("id", reserva_id)
                .execute()
            )
            if not resp.data:
                return Err(reserva_no_encontrada(reserva_id))
            return Ok(_row_a_reserva(resp.data[0]))
        except Exception as exc:
            logger.error(
                "reserva_repo_obtener_error",
                reserva_id=reserva_id,
                error_type=type(exc).__name__,
            )
            return Err(error_bd())

    async def listar(
        self,
        estado: str | None = None,
        servicio: str | None = None,
    ) -> Result:
        """
        Lista reservas con filtros opcionales.

        Returns:
            Ok(list[Reserva]) con las reservas filtradas.
        """
        try:
            client = self._get_client()
            query = client.table("reservas").select("*")

            if estado:
                query = query.eq("estado", estado)
            if servicio:
                query = query.eq("servicio", servicio)

            resp = query.order("created_at", desc=True).execute()
            reservas = [_row_a_reserva(row) for row in (resp.data or [])]
            return Ok(reservas)
        except Exception as exc:
            logger.error(
                "reserva_repo_listar_error",
                error_type=type(exc).__name__,
            )
            return Err(error_bd())

    async def actualizar_estado(
        self,
        reserva_id: str,
        nuevo_estado: EstadoReserva,
    ) -> Result:
        """
        Actualiza el estado de una reserva.

        Returns:
            Ok(Reserva) con la reserva actualizada.
        """
        try:
            client = self._get_client()
            estado_val = nuevo_estado.value if hasattr(nuevo_estado, "value") else nuevo_estado
            resp = (
                client.table("reservas")
                .update({"estado": estado_val, "updated_at": datetime.utcnow().isoformat()})
                .eq("id", reserva_id)
                .execute()
            )
            if not resp.data:
                return Err(reserva_no_encontrada(reserva_id))
            return Ok(_row_a_reserva(resp.data[0]))
        except Exception as exc:
            logger.error(
                "reserva_repo_actualizar_estado_error",
                reserva_id=reserva_id,
                error_type=type(exc).__name__,
            )
            return Err(error_bd())

    async def actualizar(self, reserva: Reserva) -> Result:
        """
        Actualiza todos los campos modificables de una reserva.

        Returns:
            Ok(Reserva) con la reserva actualizada.
        """
        try:
            client = self._get_client()
            data = {
                "servicio": reserva.servicio.value if hasattr(reserva.servicio, "value") else reserva.servicio,
                "fecha_desde": str(reserva.fecha_desde),
                "fecha_hasta": str(reserva.fecha_hasta),
                "tarifa": reserva.tarifa.value if hasattr(reserva.tarifa, "value") else reserva.tarifa,
                "tramo_horario": reserva.tramo_horario,
                "perro_extra": reserva.perro_extra,
                "estado": reserva.estado.value if hasattr(reserva.estado, "value") else reserva.estado,
                "precio_total": reserva.precio_total,
                "nombre_dueno": reserva.cliente.nombre,
                "telefono": reserva.cliente.telefono,
                "email": reserva.cliente.email,
                "direccion": reserva.cliente.direccion,
                "nombre_perro": reserva.mascota.nombre,
                "tamano": reserva.mascota.tamano,
                "raza": reserva.mascota.raza,
                "notas": reserva.mascota.notas,
                "transporte": reserva.transporte,
                "updated_at": datetime.utcnow().isoformat(),
            }
            resp = (
                client.table("reservas")
                .update(data)
                .eq("id", reserva.id)
                .execute()
            )
            if not resp.data:
                return Err(reserva_no_encontrada(reserva.id))
            return Ok(_row_a_reserva(resp.data[0]))
        except Exception as exc:
            logger.error(
                "reserva_repo_actualizar_error",
                reserva_id=reserva.id,
                error_type=type(exc).__name__,
            )
            return Err(error_bd())

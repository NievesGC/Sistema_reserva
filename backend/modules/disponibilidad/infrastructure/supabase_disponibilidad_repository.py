"""
Implementación del servicio de disponibilidad usando Supabase.

Implementa IDisponibilidadService consultando y modificando la tabla
`disponibilidad` de Supabase. Las plazas máximas se leen de la tabla
`configuracion` (clave: `plazas_max_{servicio}`).

Convenio de plazas_por_dia:
  - Valor >= 0: plazas libres disponibles.
  - Valor == -1: día bloqueado (sin disponibilidad por bloqueo explícito).

Requisitos: 2.2, 2.6, 2.8, 8.4, 8.5
"""

from __future__ import annotations

from datetime import date, timedelta

from modules.disponibilidad.domain.disponibilidad import (
    IDisponibilidadService,
    ResultadoDisponibilidad,
)
from shared.infrastructure.logger import get_logger
from shared.infrastructure.supabase_client import get_supabase_client

logger = get_logger(__name__)

# Plazas máximas por defecto si no hay configuración en BD
_PLAZAS_MAX_DEFAULT = 5


class SupabaseDisponibilidadRepository:
    """
    Implementación de IDisponibilidadService usando Supabase (PostgreSQL).

    Gestiona la tabla `disponibilidad` con columnas:
        servicio, fecha, plazas_ocupadas, bloqueado
    """

    def _get_client(self):
        return get_supabase_client()

    def _get_plazas_max(self, servicio: str) -> int:
        """
        Lee el número máximo de plazas para el servicio desde la tabla configuracion.
        Devuelve el valor por defecto si no existe la clave.
        """
        try:
            client = self._get_client()
            clave = f"plazas_max_{servicio}"
            resp = (
                client.table("configuracion")
                .select("valor")
                .eq("clave", clave)
                .execute()
            )
            if resp.data:
                return int(resp.data[0]["valor"])
        except Exception as exc:
            logger.error(
                "disponibilidad_repo_plazas_max_error",
                servicio=servicio,
                error_type=type(exc).__name__,
            )
        return _PLAZAS_MAX_DEFAULT

    def _iter_fechas(self, fecha_desde: date, fecha_hasta: date):
        """Genera todas las fechas del rango [fecha_desde, fecha_hasta] inclusive."""
        dia = fecha_desde
        while dia <= fecha_hasta:
            yield dia
            dia += timedelta(days=1)

    async def verificar_disponibilidad_rango(
        self,
        servicio: str,
        fecha_desde: date,
        fecha_hasta: date,
    ) -> ResultadoDisponibilidad:
        """
        Consulta la disponibilidad para cada día del rango.

        Para días sin registro en BD se asume plazas_ocupadas=0 y bloqueado=False.
        Los días bloqueados se representan con plazas=-1 en plazas_por_dia.
        """
        client = self._get_client()
        plazas_max = self._get_plazas_max(servicio)

        # Consultar registros existentes en el rango
        resp = (
            client.table("disponibilidad")
            .select("fecha, plazas_ocupadas, bloqueado")
            .eq("servicio", servicio)
            .gte("fecha", fecha_desde.isoformat())
            .lte("fecha", fecha_hasta.isoformat())
            .execute()
        )

        # Indexar por fecha ISO
        registros: dict[str, dict] = {}
        for row in (resp.data or []):
            registros[row["fecha"]] = row

        plazas_por_dia: dict[str, int] = {}
        dias_sin_disponibilidad: list[date] = []

        for dia in self._iter_fechas(fecha_desde, fecha_hasta):
            dia_iso = dia.isoformat()
            row = registros.get(dia_iso)

            if row and row.get("bloqueado"):
                # Día bloqueado: convenio -1
                plazas_por_dia[dia_iso] = -1
                dias_sin_disponibilidad.append(dia)
            else:
                ocupadas = row["plazas_ocupadas"] if row else 0
                libres = max(plazas_max - ocupadas, 0)
                plazas_por_dia[dia_iso] = libres
                if libres == 0:
                    dias_sin_disponibilidad.append(dia)

        disponible = len(dias_sin_disponibilidad) == 0
        return ResultadoDisponibilidad(
            disponible=disponible,
            plazas_por_dia=plazas_por_dia,
            dias_sin_disponibilidad=dias_sin_disponibilidad,
        )

    async def reservar_plazas(
        self,
        servicio: str,
        fecha_desde: date,
        fecha_hasta: date,
    ) -> None:
        """
        Incrementa plazas_ocupadas en 1 para cada día del rango.

        Usa upsert para crear el registro si no existe.
        """
        client = self._get_client()

        for dia in self._iter_fechas(fecha_desde, fecha_hasta):
            dia_iso = dia.isoformat()
            # Leer valor actual
            resp = (
                client.table("disponibilidad")
                .select("plazas_ocupadas")
                .eq("servicio", servicio)
                .eq("fecha", dia_iso)
                .execute()
            )
            ocupadas_actual = resp.data[0]["plazas_ocupadas"] if resp.data else 0

            client.table("disponibilidad").upsert(
                {
                    "servicio": servicio,
                    "fecha": dia_iso,
                    "plazas_ocupadas": ocupadas_actual + 1,
                    "bloqueado": False,
                },
                on_conflict="servicio,fecha",
            ).execute()

        logger.info(
            "disponibilidad_repo_plazas_reservadas",
            servicio=servicio,
        )

    async def liberar_plazas(
        self,
        servicio: str,
        fecha_desde: date,
        fecha_hasta: date,
    ) -> None:
        """
        Decrementa plazas_ocupadas en 1 para cada día del rango (mínimo 0).
        """
        client = self._get_client()

        for dia in self._iter_fechas(fecha_desde, fecha_hasta):
            dia_iso = dia.isoformat()
            resp = (
                client.table("disponibilidad")
                .select("plazas_ocupadas")
                .eq("servicio", servicio)
                .eq("fecha", dia_iso)
                .execute()
            )
            ocupadas_actual = resp.data[0]["plazas_ocupadas"] if resp.data else 0
            nuevas_ocupadas = max(ocupadas_actual - 1, 0)

            client.table("disponibilidad").upsert(
                {
                    "servicio": servicio,
                    "fecha": dia_iso,
                    "plazas_ocupadas": nuevas_ocupadas,
                },
                on_conflict="servicio,fecha",
            ).execute()

        logger.info(
            "disponibilidad_repo_plazas_liberadas",
            servicio=servicio,
        )

    async def bloquear_dia(self, servicio: str, fecha: date) -> None:
        """Marca el día como bloqueado (bloqueado=True) via upsert."""
        client = self._get_client()
        client.table("disponibilidad").upsert(
            {
                "servicio": servicio,
                "fecha": fecha.isoformat(),
                "bloqueado": True,
            },
            on_conflict="servicio,fecha",
        ).execute()
        logger.info("disponibilidad_repo_dia_bloqueado", servicio=servicio)

    async def desbloquear_dia(self, servicio: str, fecha: date) -> None:
        """Elimina el bloqueo del día (bloqueado=False) via upsert."""
        client = self._get_client()
        client.table("disponibilidad").upsert(
            {
                "servicio": servicio,
                "fecha": fecha.isoformat(),
                "bloqueado": False,
            },
            on_conflict="servicio,fecha",
        ).execute()
        logger.info("disponibilidad_repo_dia_desbloqueado", servicio=servicio)

"""
Implementación de los repositorios de precios y festivos usando Supabase.

Implementa IPreciosRepository e IFestivosRepository accediendo a las
tablas 'configuracion' y 'festivos' de Supabase.

La tabla 'configuracion' almacena pares clave-valor donde la clave sigue
el patrón 'precios_{servicio}_{campo}' (ej: 'precios_paseos_precio_normal').

Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4
"""

from __future__ import annotations

import json
import uuid
from datetime import date

from modules.precios.domain.festivo import Festivo
from modules.precios.domain.tarifa import ConfiguracionPrecios
from shared.domain.result import DomainError, error_bd
from shared.infrastructure.logger import get_logger
from shared.infrastructure.supabase_client import get_supabase_client

logger = get_logger(__name__)


class SupabasePreciosRepository:
    """
    Repositorio de configuración de precios sobre Supabase.

    La configuración se almacena en la tabla 'configuracion' como un
    objeto JSON serializado bajo la clave 'precios_{servicio}'.
    """

    def __init__(self, supabase_client=None) -> None:
        # Permite inyectar un cliente mock en tests
        self._client = supabase_client or get_supabase_client()

    async def obtener_configuracion(self, servicio: str) -> ConfiguracionPrecios:
        """
        Obtiene la configuración de precios para el servicio indicado.

        Args:
            servicio: 'paseos' | 'guarderia' | 'alojamiento'

        Returns:
            ConfiguracionPrecios con los valores actuales.

        Raises:
            DomainError(ERROR_BD): Si falla la consulta a Supabase.
        """
        clave = f"precios_{servicio}"
        try:
            response = (
                self._client.table("configuracion")
                .select("valor")
                .eq("clave", clave)
                .execute()
            )
            if response.data:
                datos = json.loads(response.data[0]["valor"])
                return ConfiguracionPrecios(
                    servicio=servicio,
                    precio_normal=float(datos.get("precio_normal", 0)),
                    precio_cachorros=float(datos.get("precio_cachorros", 0)),
                    precio_festivo=float(datos.get("precio_festivo", 0)),
                    precio_perro_extra=float(datos.get("precio_perro_extra", 0)),
                    plazas_max=int(datos.get("plazas_max", 5)),
                    precio_recogida=float(datos["precio_recogida"]) if datos.get("precio_recogida") is not None else None,
                    precio_recogida_entrega=float(datos["precio_recogida_entrega"]) if datos.get("precio_recogida_entrega") is not None else None,
                )
            # Si no existe, devolver configuración por defecto
            return _config_por_defecto(servicio)

        except Exception as exc:
            logger.error("precios_repo_obtener_config_error", servicio=servicio, error_type=type(exc).__name__)
            raise error_bd(f"Error al obtener configuración de precios para '{servicio}'")

    async def actualizar_configuracion(
        self, servicio: str, config: ConfiguracionPrecios
    ) -> None:
        """
        Persiste la configuración de precios para el servicio.

        Args:
            servicio: Identificador del servicio.
            config:   Nueva configuración a guardar.

        Raises:
            DomainError(ERROR_BD): Si falla la escritura en Supabase.
        """
        clave = f"precios_{servicio}"
        datos = {
            "precio_normal": config.precio_normal,
            "precio_cachorros": config.precio_cachorros,
            "precio_festivo": config.precio_festivo,
            "precio_perro_extra": config.precio_perro_extra,
            "plazas_max": config.plazas_max,
            "precio_recogida": config.precio_recogida,
            "precio_recogida_entrega": config.precio_recogida_entrega,
        }
        try:
            self._client.table("configuracion").upsert(
                {"clave": clave, "valor": json.dumps(datos)}
            ).execute()
            logger.info("precios_repo_config_actualizada", servicio=servicio)
        except Exception as exc:
            logger.error("precios_repo_actualizar_config_error", servicio=servicio, error_type=type(exc).__name__)
            raise error_bd(f"Error al actualizar configuración de precios para '{servicio}'")


class SupabaseFestivosRepository:
    """
    Repositorio de días festivos sobre Supabase.

    Accede a la tabla 'festivos' con columnas: id, fecha, nombre, activo.
    """

    def __init__(self, supabase_client=None) -> None:
        self._client = supabase_client or get_supabase_client()

    async def listar_festivos(self) -> list[Festivo]:
        """
        Devuelve todos los festivos activos.

        Returns:
            Lista de objetos Festivo.

        Raises:
            DomainError(ERROR_BD): Si falla la consulta.
        """
        try:
            response = (
                self._client.table("festivos")
                .select("*")
                .eq("activo", True)
                .order("fecha")
                .execute()
            )
            return [
                Festivo(
                    id=row["id"],
                    fecha=date.fromisoformat(row["fecha"]),
                    nombre=row["nombre"],
                    activo=row["activo"],
                )
                for row in (response.data or [])
            ]
        except Exception as exc:
            logger.error("festivos_repo_listar_error", error_type=type(exc).__name__)
            raise error_bd("Error al listar festivos")

    async def crear_festivo(self, fecha: date, nombre: str) -> Festivo:
        """
        Crea un nuevo festivo en la base de datos.

        Args:
            fecha:  Fecha del festivo.
            nombre: Nombre descriptivo.

        Returns:
            Festivo creado con su id asignado.

        Raises:
            DomainError(ERROR_BD): Si falla la inserción.
        """
        try:
            nuevo_id = str(uuid.uuid4())
            response = (
                self._client.table("festivos")
                .insert({
                    "id": nuevo_id,
                    "fecha": fecha.isoformat(),
                    "nombre": nombre,
                    "activo": True,
                })
                .execute()
            )
            row = response.data[0]
            logger.info("festivos_repo_creado", festivo_id=nuevo_id)
            return Festivo(
                id=row["id"],
                fecha=date.fromisoformat(row["fecha"]),
                nombre=row["nombre"],
                activo=row["activo"],
            )
        except Exception as exc:
            logger.error("festivos_repo_crear_error", error_type=type(exc).__name__)
            raise error_bd("Error al crear festivo")

    async def eliminar_festivo(self, id: str) -> None:
        """
        Elimina el festivo con el id indicado.

        Args:
            id: UUID del festivo a eliminar.

        Raises:
            DomainError(ERROR_BD): Si falla la eliminación.
        """
        try:
            self._client.table("festivos").delete().eq("id", id).execute()
            logger.info("festivos_repo_eliminado", festivo_id=id)
        except Exception as exc:
            logger.error("festivos_repo_eliminar_error", festivo_id=id, error_type=type(exc).__name__)
            raise error_bd(f"Error al eliminar festivo '{id}'")


# ---------------------------------------------------------------------------
# Configuraciones por defecto
# ---------------------------------------------------------------------------

def _config_por_defecto(servicio: str) -> ConfiguracionPrecios:
    """Devuelve una configuración de precios por defecto para el servicio."""
    defaults = {
        'paseos': ConfiguracionPrecios(
            servicio='paseos',
            precio_normal=15.0,
            precio_cachorros=12.0,
            precio_festivo=5.0,
            precio_perro_extra=8.0,
            plazas_max=6,
        ),
        'guarderia': ConfiguracionPrecios(
            servicio='guarderia',
            precio_normal=20.0,
            precio_cachorros=16.0,
            precio_festivo=5.0,
            precio_perro_extra=10.0,
            plazas_max=8,
        ),
        'alojamiento': ConfiguracionPrecios(
            servicio='alojamiento',
            precio_normal=35.0,
            precio_cachorros=28.0,
            precio_festivo=10.0,
            precio_perro_extra=15.0,
            plazas_max=4,
            precio_recogida=12.0,
            precio_recogida_entrega=20.0,
        ),
    }
    return defaults.get(servicio, ConfiguracionPrecios(
        servicio=servicio,
        precio_normal=0.0,
        precio_cachorros=0.0,
        precio_festivo=0.0,
        precio_perro_extra=0.0,
        plazas_max=5,
    ))

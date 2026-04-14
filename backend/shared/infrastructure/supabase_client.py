"""
Cliente Supabase singleton.

Proporciona una única instancia del cliente Supabase reutilizada en toda
la aplicación (patrón Singleton). Las credenciales se leen de variables
de entorno para no exponer secretos en el código fuente.

Variables de entorno requeridas:
    SUPABASE_URL  - URL del proyecto Supabase (ej: https://xyz.supabase.co)
    SUPABASE_KEY  - Clave de servicio (service_role key) para acceso completo

Uso:
    from shared.infrastructure.supabase_client import get_supabase_client

    client = get_supabase_client()
    result = client.table("reservas").select("*").execute()
"""

from __future__ import annotations

import os
from typing import Optional

from dotenv import load_dotenv
from supabase import Client, create_client

from shared.infrastructure.logger import get_logger

load_dotenv()

logger = get_logger(__name__)

# Instancia singleton (None hasta la primera llamada a get_supabase_client)
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Devuelve la instancia singleton del cliente Supabase.

    Crea la instancia en la primera llamada y la reutiliza en las siguientes.
    Lanza RuntimeError si las variables de entorno no están configuradas.

    Returns:
        Client: Instancia del cliente Supabase lista para usar.

    Raises:
        RuntimeError: Si SUPABASE_URL o SUPABASE_KEY no están definidas.
    """
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url:
        raise RuntimeError(
            "Variable de entorno SUPABASE_URL no configurada. "
            "Añádela al archivo .env o al entorno del sistema."
        )
    if not key:
        raise RuntimeError(
            "Variable de entorno SUPABASE_KEY no configurada. "
            "Añádela al archivo .env o al entorno del sistema."
        )

    logger.info("supabase_client_init", url=url[:30] + "...")
    _supabase_client = create_client(url, key)
    return _supabase_client


def reset_supabase_client() -> None:
    """
    Resetea el singleton. Útil exclusivamente en tests para aislar estado.
    No debe llamarse en código de producción.
    """
    global _supabase_client
    _supabase_client = None

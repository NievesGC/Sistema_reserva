"""
Logger estructurado en formato JSON con enmascaramiento de PII.

Requisito 12.5: Los logs de nivel ERROR y WARN no deben contener datos personales
identificables (nombre, email, teléfono, dirección).

Uso:
    from shared.infrastructure.logger import get_logger

    logger = get_logger(__name__)
    logger.info("reserva_creada", reserva_id="abc-123", servicio="paseos")
    logger.error("error_bd", reserva_id="abc-123", email="user@example.com")
    # → el campo 'email' queda enmascarado en ERROR: "em***@***.***"
"""

from __future__ import annotations

import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any

# Campos que contienen PII y deben enmascararse en niveles ERROR y WARN
_PII_FIELDS = {"email", "telefono", "nombre", "direccion", "nombre_dueno", "nombre_perro"}


def _mask_email(value: str) -> str:
    """Enmascara una dirección de email: user@domain.com → us***@***.***"""
    if "@" in value:
        local, domain = value.split("@", 1)
        masked_local = local[:2] + "***" if len(local) > 2 else "***"
        return f"{masked_local}@***.***"
    return "***"


def _mask_phone(value: str) -> str:
    """Enmascara un teléfono dejando solo los últimos 2 dígitos: 612345678 → *******78"""
    digits = re.sub(r"\D", "", value)
    if len(digits) >= 2:
        return "*" * (len(digits) - 2) + digits[-2:]
    return "***"


def _mask_value(field: str, value: Any) -> Any:
    """Aplica la máscara adecuada según el tipo de campo PII."""
    if not isinstance(value, str) or not value:
        return "***"
    if field == "email":
        return _mask_email(value)
    if field == "telefono":
        return _mask_phone(value)
    # nombre, direccion, nombre_dueno, nombre_perro → primeras 2 letras + ***
    return value[:2] + "***" if len(value) > 2 else "***"


def _sanitize_extra(level: int, extra: dict[str, Any]) -> dict[str, Any]:
    """
    Elimina o enmascara campos PII del diccionario de contexto extra
    cuando el nivel de log es ERROR (40) o WARNING (30).
    """
    if level < logging.WARNING:
        return extra

    sanitized = {}
    for key, val in extra.items():
        if key in _PII_FIELDS:
            sanitized[key] = _mask_value(key, val)
        else:
            sanitized[key] = val
    return sanitized


class _JsonFormatter(logging.Formatter):
    """Formateador que emite cada línea de log como un objeto JSON."""

    def format(self, record: logging.LogRecord) -> str:
        # Campos base del log estructurado
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.name,
            "event": record.getMessage(),
        }

        # Añadir campos de contexto extra (ya sanitizados por el logger)
        extra_data = getattr(record, "_extra", {})
        log_entry.update(extra_data)

        # Incluir información de excepción si existe
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, ensure_ascii=False, default=str)


class _StructuredLogger:
    """
    Wrapper sobre logging.Logger que acepta kwargs como contexto estructurado
    y aplica enmascaramiento de PII automáticamente en ERROR/WARN.
    """

    def __init__(self, name: str):
        self._logger = logging.getLogger(name)

    def _log(self, level: int, event: str, **kwargs: Any) -> None:
        sanitized = _sanitize_extra(level, kwargs)
        extra = {"_extra": sanitized}
        self._logger.log(level, event, extra=extra)

    def debug(self, event: str, **kwargs: Any) -> None:
        self._log(logging.DEBUG, event, **kwargs)

    def info(self, event: str, **kwargs: Any) -> None:
        self._log(logging.INFO, event, **kwargs)

    def warning(self, event: str, **kwargs: Any) -> None:
        self._log(logging.WARNING, event, **kwargs)

    # Alias para compatibilidad
    warn = warning

    def error(self, event: str, **kwargs: Any) -> None:
        self._log(logging.ERROR, event, **kwargs)

    def critical(self, event: str, **kwargs: Any) -> None:
        self._log(logging.CRITICAL, event, **kwargs)


def _configure_root_logger() -> None:
    """Configura el logger raíz con el formateador JSON y salida a stdout."""
    root = logging.getLogger()
    if root.handlers:
        return  # Ya configurado (evita duplicados en tests)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter())
    root.addHandler(handler)
    root.setLevel(logging.INFO)


_configure_root_logger()


def get_logger(name: str) -> _StructuredLogger:
    """
    Devuelve un logger estructurado JSON para el módulo indicado.

    Args:
        name: Nombre del módulo, típicamente __name__.

    Returns:
        Instancia de _StructuredLogger lista para usar.
    """
    return _StructuredLogger(name)

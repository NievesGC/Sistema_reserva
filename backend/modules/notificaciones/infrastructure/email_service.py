"""
Implementación del servicio de notificaciones via SMTP.

Lee la configuración SMTP de variables de entorno y envía emails
transaccionales para cada evento del ciclo de vida de una reserva.

Los fallos se capturan con try/except y se loguean con logger.error
sin incluir PII (Requisito 12.5).

Variables de entorno requeridas:
    SMTP_HOST       - Servidor SMTP (ej: smtp.gmail.com)
    SMTP_PORT       - Puerto SMTP (ej: 587)
    SMTP_USER       - Usuario SMTP (dirección de envío)
    SMTP_PASSWORD   - Contraseña SMTP
    EMAIL_EMPRESARIO - Email del empresario para notificaciones internas

Requisitos: 6.1-6.6
"""

from __future__ import annotations

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)


def _get_smtp_config() -> dict:
    """Lee la configuración SMTP de las variables de entorno."""
    return {
        "host": os.getenv("SMTP_HOST", "localhost"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "email_empresario": os.getenv("EMAIL_EMPRESARIO", ""),
    }


def _enviar_email(destinatario: str, asunto: str, cuerpo: str) -> None:
    """
    Envía un email via SMTP.

    Captura excepciones y las propaga para que el llamador decida
    cómo manejarlas (normalmente registrando en log sin propagar).

    Args:
        destinatario: Dirección de email del destinatario.
        asunto: Asunto del email.
        cuerpo: Cuerpo del email en texto plano.
    """
    config = _get_smtp_config()

    if not config["user"] or not config["host"]:
        raise RuntimeError("Configuración SMTP incompleta")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = asunto
    msg["From"] = config["user"]
    msg["To"] = destinatario
    msg.attach(MIMEText(cuerpo, "plain", "utf-8"))

    with smtplib.SMTP(config["host"], config["port"]) as servidor:
        servidor.ehlo()
        if config["port"] == 587:
            servidor.starttls()
        if config["user"] and config["password"]:
            servidor.login(config["user"], config["password"])
        servidor.sendmail(config["user"], [destinatario], msg.as_string())


class SmtpNotificacionesService:
    """
    Implementación de INotificacionesService usando SMTP.

    Todos los métodos capturan excepciones internamente y las registran
    en el log sin propagar (Requisito 6.6). Los logs no incluyen PII.
    """

    async def notificar_nueva_reserva(self, reserva: dict) -> None:
        """
        Envía email de confirmación de recepción al cliente.

        Requisito 6.1: Notificar al cliente cuando se crea una reserva.
        """
        try:
            email_cliente = reserva.get("email", "")
            servicio = reserva.get("servicio", "")
            fecha_desde = reserva.get("fecha_desde", "")
            fecha_hasta = reserva.get("fecha_hasta", "")
            reserva_id = reserva.get("id", "")

            asunto = "Reserva recibida - Guardería Canina"
            cuerpo = (
                f"Hemos recibido tu solicitud de reserva.\n\n"
                f"Servicio: {servicio}\n"
                f"Fechas: {fecha_desde} → {fecha_hasta}\n"
                f"Referencia: {reserva_id}\n\n"
                f"Te confirmaremos la reserva en breve.\n"
                f"Gracias por confiar en nosotros."
            )

            _enviar_email(email_cliente, asunto, cuerpo)
            logger.info("email_nueva_reserva_enviado", reserva_id=reserva_id)

        except Exception as exc:
            # Requisito 6.6: registrar sin PII, sin propagar
            logger.error(
                "email_nueva_reserva_error",
                reserva_id=reserva.get("id"),
                error_type=type(exc).__name__,
            )

    async def notificar_confirmacion(self, reserva: dict) -> None:
        """
        Envía email de confirmación al cliente.

        Requisito 6.2: Notificar al cliente cuando el empresario confirma.
        """
        try:
            email_cliente = reserva.get("email", "")
            servicio = reserva.get("servicio", "")
            fecha_desde = reserva.get("fecha_desde", "")
            fecha_hasta = reserva.get("fecha_hasta", "")
            reserva_id = reserva.get("id", "")

            asunto = "Reserva confirmada - Guardería Canina"
            cuerpo = (
                f"¡Tu reserva ha sido confirmada!\n\n"
                f"Servicio: {servicio}\n"
                f"Fechas: {fecha_desde} → {fecha_hasta}\n"
                f"Referencia: {reserva_id}\n\n"
                f"Nos vemos pronto. ¡Gracias!"
            )

            _enviar_email(email_cliente, asunto, cuerpo)
            logger.info("email_confirmacion_enviado", reserva_id=reserva_id)

        except Exception as exc:
            logger.error(
                "email_confirmacion_error",
                reserva_id=reserva.get("id"),
                error_type=type(exc).__name__,
            )

    async def notificar_rechazo(self, reserva: dict) -> None:
        """
        Envía email de rechazo al cliente.

        Requisito 6.3: Notificar al cliente cuando el empresario rechaza.
        """
        try:
            email_cliente = reserva.get("email", "")
            servicio = reserva.get("servicio", "")
            fecha_desde = reserva.get("fecha_desde", "")
            reserva_id = reserva.get("id", "")

            asunto = "Reserva no disponible - Guardería Canina"
            cuerpo = (
                f"Lamentamos informarte que no podemos atender tu reserva.\n\n"
                f"Servicio: {servicio}\n"
                f"Fecha solicitada: {fecha_desde}\n"
                f"Referencia: {reserva_id}\n\n"
                f"Por favor, contacta con nosotros para más información."
            )

            _enviar_email(email_cliente, asunto, cuerpo)
            logger.info("email_rechazo_enviado", reserva_id=reserva_id)

        except Exception as exc:
            logger.error(
                "email_rechazo_error",
                reserva_id=reserva.get("id"),
                error_type=type(exc).__name__,
            )

    async def notificar_cancelacion(self, reserva: dict) -> None:
        """
        Envía email de cancelación al cliente.

        Requisito 6.4: Notificar al cliente cuando el empresario cancela.
        """
        try:
            email_cliente = reserva.get("email", "")
            servicio = reserva.get("servicio", "")
            fecha_desde = reserva.get("fecha_desde", "")
            reserva_id = reserva.get("id", "")

            asunto = "Reserva cancelada - Guardería Canina"
            cuerpo = (
                f"Tu reserva ha sido cancelada.\n\n"
                f"Servicio: {servicio}\n"
                f"Fecha: {fecha_desde}\n"
                f"Referencia: {reserva_id}\n\n"
                f"Disculpa las molestias. Contacta con nosotros para más información."
            )

            _enviar_email(email_cliente, asunto, cuerpo)
            logger.info("email_cancelacion_enviado", reserva_id=reserva_id)

        except Exception as exc:
            logger.error(
                "email_cancelacion_error",
                reserva_id=reserva.get("id"),
                error_type=type(exc).__name__,
            )

    async def notificar_empresario(self, reserva: dict, evento: str) -> None:
        """
        Notifica al empresario sobre un evento en una reserva.

        Requisito 6.5: Notificar al empresario cuando se crea una nueva reserva.
        """
        try:
            config = _get_smtp_config()
            email_empresario = config["email_empresario"]

            if not email_empresario:
                logger.warning(
                    "email_empresario_no_configurado",
                    reserva_id=reserva.get("id"),
                )
                return

            servicio = reserva.get("servicio", "")
            fecha_desde = reserva.get("fecha_desde", "")
            reserva_id = reserva.get("id", "")

            asunto = f"Nueva solicitud de reserva - {servicio}"
            cuerpo = (
                f"Se ha recibido una nueva solicitud de reserva.\n\n"
                f"Servicio: {servicio}\n"
                f"Fecha: {fecha_desde}\n"
                f"Referencia: {reserva_id}\n\n"
                f"Accede al panel de administración para gestionarla."
            )

            _enviar_email(email_empresario, asunto, cuerpo)
            logger.info(
                "email_empresario_enviado",
                reserva_id=reserva_id,
                evento=evento,
            )

        except Exception as exc:
            logger.error(
                "email_empresario_error",
                reserva_id=reserva.get("id"),
                evento=evento,
                error_type=type(exc).__name__,
            )

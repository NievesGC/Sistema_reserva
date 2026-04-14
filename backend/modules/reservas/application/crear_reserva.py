"""
Caso de uso: Crear una nueva reserva.

Orquesta el flujo completo de creación:
  1. Validar fechas (por tipo de servicio)
  2. Validar campos obligatorios
  3. Validar fecha no pasada
  4. Validar dirección de recogida
  5. Verificar disponibilidad
  6. Calcular precio
  7. Persistir reserva (estado=pendiente)
  8. Reservar plazas (atómico con la creación)
  9. Notificar cliente y empresario (sin interrumpir si falla)

Requisitos: 5.5, 5.6, 5.7, 6.1, 6.5
"""

from __future__ import annotations

import uuid
from datetime import datetime

from modules.disponibilidad.domain.disponibilidad import IDisponibilidadService
from modules.notificaciones.application.enviar_notificacion import (
    EnviarNotificacionNuevaReserva,
)
from modules.notificaciones.domain.notificaciones_service import INotificacionesService
from modules.precios.application.calcular_precio import (
    IFestivosRepository,
    IPreciosRepository,
)
from modules.precios.domain.calculador_precio import ParametrosCalculo
from modules.reservas.domain.reserva import (
    DatosCliente,
    DatosMascota,
    EstadoReserva,
    Reserva,
    TipoServicio,
    TipoTarifa,
    validar_campos_obligatorios,
    validar_direccion_recogida,
    validar_fecha_no_pasada,
    validar_fechas,
)
from modules.reservas.domain.reserva_repository import IReservaRepository
from shared.domain.result import Err, Ok, Result
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)


class CrearReservaUseCase:
    """
    Crea una nueva reserva orquestando validación, disponibilidad,
    precio, persistencia y notificaciones.
    """

    def __init__(
        self,
        reserva_repo: IReservaRepository,
        disponibilidad_service: IDisponibilidadService,
        precios_repo: IPreciosRepository,
        festivos_repo: IFestivosRepository,
        notificaciones_service: INotificacionesService,
    ) -> None:
        self._reserva_repo = reserva_repo
        self._disponibilidad = disponibilidad_service
        self._precios_repo = precios_repo
        self._festivos_repo = festivos_repo
        self._notificaciones = notificaciones_service

    async def execute(self, datos: dict) -> Result:
        """
        Ejecuta el flujo completo de creación de reserva.

        Args:
            datos: Diccionario con todos los datos de la reserva:
                   servicio, fecha_desde, fecha_hasta, tarifa, tramo_horario,
                   perro_extra, transporte, cliente (dict), mascota (dict),
                   acepta_privacidad.

        Returns:
            Ok(Reserva) si la reserva se creó correctamente.
            Err(DomainError) si alguna validación falla.
        """
        servicio = datos.get("servicio", "")
        fecha_desde = datos["fecha_desde"]
        fecha_hasta = datos["fecha_hasta"]
        tarifa = datos.get("tarifa", "normal")
        tramo_horario = datos.get("tramo_horario", "")
        perro_extra = datos.get("perro_extra", False)
        transporte = datos.get("transporte")
        acepta_privacidad = datos.get("acepta_privacidad", False)

        cliente_data = datos.get("cliente", {})
        mascota_data = datos.get("mascota", {})

        cliente = DatosCliente(
            nombre=cliente_data.get("nombre", ""),
            telefono=cliente_data.get("telefono", ""),
            email=cliente_data.get("email", ""),
            direccion=cliente_data.get("direccion"),
        )
        mascota = DatosMascota(
            nombre=mascota_data.get("nombre", ""),
            tamano=mascota_data.get("tamano", ""),
            raza=mascota_data.get("raza"),
            notas=mascota_data.get("notas"),
        )

        # 1. Validar fechas por tipo de servicio
        error_fechas = validar_fechas(servicio, fecha_desde, fecha_hasta)
        if error_fechas:
            return Err(error_fechas)

        # 2. Validar campos obligatorios
        error_campos = validar_campos_obligatorios(cliente, mascota, acepta_privacidad)
        if error_campos:
            return Err(error_campos)

        # 3. Validar fecha no pasada
        error_pasada = validar_fecha_no_pasada(fecha_desde)
        if error_pasada:
            return Err(error_pasada)

        # 4. Validar dirección de recogida
        error_direccion = validar_direccion_recogida(servicio, transporte, cliente.direccion)
        if error_direccion:
            return Err(error_direccion)

        # 5. Verificar disponibilidad
        try:
            resultado_disp = await self._disponibilidad.verificar_disponibilidad_rango(
                servicio=servicio,
                fecha_desde=fecha_desde,
                fecha_hasta=fecha_hasta,
            )
            if not resultado_disp.disponible:
                from shared.domain.result import sin_disponibilidad
                return Err(sin_disponibilidad())
        except Exception as exc:
            logger.error(
                "crear_reserva_error_disponibilidad",
                servicio=servicio,
                error_type=type(exc).__name__,
            )
            from shared.domain.result import error_bd
            return Err(error_bd())

        # 6. Calcular precio
        try:
            from modules.precios.application.calcular_precio import CalcularPrecioUseCase
            calcular_uc = CalcularPrecioUseCase(
                precios_repo=self._precios_repo,
                festivos_repo=self._festivos_repo,
            )
            params = ParametrosCalculo(
                servicio=servicio,
                tarifa=tarifa,
                fecha_desde=fecha_desde,
                fecha_hasta=fecha_hasta,
                perro_extra=perro_extra,
                transporte=transporte,
            )
            desglose = await calcular_uc.execute(params)
            precio_total = desglose.total
        except Exception as exc:
            logger.error(
                "crear_reserva_error_precio",
                servicio=servicio,
                error_type=type(exc).__name__,
            )
            from shared.domain.result import error_bd
            return Err(error_bd())

        # 7. Construir entidad Reserva con estado=pendiente
        ahora = datetime.utcnow()
        reserva = Reserva(
            id=str(uuid.uuid4()),
            servicio=TipoServicio(servicio),
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            tarifa=TipoTarifa(tarifa),
            tramo_horario=tramo_horario,
            perro_extra=perro_extra,
            estado=EstadoReserva.PENDIENTE,  # Propiedad 6: estado inicial siempre pendiente
            precio_total=precio_total,
            cliente=cliente,
            mascota=mascota,
            acepta_privacidad=acepta_privacidad,
            transporte=transporte,
            creada_en=ahora,
            actualizada_en=ahora,
        )

        # 8. Persistir reserva
        try:
            resultado_crear = await self._reserva_repo.crear(reserva)
        except Exception as exc:
            logger.error(
                "crear_reserva_error_persistir",
                servicio=servicio,
                error_type=type(exc).__name__,
            )
            from shared.domain.result import error_bd
            return Err(error_bd())

        if isinstance(resultado_crear, Err):
            return resultado_crear

        reserva_creada = resultado_crear.value

        # 9. Reservar plazas (atómico con la creación)
        try:
            await self._disponibilidad.reservar_plazas(
                servicio=servicio,
                fecha_desde=fecha_desde,
                fecha_hasta=fecha_hasta,
            )
        except Exception as exc:
            logger.error(
                "crear_reserva_error_reservar_plazas",
                reserva_id=reserva_creada.id,
                error_type=type(exc).__name__,
            )
            # No interrumpir — la reserva ya está creada

        # 10. Notificar (sin interrumpir si falla — Requisito 6.6)
        reserva_dict = _reserva_a_dict(reserva_creada)
        notif_uc = EnviarNotificacionNuevaReserva(servicio=self._notificaciones)
        await notif_uc.execute(reserva_dict)

        logger.info("crear_reserva_ok", reserva_id=reserva_creada.id, servicio=servicio)
        return Ok(reserva_creada)


def _reserva_a_dict(reserva: Reserva) -> dict:
    """Convierte una Reserva a diccionario para las notificaciones."""
    return {
        "id": reserva.id,
        "servicio": reserva.servicio.value if hasattr(reserva.servicio, "value") else reserva.servicio,
        "fecha_desde": str(reserva.fecha_desde),
        "fecha_hasta": str(reserva.fecha_hasta),
        "tarifa": reserva.tarifa.value if hasattr(reserva.tarifa, "value") else reserva.tarifa,
        "tramo_horario": reserva.tramo_horario,
        "perro_extra": reserva.perro_extra,
        "estado": reserva.estado.value if hasattr(reserva.estado, "value") else reserva.estado,
        "precio_total": reserva.precio_total,
        "email": reserva.cliente.email,
        "nombre_dueno": reserva.cliente.nombre,
        "telefono": reserva.cliente.telefono,
        "nombre_perro": reserva.mascota.nombre,
    }

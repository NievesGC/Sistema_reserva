"""
Punto de entrada de la aplicación FastAPI.

Registra todos los routers de los módulos y configura el manejador global
de errores de dominio. Los routers se importan vacíos en esta fase inicial
y se irán completando en tareas posteriores.

Arranque en desarrollo:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from shared.domain.result import DomainError
from shared.infrastructure.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Creación de la app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Sistema de Reservas - Guardería Canina",
    description="API REST para gestión de reservas de guardería canina.",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS — permite peticiones desde el frontend React en desarrollo
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # React dev server
        "http://localhost:5173",   # Vite dev server (alternativa)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Manejador global de errores de dominio
# ---------------------------------------------------------------------------

@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    """
    Convierte DomainError en respuesta HTTP con el status code apropiado.
    No expone detalles técnicos al cliente (Requisito 12.5).
    """
    logger.error(
        "domain_error",
        code=exc.code,
        path=str(request.url.path),
    )
    status = exc.http_status if exc.http_status > 0 else 500
    return JSONResponse(
        status_code=status,
        content={"error": exc.code, "message": exc.message},
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Captura excepciones no controladas y devuelve 500 sin exponer detalles.
    Registra el error en el log para diagnóstico interno.
    """
    logger.error(
        "unhandled_exception",
        path=str(request.url.path),
        exception_type=type(exc).__name__,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "ERROR_INTERNO",
            "message": "Ha ocurrido un error interno. Por favor, inténtelo de nuevo.",
        },
    )


@app.exception_handler(RuntimeError)
async def supabase_connection_error_handler(request: Request, exc: RuntimeError) -> JSONResponse:
    """
    Maneja errores de conexión con Supabase (RuntimeError de supabase_client).

    Devuelve 503 con mensaje claro al usuario (Requisito 13.4).
    No expone detalles técnicos ni PII.
    """
    error_msg = str(exc)
    # Detectar errores de configuración de Supabase
    if "SUPABASE_URL" in error_msg or "SUPABASE_KEY" in error_msg or "supabase" in error_msg.lower():
        logger.error(
            "supabase_connection_error",
            path=str(request.url.path),
            error_type=type(exc).__name__,
        )
        return JSONResponse(
            status_code=503,
            content={
                "error": "ERROR_BD",
                "message": "No se puede conectar con la base de datos. Por favor, recargue la página.",
            },
        )
    # Si no es un error de Supabase, delegar al manejador genérico
    return await generic_error_handler(request, exc)

# ---------------------------------------------------------------------------
# Registro de routers
# ---------------------------------------------------------------------------

from modules.precios.infrastructure.precios_router import router as precios_router
from modules.disponibilidad.infrastructure.disponibilidad_router import router as disponibilidad_router
from modules.reservas.infrastructure.reserva_router import router as reservas_router
from modules.exportacion.infrastructure.exportacion_router import router as exportacion_router

app.include_router(precios_router)
app.include_router(disponibilidad_router)
app.include_router(reservas_router)
app.include_router(exportacion_router)


# ---------------------------------------------------------------------------
# Endpoint de salud
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["sistema"])
async def health_check() -> dict:
    """Verifica que la API está operativa."""
    return {"status": "ok", "version": app.version}

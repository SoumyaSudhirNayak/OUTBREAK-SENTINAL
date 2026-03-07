from app.routes.assignments import router as assignments_router
from app.routes.doctor_dashboard import router as doctor_dashboard_router
from app.routes.navigation import router as navigation_router
from app.routes.stock import router as stock_router
from app.routes.vehicles import router as vehicles_router

__all__ = ["assignments_router", "doctor_dashboard_router", "navigation_router", "stock_router", "vehicles_router"]

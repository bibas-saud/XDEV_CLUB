from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import config
from app.core.reminders import start_reminder_task, stop_reminder_task
from app.routers import auth, events, members, notifications, transfer


@asynccontextmanager
async def lifespan(app: FastAPI):
    reminder_task = start_reminder_task()
    yield
    stop_reminder_task(reminder_task)


app = FastAPI(title="XDEV Club API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(members.router)
app.include_router(transfer.router)
app.include_router(notifications.router)
app.include_router(events.public_router)
app.include_router(events.admin_router)
app.include_router(events.checkin_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

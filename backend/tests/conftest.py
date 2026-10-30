import os


os.environ.setdefault("CAPTURE_SCHEDULER_ENABLED", "false")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://localhost:5432/humworld_test",
)

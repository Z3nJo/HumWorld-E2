import os


os.environ.setdefault("CAPTURE_SCHEDULER_ENABLED", "false")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://localhost:5432/humworld_test",
)

import pytest

from app.auth import AdminPrincipal, require_admin
from app.main import app


@pytest.fixture(autouse=True)
def authenticated_admin_for_existing_api_tests():
    """Keep pre-auth API tests focused on their original behavior."""
    app.dependency_overrides[require_admin] = lambda: AdminPrincipal(
        user_id="user_test_admin",
        issuer="https://test.clerk.accounts.dev",
    )
    yield
    app.dependency_overrides.pop(require_admin, None)

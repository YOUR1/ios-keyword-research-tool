# Ensure all ORM models are imported before tasks run,
# so SQLAlchemy can resolve string-based relationship references.
import app.models.models  # noqa: F401
import app.models.user  # noqa: F401
import app.models.keyword  # noqa: F401
import app.models.billing  # noqa: F401
import app.models.audit  # noqa: F401

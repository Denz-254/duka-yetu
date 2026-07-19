"""Regression tests for model metadata portability."""

from sqlalchemy import create_engine

from app.core.database import Base


def test_models_compile_for_sqlite():
    """The local test fallback must support the same model metadata."""
    engine = create_engine("sqlite:///:memory:")

    Base.metadata.create_all(bind=engine)

    assert "businesses" in Base.metadata.tables
    assert "products" in Base.metadata.tables
    assert "sales" in Base.metadata.tables

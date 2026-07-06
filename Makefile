.PHONY: help install dev test lint format clean migrate

help:
	@echo "Available commands:"
	@echo "  make install    - Install dependencies"
	@echo "  make dev        - Run development server"
	@echo "  make test       - Run tests"
	@echo "  make lint       - Run linting"
	@echo "  make format     - Format code"
	@echo "  make migrate    - Run database migrations"
	@echo "  make clean      - Clean cache files"

install:
	pip install -r requirements.txt
	pip install -r requirements-dev.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest tests/ -v --cov=app --cov-report=term-missing

test-coverage:
	pytest tests/ -v --cov=app --cov-report=html
	open htmlcov/index.html

lint:
	flake8 app/ tests/
	black --check app/ tests/
	isort --check-only app/ tests/
	mypy app/

format:
	black app/ tests/
	isort app/ tests/

migrate:
	alembic upgrade head

migration:
	alembic revision --autogenerate -m "$(msg)"

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache/
	rm -rf .mypy_cache/
	rm -rf htmlcov/
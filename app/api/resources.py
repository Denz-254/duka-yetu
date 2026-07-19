"""CRUD APIs backing categories, suppliers, customers, branches, and settings."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_business, get_current_user, require_feature, require_owner
from app.core.plans import plan_limit
from app.models.business import Business
from app.models.resources import Branch, Category, Customer, Supplier
from app.models.user import User
from app.schemas.resources import (
    BranchCreate, BranchResponse, BranchUpdate,
    BusinessProfileUpdate,
    CategoryCreate, CategoryResponse, CategoryUpdate,
    CustomerCreate, CustomerResponse, CustomerUpdate,
    SettingsUpdate,
    SupplierCreate, SupplierResponse, SupplierUpdate,
)

router = APIRouter()


def _get(db: Session, model, record_id: UUID, business_id):
    record = db.query(model).filter(
        model.id == record_id, model.business_id == business_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return record


def _create(db: Session, model, payload, business_id):
    record = model(business_id=business_id, **payload.model_dump())
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=f"A {model.__name__.lower()} with these details already exists.")
    db.refresh(record)
    return record


def _update(db: Session, record, payload):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Another record already uses these details.")
    db.refresh(record)
    return record


@router.get("/categories/", response_model=list[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _access: Business = Depends(require_feature("inventory")),
):
    return db.query(Category).filter(
        Category.business_id == user.business_id, Category.is_active == True
    ).order_by(Category.name).all()


@router.post("/categories/", response_model=CategoryResponse, status_code=201)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("inventory")),
):
    return _create(db, Category, payload, user.business_id)


@router.put("/categories/{record_id}", response_model=CategoryResponse)
def update_category(
    record_id: UUID,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("inventory")),
):
    return _update(db, _get(db, Category, record_id, user.business_id), payload)


@router.delete("/categories/{record_id}", status_code=204)
def delete_category(
    record_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("inventory")),
):
    record = _get(db, Category, record_id, user.business_id)
    record.is_active = False
    db.commit()
    return Response(status_code=204)


@router.get("/suppliers/", response_model=list[SupplierResponse])
def list_suppliers(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _access: Business = Depends(require_feature("suppliers")),
):
    return db.query(Supplier).filter(Supplier.business_id == user.business_id).order_by(Supplier.name).all()


@router.post("/suppliers/", response_model=SupplierResponse, status_code=201)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("suppliers")),
):
    return _create(db, Supplier, payload, user.business_id)


@router.put("/suppliers/{record_id}", response_model=SupplierResponse)
def update_supplier(
    record_id: UUID,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("suppliers")),
):
    return _update(db, _get(db, Supplier, record_id, user.business_id), payload)


@router.delete("/suppliers/{record_id}", status_code=204)
def delete_supplier(
    record_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("suppliers")),
):
    db.delete(_get(db, Supplier, record_id, user.business_id))
    db.commit()
    return Response(status_code=204)


@router.get("/customers/", response_model=list[CustomerResponse])
def list_customers(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _access: Business = Depends(require_feature("customers")),
):
    return db.query(Customer).filter(Customer.business_id == user.business_id).order_by(Customer.name).all()


@router.post("/customers/", response_model=CustomerResponse, status_code=201)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("customers")),
):
    return _create(db, Customer, payload, user.business_id)


@router.put("/customers/{record_id}", response_model=CustomerResponse)
def update_customer(
    record_id: UUID,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("customers")),
):
    return _update(db, _get(db, Customer, record_id, user.business_id), payload)


@router.delete("/customers/{record_id}", status_code=204)
def delete_customer(
    record_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("customers")),
):
    db.delete(_get(db, Customer, record_id, user.business_id))
    db.commit()
    return Response(status_code=204)


@router.get("/branches/", response_model=list[BranchResponse])
def list_branches(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    _access: Business = Depends(require_feature("business_settings")),
):
    return db.query(Branch).filter(Branch.business_id == user.business_id).order_by(Branch.name).all()


@router.post("/branches/", response_model=BranchResponse, status_code=201)
def create_branch(
    payload: BranchCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    business: Business = Depends(get_current_business),
    _access: Business = Depends(require_feature("business_settings")),
):
    limit = plan_limit(business, "branches")
    count = db.query(Branch).filter(Branch.business_id == business.id).count()
    if limit is not None and count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your {business.package.title()} plan allows up to {limit} branches.",
        )
    return _create(db, Branch, payload, user.business_id)


@router.put("/branches/{record_id}", response_model=BranchResponse)
def update_branch(
    record_id: UUID,
    payload: BranchUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("business_settings")),
):
    return _update(db, _get(db, Branch, record_id, user.business_id), payload)


@router.delete("/branches/{record_id}", status_code=204)
def delete_branch(
    record_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
    _access: Business = Depends(require_feature("business_settings")),
):
    db.delete(_get(db, Branch, record_id, user.business_id))
    db.commit()
    return Response(status_code=204)


@router.get("/business/profile")
def get_business_profile(
    business: Business = Depends(get_current_business),
    _access: Business = Depends(require_feature("business_settings")),
):
    return {
        "name": business.name,
        "email": business.email,
        "phone": business.phone,
        **(business.profile or {}),
    }


@router.put("/business/profile")
def update_business_profile(
    payload: BusinessProfileUpdate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
    _owner: User = Depends(require_owner),
    _access: Business = Depends(require_feature("business_settings")),
):
    values = payload.model_dump(exclude_unset=True)
    for key in ("name", "email", "phone"):
        if key in values:
            setattr(business, key, values.pop(key))
    business.profile = {**(business.profile or {}), **values}
    db.commit()
    return get_business_profile(business, _access)


_PAYMENT_SECRET_KEYS = {
    "mpesa_consumer_key",
    "mpesa_consumer_secret",
    "mpesa_passkey",
    "stripe_secret_key",
}


def _public_settings(section: str, values: dict) -> dict:
    """Never return raw gateway secrets to the browser."""
    data = dict(values or {})
    if section != "payment":
        for key in list(data.keys()):
            if any(marker in key.lower() for marker in ("secret", "passkey", "private_key")):
                data.pop(key, None)
        return data

    for key in _PAYMENT_SECRET_KEYS:
        stored = data.pop(key, None)
        data[f"{key}_set"] = bool(stored)
    return data


def _merge_payment_settings(existing: dict, incoming: dict) -> dict:
    merged = {**(existing or {}), **(incoming or {})}
    for key in _PAYMENT_SECRET_KEYS:
        value = incoming.get(key) if incoming else None
        # Keep previous secret when UI sends blank / masked placeholder.
        if value is None or value == "" or str(value).startswith("••••"):
            if key in (existing or {}):
                merged[key] = existing[key]
            else:
                merged.pop(key, None)
        else:
            merged[key] = str(value).strip()
    if "mpesa_account_type" in merged:
        account_type = str(merged["mpesa_account_type"]).lower()
        merged["mpesa_account_type"] = account_type if account_type in {"paybill", "till"} else "paybill"
    return merged


@router.get("/business/settings/{section}")
def get_business_settings(
    section: str,
    business: Business = Depends(get_current_business),
    _access: Business = Depends(require_feature("business_settings")),
):
    if section not in {"payment", "receipt", "tax", "security"}:
        raise HTTPException(status_code=404, detail="Settings section not found")
    return _public_settings(section, (business.settings or {}).get(section, {}))


@router.put("/business/settings")
def update_business_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
    _owner: User = Depends(require_owner),
    _access: Business = Depends(require_feature("business_settings")),
):
    current = dict(business.settings or {})
    existing_section = dict(current.get(payload.section) or {})

    if payload.section == "payment":
        # Stripe secret keys remain env-only; M-Pesa secrets are per-business.
        if payload.values.get("stripe_secret_key"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stripe secret keys must be configured in the backend environment.",
            )
        values = _merge_payment_settings(existing_section, payload.values)
    else:
        sensitive_markers = ("secret", "passkey", "private_key")
        if any(marker in key.lower() for key in payload.values for marker in sensitive_markers):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Secret credentials must be configured in the backend environment.",
            )
        values = {**existing_section, **payload.values}

    current[payload.section] = values
    business.settings = current
    db.commit()
    return _public_settings(payload.section, values)

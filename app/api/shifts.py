"""Cashier shift clock-in / clock-out routes."""

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_business, get_current_user, get_pos_user
from app.models.business import Business
from app.models.cashier_shift import CashierShift
from app.models.sale import Sale
from app.models.user import User

router = APIRouter()


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class OpenShiftRequest(BaseModel):
    opening_cash: Decimal = Field(0, ge=0)


class CloseShiftRequest(BaseModel):
    closing_cash: Decimal = Field(..., ge=0)
    notes: Optional[str] = Field(None, max_length=500)


class ShiftOut(BaseModel):
    id: str
    cashier_id: str
    cashier_name: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    opening_cash: Decimal
    closing_cash: Optional[Decimal] = None
    expected_cash: Optional[Decimal] = None
    cash_sales: Decimal = Decimal("0.00")
    mpesa_sales: Decimal = Decimal("0.00")
    card_sales: Decimal = Decimal("0.00")
    send_money_sales: Decimal = Decimal("0.00")
    total_sales: Decimal = Decimal("0.00")
    sales_count: int = 0
    variance: Optional[Decimal] = None
    notes: Optional[str] = None
    status: str
    duration_minutes: Optional[int] = None


def _sale_totals(db: Session, shift: CashierShift) -> dict:
    end = shift.closed_at or datetime.utcnow()
    sales = (
        db.query(Sale)
        .filter(
            Sale.business_id == shift.business_id,
            Sale.user_id == shift.user_id,
            Sale.sale_date >= shift.opened_at,
            Sale.sale_date <= end,
            Sale.payment_status == "PAID",
        )
        .all()
    )
    cash = Decimal("0.00")
    mpesa = Decimal("0.00")
    card = Decimal("0.00")
    send_money = Decimal("0.00")
    for sale in sales:
        amount = _money(sale.total_amount)
        method = (sale.payment_method or "").upper()
        if method == "CASH":
            cash += amount
        elif method == "CARD":
            card += amount
        elif method == "SEND_MONEY":
            send_money += amount
        else:
            mpesa += amount
    total = cash + mpesa + card + send_money
    expected = _money(shift.opening_cash) + cash
    return {
        "cash_sales": _money(cash),
        "mpesa_sales": _money(mpesa),
        "card_sales": _money(card),
        "send_money_sales": _money(send_money),
        "total_sales": _money(total),
        "sales_count": len(sales),
        "expected_cash": expected,
    }


def _duration_minutes(shift: CashierShift) -> Optional[int]:
    end = shift.closed_at or datetime.utcnow()
    return max(0, int((end - shift.opened_at).total_seconds() // 60))


def _shift_out(db: Session, shift: CashierShift, live: bool = False) -> ShiftOut:
    cashier = shift.cashier or db.query(User).filter(User.id == shift.user_id).first()
    totals = _sale_totals(db, shift) if live or shift.status == "OPEN" else None
    cash_sales = totals["cash_sales"] if totals else _money(shift.cash_sales)
    mpesa_sales = totals["mpesa_sales"] if totals else _money(shift.mpesa_sales)
    card_sales = totals["card_sales"] if totals else _money(shift.card_sales)
    send_money_sales = totals["send_money_sales"] if totals else _money(shift.send_money_sales)
    total_sales = totals["total_sales"] if totals else _money(shift.total_sales)
    sales_count = totals["sales_count"] if totals else int(shift.sales_count or 0)
    expected = totals["expected_cash"] if totals else (shift.expected_cash and _money(shift.expected_cash))
    variance = None
    if shift.closing_cash is not None and expected is not None:
        variance = _money(shift.closing_cash) - expected
    elif shift.variance is not None:
        variance = _money(shift.variance)
    return ShiftOut(
        id=str(shift.id),
        cashier_id=str(shift.user_id),
        cashier_name=cashier.name if cashier else "Cashier",
        opened_at=shift.opened_at,
        closed_at=shift.closed_at,
        opening_cash=_money(shift.opening_cash),
        closing_cash=_money(shift.closing_cash) if shift.closing_cash is not None else None,
        expected_cash=expected,
        cash_sales=cash_sales,
        mpesa_sales=mpesa_sales,
        card_sales=card_sales,
        send_money_sales=send_money_sales,
        total_sales=total_sales,
        sales_count=sales_count,
        variance=variance,
        notes=shift.notes,
        status=shift.status,
        duration_minutes=_duration_minutes(shift),
    )


def _open_shift(db: Session, user: User) -> Optional[CashierShift]:
    return (
        db.query(CashierShift)
        .filter(
            CashierShift.business_id == user.business_id,
            CashierShift.user_id == user.id,
            CashierShift.status == "OPEN",
        )
        .first()
    )


@router.get("/current", response_model=Optional[ShiftOut])
def get_current_shift(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "CASHIER":
        return None
    shift = _open_shift(db, current_user)
    if not shift:
        return None
    return _shift_out(db, shift, live=True)


@router.post("/open", response_model=ShiftOut, status_code=201)
def open_shift(
    payload: OpenShiftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_pos_user),
    business: Business = Depends(get_current_business),
):
    if _open_shift(db, current_user):
        raise HTTPException(status_code=400, detail="You already have an open shift. Clock out first.")
    shift = CashierShift(
        business_id=business.id,
        user_id=current_user.id,
        opened_at=datetime.utcnow(),
        opening_cash=_money(payload.opening_cash),
        status="OPEN",
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return _shift_out(db, shift, live=True)


@router.post("/close", response_model=ShiftOut)
def close_shift(
    payload: CloseShiftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_pos_user),
):
    shift = _open_shift(db, current_user)
    if not shift:
        raise HTTPException(status_code=400, detail="No open shift to clock out")
    totals = _sale_totals(db, shift)
    closing = _money(payload.closing_cash)
    shift.closed_at = datetime.utcnow()
    shift.closing_cash = closing
    shift.expected_cash = totals["expected_cash"]
    shift.cash_sales = totals["cash_sales"]
    shift.mpesa_sales = totals["mpesa_sales"]
    shift.card_sales = totals["card_sales"]
    shift.send_money_sales = totals["send_money_sales"]
    shift.total_sales = totals["total_sales"]
    shift.sales_count = totals["sales_count"]
    shift.variance = closing - totals["expected_cash"]
    shift.notes = (payload.notes or "").strip() or None
    shift.status = "CLOSED"
    db.commit()
    db.refresh(shift)
    return _shift_out(db, shift)


@router.get("/", response_model=List[ShiftOut])
def list_shifts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
):
    query = db.query(CashierShift).filter(CashierShift.business_id == current_user.business_id)
    if current_user.role != "OWNER":
        query = query.filter(CashierShift.user_id == current_user.id)
    if status_filter:
        query = query.filter(CashierShift.status == status_filter.upper())
    rows = query.order_by(desc(CashierShift.opened_at)).limit(limit).all()
    return [_shift_out(db, row, live=row.status == "OPEN") for row in rows]

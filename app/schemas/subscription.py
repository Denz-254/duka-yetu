"""Schemas for subscription billing."""

from typing import Literal

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    plan: Literal["BASIC", "PROFESSIONAL", "ENTERPRISE"]
    billing_cycle: Literal["monthly", "yearly"] = "monthly"


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str

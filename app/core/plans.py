"""Subscription plans and feature entitlements.

This module is the single source of truth used by API authorization and the
subscription response returned to the frontend.
"""

from datetime import datetime


PLAN_DEFINITIONS = {
    "BASIC": {
        "name": "Basic",
        "features": {
            "pos",
            "products",
            "inventory",
            "customers",
            "basic_reports",
            "business_settings",
        },
        "limits": {"staff": 3, "branches": 1},
    },
    "PROFESSIONAL": {
        "name": "Professional",
        "features": {
            "pos",
            "products",
            "inventory",
            "customers",
            "suppliers",
            "basic_reports",
            "advanced_reports",
            "multi_branch",
            "business_settings",
        },
        "limits": {"staff": 15, "branches": 10},
    },
    "ENTERPRISE": {
        "name": "Enterprise",
        "features": {
            "pos",
            "products",
            "inventory",
            "customers",
            "suppliers",
            "basic_reports",
            "advanced_reports",
            "multi_branch",
            "business_settings",
            "api_access",
            "custom_integrations",
            "data_export",
        },
        "limits": {"staff": None, "branches": None},
    },
}

ACTIVE_SUBSCRIPTION_STATUSES = {"ACTIVE", "TRIALING"}


def normalize_plan(plan: str | None) -> str:
    value = (plan or "BASIC").upper()
    return value if value in PLAN_DEFINITIONS else "BASIC"


def subscription_is_active(business) -> bool:
    status = (business.subscription_status or "").upper()
    if status not in ACTIVE_SUBSCRIPTION_STATUSES:
        return False
    if status == "TRIALING" and business.trial_ends_at:
        return business.trial_ends_at >= datetime.utcnow()
    return True


def plan_has_feature(business, feature: str) -> bool:
    if not subscription_is_active(business):
        return False
    plan = PLAN_DEFINITIONS[normalize_plan(business.package)]
    return feature in plan["features"]


def plan_limit(business, resource: str) -> int | None:
    plan = PLAN_DEFINITIONS[normalize_plan(business.package)]
    return plan["limits"].get(resource)

from collections import defaultdict
from datetime import datetime
import math


def parse_month(month_str: str) -> datetime:
    return datetime.strptime(month_str, "%Y-%m")


def analyze_credit_score(credit_score_history: dict) -> dict:
    if not credit_score_history:
        return {
            "score_trend": "no_data",
            "total_score_change": 0,
            "latest_score": 0,
            "score_volatility": 0.0,
            "monthly_score_changes": [],
        }

    items = sorted(credit_score_history.items(), key=lambda x: parse_month(x[0]))
    deltas = []
    monthly_changes = []

    for i in range(1, len(items)):
        prev_month, prev_score = items[i - 1]
        curr_month, curr_score = items[i]
        delta = curr_score - prev_score
        deltas.append(delta)

        direction = "increase"
        if delta < 0:
            direction = "decrease"
        elif delta == 0:
            direction = "no_change"

        monthly_changes.append(
            {
                "from_month": prev_month,
                "to_month": curr_month,
                "previous_score": prev_score,
                "current_score": curr_score,
                "delta": delta,
                "direction": direction,
            }
        )

    if deltas and all(d > 0 for d in deltas):
        trend = "increasing"
    elif deltas and all(d < 0 for d in deltas):
        trend = "decreasing"
    elif deltas and all(d == 0 for d in deltas):
        trend = "stable"
    else:
        trend = "mixed"

    volatility = 0.0
    if deltas:
        avg = sum(deltas) / len(deltas)
        variance = sum((d - avg) ** 2 for d in deltas) / len(deltas)
        volatility = round(math.sqrt(variance), 2)

    return {
        "score_trend": trend,
        "total_score_change": items[-1][1] - items[0][1],
        "latest_score": items[-1][1],
        "score_volatility": volatility,
        "monthly_score_changes": monthly_changes,
    }


def analyze_transactions(transactions: list) -> dict:
    if not transactions:
        return {
            "has_transactions": False,
            "transaction_count": 0,
            "total_spend": 0.0,
            "monthly_spend": {},
            "spending_spike_months": [],
            "top_merchants": [],
        }

    monthly_spend = defaultdict(float)
    merchant_spend = defaultdict(float)

    for tx in transactions:
        month = tx["day"][:7]
        monthly_spend[month] += tx["amount"]
        merchant_spend[tx["company"]] += tx["amount"]

    monthly_spend = {k: round(v, 2) for k, v in monthly_spend.items()}
    monthly_values = list(monthly_spend.values())
    avg_monthly_spend = sum(monthly_values) / len(monthly_values) if monthly_values else 0

    spending_spike_months = [
        month for month, amount in monthly_spend.items()
        if avg_monthly_spend > 0 and amount > avg_monthly_spend * 1.3
    ]

    top_merchants = sorted(
        merchant_spend.items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]

    return {
        "has_transactions": True,
        "transaction_count": len(transactions),
        "total_spend": round(sum(tx["amount"] for tx in transactions), 2),
        "monthly_spend": monthly_spend,
        "spending_spike_months": spending_spike_months,
        "top_merchants": [
            {"company": merchant, "amount": round(amount, 2)}
            for merchant, amount in top_merchants
        ],
    }


def run_combined_analysis(user_data: dict) -> dict:
    score_analysis = analyze_credit_score(user_data["credit_score"])
    tx_analysis = analyze_transactions(user_data["transactions"])

    return {
        "user_id": user_data["id"],
        "name": user_data["name"],
        "email": user_data["email"],
        **score_analysis,
        **tx_analysis,
    }
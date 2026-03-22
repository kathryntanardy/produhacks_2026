from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Tuple


def _parse_month_key(month_key: str) -> datetime | None:
    formats = ("%Y-%m", "%B_%Y", "%b_%Y")
    for fmt in formats:
        try:
            return datetime.strptime(month_key, fmt)
        except ValueError:
            continue
    return None


def _normalize_month_key(month_key: str) -> str | None:
    dt = _parse_month_key(month_key)
    if not dt:
        return None
    return dt.strftime("%Y-%m")


def _to_month_label(month_key: str) -> str:
    dt = _parse_month_key(month_key)
    if not dt:
        return month_key
    return dt.strftime("%b")


def _month_sort_key(month_key: str) -> datetime:
    dt = _parse_month_key(month_key)
    if dt:
        return dt
    # Keep unknown formats deterministic at the front, while avoiding crashes.
    return datetime.min


def _safe_pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return round(((current - previous) / previous) * 100.0, 2)


def _rank_voice(rank: str) -> str:
    if rank == "sigma":
        return "Advanced strategy mode unlocked."
    if rank == "alpha":
        return "You are building strong momentum."
    return "You are on a solid starting path."


def _habit_builder(goals: List[str], rank: str, utilization_now: float) -> Tuple[str, str]:
    primary_goal = goals[0] if goals else "Improve credit score"
    if rank == "sigma":
        return (
            "Habit Builder",
            f"Keep your edge by reviewing utilization weekly and aligning card usage with your goal: {primary_goal}.",
        )
    if rank == "alpha":
        return (
            "Habit Builder",
            f"To level up, keep payments on time and hold utilization near or under 30% while working on: {primary_goal}.",
        )
    if utilization_now > 30:
        return (
            "Habit Builder",
            f"Focus on lowering utilization below 30% this month. This supports your goal: {primary_goal}.",
        )
    return (
        "Habit Builder",
        f"Maintain your progress with on-time payments and weekly tracking tied to your goal: {primary_goal}.",
    )


def _generate_insights(
    score_change_pct: float,
    spending_change_pct: float,
    utilization_change_pct: float,
    utilization_now: float,
    goals: List[str],
    rank: str,
    transaction_change_pct: float,
    new_spending_merchants: List[str],
    unwise_spending_flags: List[str],
) -> List[Dict[str, str]]:
    insights: List[Dict[str, str]] = []

    if score_change_pct >= 0:
        insights.append(
            {
                "type": "positive",
                "text": f"Your credit score trend is improving ({score_change_pct:+.2f}%). {_rank_voice(rank)}",
            }
        )
    else:
        insights.append(
            {
                "type": "warning",
                "text": f"Your credit score dipped ({score_change_pct:+.2f}%). Review utilization and payment timing this cycle.",
            }
        )

    if utilization_now <= 30:
        insights.append(
            {
                "type": "positive",
                "text": f"Current utilization is {utilization_now:.1f}%, which supports healthy credit behavior.",
            }
        )
    else:
        insights.append(
            {
                "type": "warning",
                "text": f"Current utilization is {utilization_now:.1f}%. Aim for <= 30% to protect your score.",
            }
        )

    if spending_change_pct <= 0:
        insights.append(
            {
                "type": "positive",
                "text": f"Monthly spending is down ({spending_change_pct:+.2f}%), improving balance control.",
            }
        )
    else:
        insights.append(
            {
                "type": "warning",
                "text": f"Monthly spending is up ({spending_change_pct:+.2f}). Keep this aligned with your credit goals.",
            }
        )

    if goals:
        insights.append(
            {
                "type": "positive",
                "text": f"Current focus: {', '.join(goals[:2])}. Your analytics are personalized to this target.",
            }
        )

    if abs(transaction_change_pct) >= 20:
        direction = "up" if transaction_change_pct > 0 else "down"
        insights.append(
            {
                "type": "warning" if transaction_change_pct > 0 else "positive",
                "text": f"Transaction volume is {direction} {abs(transaction_change_pct):.2f}% vs last month.",
            }
        )

    if "spending_spike" in unwise_spending_flags:
        insights.append(
            {
                "type": "warning",
                "text": "We detected a spending spike this month compared with your previous month pattern.",
            }
        )

    if "merchant_concentration" in unwise_spending_flags:
        insights.append(
            {
                "type": "warning",
                "text": "A large share of your spend is concentrated in one merchant category. Consider diversifying or reducing large repeat charges.",
            }
        )

    if new_spending_merchants:
        sample = ", ".join(new_spending_merchants[:2])
        insights.append(
            {
                "type": "warning",
                "text": f"New merchant activity detected: {sample}. Review if these are planned purchases.",
            }
        )

    return insights[:4]


def build_analytics_report(user_data: Dict[str, Any]) -> Dict[str, Any]:
    credit_score = user_data.get("credit_score") or {}
    goals = user_data.get("goals") or []
    rank = (user_data.get("rank") or "beta").lower()
    txs = user_data.get("transactions") or []
    credit_limit = float(user_data.get("credit_limit") or 0)
    balance = float(user_data.get("balance") or 0)

    score_by_month: Dict[str, int] = {}
    if credit_score:
        score_items = sorted(credit_score.items(), key=lambda x: _month_sort_key(str(x[0])))
        for raw_key, raw_value in score_items:
            normalized_key = _normalize_month_key(str(raw_key))
            if not normalized_key:
                continue
            score_by_month[normalized_key] = int(raw_value)

    monthly_spending: Dict[str, float] = defaultdict(float)
    merchant_spending: Dict[str, float] = defaultdict(float)
    for tx in txs:
        month_key = str(tx["day"])[:7]
        raw_amount = float(tx["amount"])
        amount = abs(raw_amount)
        normalized_month = _normalize_month_key(month_key)
        # Spending analytics should only use spend transactions, not payments/refunds.
        if normalized_month and raw_amount > 0:
            monthly_spending[normalized_month] += amount
            merchant_name = str(tx.get("company") or "Unknown")
            merchant_spending[merchant_name] += amount
    monthly_spending = {k: round(v, 2) for k, v in monthly_spending.items()}
    top_merchants = sorted(
        merchant_spending.items(),
        key=lambda item: item[1],
        reverse=True,
    )[:5]
    top_merchants = [
        {"company": company, "amount": round(amount, 2)}
        for company, amount in top_merchants
    ]

    recent_transactions = sorted(
        txs,
        key=lambda tx: str(tx.get("day", "")),
        reverse=True,
    )[:5]
    recent_transactions_summary = [
        {
            "day": str(tx.get("day", "")),
            "company": str(tx.get("company") or "Unknown"),
            "amount": round(abs(float(tx.get("amount") or 0)), 2),
            "type": "payment" if float(tx.get("amount") or 0) < 0 else "spending",
        }
        for tx in recent_transactions
    ]

    months = sorted(set(list(score_by_month.keys()) + list(monthly_spending.keys())), key=_month_sort_key)
    if len(months) < 3:
        fallback_months = ["2026-01", "2026-02", "2026-03"]
        months = sorted(set(months + fallback_months), key=_month_sort_key)
    months = months[-3:]

    score_series = [score_by_month.get(m, 0) for m in months]
    spending_series = [monthly_spending.get(m, 0.0) for m in months]

    current_utilization_value = round((balance / credit_limit) * 100.0, 2) if credit_limit > 0 else 0.0
    # Utilization is defined as current balance / total credit amount.
    utilization_series: List[float] = [current_utilization_value for _ in months]

    current_month = months[-1]
    previous_month = months[-2]

    latest_score = int(score_series[-1]) if score_series else 0
    previous_score = int(score_series[-2]) if len(score_series) > 1 else latest_score

    current_spending = float(spending_series[-1]) if spending_series else 0.0
    previous_spending = float(spending_series[-2]) if len(spending_series) > 1 else current_spending

    current_utilization = float(utilization_series[-1]) if utilization_series else 0.0
    previous_utilization = float(utilization_series[-2]) if len(utilization_series) > 1 else current_utilization

    score_change_pct = _safe_pct_change(latest_score, previous_score)
    spending_change_pct = _safe_pct_change(current_spending, previous_spending)
    utilization_change_pct = _safe_pct_change(current_utilization, previous_utilization)

    current_month_txs = [tx for tx in txs if str(tx.get("day", "")).startswith(current_month)]
    previous_month_txs = [tx for tx in txs if str(tx.get("day", "")).startswith(previous_month)]
    current_month_spending_txs = [tx for tx in current_month_txs if float(tx.get("amount") or 0) > 0]
    previous_month_spending_txs = [tx for tx in previous_month_txs if float(tx.get("amount") or 0) > 0]
    transaction_change_pct = _safe_pct_change(len(current_month_spending_txs), len(previous_month_spending_txs))

    current_merchants = {str(tx.get("company") or "Unknown") for tx in current_month_spending_txs}
    previous_merchants = {str(tx.get("company") or "Unknown") for tx in previous_month_spending_txs}
    new_spending_merchants = sorted(current_merchants - previous_merchants)

    unwise_spending_flags: List[str] = []
    if previous_spending > 0 and current_spending > previous_spending * 1.3:
        unwise_spending_flags.append("spending_spike")
    if current_utilization > 50:
        unwise_spending_flags.append("high_utilization")
    if top_merchants and current_spending > 0:
        top_share = float(top_merchants[0]["amount"]) / current_spending
        if top_share >= 0.6:
            unwise_spending_flags.append("merchant_concentration")
    if len(new_spending_merchants) >= 3:
        unwise_spending_flags.append("many_new_merchants")

    insights = _generate_insights(
        score_change_pct=score_change_pct,
        spending_change_pct=spending_change_pct,
        utilization_change_pct=utilization_change_pct,
        utilization_now=current_utilization if current_utilization > 0 else (balance / credit_limit * 100.0 if credit_limit else 0),
        goals=goals,
        rank=rank,
        transaction_change_pct=transaction_change_pct,
        new_spending_merchants=new_spending_merchants,
        unwise_spending_flags=unwise_spending_flags,
    )
    habit_title, habit_message = _habit_builder(goals, rank, current_utilization)

    return {
        "user_id": user_data["id"],
        "rank": rank,
        "goals": goals,
        "latest_score": latest_score,
        "latest_date": datetime.now().strftime("%b %d, %Y"),
        "current_month_label": _to_month_label(current_month),
        "previous_month_label": _to_month_label(previous_month),
        "monthly": [{"key": m, "label": _to_month_label(m)} for m in months],
        "score_series": score_series,
        "spending_series": spending_series,
        "utilization_series": utilization_series,
        "score_change_pct": score_change_pct,
        "spending_change_pct": spending_change_pct,
        "utilization_change_pct": utilization_change_pct,
        "transaction_change_pct": transaction_change_pct,
        "new_spending_merchants": new_spending_merchants,
        "unwise_spending_flags": unwise_spending_flags,
        "transaction_count": len(txs),
        "top_merchants": top_merchants,
        "recent_transactions_summary": recent_transactions_summary,
        "previous_score": previous_score,
        "current_score": latest_score,
        "insights": insights,
        "habit_builder_title": habit_title,
        "habit_builder_message": habit_message,
    }

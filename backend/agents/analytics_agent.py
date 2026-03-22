from typing import Any, Dict, List
from uagents import Agent, Context, Model

from agents.db import get_user_and_transactions
from agents.analytics_logic import run_combined_analysis


class AnalyticsRequest(Model):
    user_id: int


class AnalyticsResponse(Model):
    user_id: int
    name: str
    email: str
    score_trend: str
    total_score_change: int
    latest_score: int
    score_volatility: float
    monthly_score_changes: List[Dict[str, Any]]
    has_transactions: bool
    transaction_count: int
    total_spend: float
    monthly_spend: Dict[str, float]
    spending_spike_months: List[str]
    top_merchants: List[Dict[str, Any]]


class ErrorResponse(Model):
    error: str


analytics_agent = Agent(
    name="analytics_agent",
    seed="analytics-agent-secret-seed",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
)


@analytics_agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("analytics_agent started")


@analytics_agent.on_rest_post("/analyze", AnalyticsRequest, AnalyticsResponse)
async def analyze_user(ctx: Context, req: AnalyticsRequest):
    try:
        user_data = get_user_and_transactions(req.user_id)
        if not user_data:
            return ErrorResponse(error="User not found")

        result = run_combined_analysis(user_data)

        return AnalyticsResponse(**result)

    except Exception as e:
        ctx.logger.exception("Analytics failed")
        return ErrorResponse(error=str(e))


if __name__ == "__main__":
    analytics_agent.run()
from typing import Any, Dict, List

from uagents import Agent, Context, Model

from agents.analytics_report_logic import build_analytics_report
from agents.db import get_user_and_transactions
from agents.llm import generate_habit_builder_copy


class AnalyticsReportRequest(Model):
    user_id: int


class InsightItem(Model):
    type: str
    text: str


class MonthItem(Model):
    key: str
    label: str


class AnalyticsReportResponse(Model):
    user_id: int
    rank: str
    goals: List[str]
    latest_score: int
    latest_date: str
    current_month_label: str
    previous_month_label: str
    monthly: List[MonthItem]
    score_series: List[int]
    spending_series: List[float]
    utilization_series: List[float]
    score_change_pct: float
    spending_change_pct: float
    utilization_change_pct: float
    transaction_change_pct: float
    new_spending_merchants: List[str]
    unwise_spending_flags: List[str]
    transaction_count: int
    top_merchants: List[Dict[str, Any]]
    recent_transactions_summary: List[Dict[str, Any]]
    previous_score: int
    current_score: int
    insights: List[InsightItem]
    habit_builder_title: str
    habit_builder_message: str


class ErrorResponse(Model):
    error: str


analytics_report_agent = Agent(
    name="analytics_report_agent",
    seed="analytics-report-agent-secret-seed",
    port=8004,
    endpoint=["http://127.0.0.1:8004/submit"],
)


@analytics_report_agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("analytics_report_agent started")


@analytics_report_agent.on_rest_post("/report", AnalyticsReportRequest, AnalyticsReportResponse)
async def report(ctx: Context, req: AnalyticsReportRequest):
    try:
        user_data = get_user_and_transactions(req.user_id)
        if not user_data:
            return ErrorResponse(error="User not found")

        result: Dict[str, Any] = build_analytics_report(user_data)
        try:
            habit_copy = generate_habit_builder_copy(result)
            result["habit_builder_title"] = habit_copy["habit_builder_title"]
            result["habit_builder_message"] = habit_copy["habit_builder_message"]
            ctx.logger.info(
                "Habit builder LLM success: title='%s', message_preview='%s'",
                result["habit_builder_title"],
                result["habit_builder_message"][:120],
            )
        except Exception as llm_error:
            ctx.logger.warning(f"Habit builder LLM fallback used: {llm_error}")
        return AnalyticsReportResponse(**result)
    except Exception as e:
        ctx.logger.exception("analytics_report_agent failed")
        return ErrorResponse(error=str(e))


if __name__ == "__main__":
    analytics_report_agent.run()

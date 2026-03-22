from typing import Any, Dict, List
from uagents import Agent, Context, Model

from agents.db import get_user_and_transactions
from agents.analytics_logic import run_combined_analysis
from agents.llm import generate_credit_feedback


class ExplanationRequest(Model):
    user_id: int


class ExplanationResponse(Model):
    user_id: int
    feedback: str
    analytics: Dict[str, Any]


class ErrorResponse(Model):
    error: str


explanation_agent = Agent(
    name="explanation_agent",
    seed="explanation-agent-secret-seed",
    port=8002,
    endpoint=["http://127.0.0.1:8002/submit"],
)


@explanation_agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("explanation_agent started")


@explanation_agent.on_rest_post("/explain", ExplanationRequest, ExplanationResponse)
async def explain_user(ctx: Context, req: ExplanationRequest):
    try:
        user_data = get_user_and_transactions(req.user_id)
        if not user_data:
            return ErrorResponse(error="User not found")

        analytics = run_combined_analysis(user_data)
        feedback = generate_credit_feedback(analytics)

        return ExplanationResponse(
            user_id=req.user_id,
            feedback=feedback,
            analytics=analytics,
        )

    except Exception as e:
        ctx.logger.exception("Explanation failed")
        return ErrorResponse(error=str(e))


if __name__ == "__main__":
    explanation_agent.run()
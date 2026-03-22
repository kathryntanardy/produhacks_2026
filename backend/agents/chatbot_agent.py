from typing import Any, Dict, Optional
from uagents import Agent, Context, Model

from agents.db import get_user_and_transactions
from agents.analytics_logic import run_combined_analysis
from agents.llm import generate_chat_reply, generate_credit_feedback


class ChatRequest(Model):
    user_id: int
    message: str


class ChatResponse(Model):
    user_id: int
    intent: str
    reply: str
    analytics: Optional[Dict[str, Any]] = None


class ErrorResponse(Model):
    error: str


chatbox_agent = Agent(
    name="chatbox_agent",
    seed="chatbox-agent-secret-seed",
    port=8003,
    endpoint=["http://127.0.0.1:8003/submit"],
)


def detect_intent(message: str) -> str:
    text = message.lower()

    analytics_keywords = [
        "score",
        "credit score",
        "transaction",
        "spend",
        "spending",
        "merchant",
        "trend",
        "analyze",
        "analysis",
        "drop",
        "increase",
        "decrease",
    ]

    feedback_keywords = [
        "why",
        "explain",
        "feedback",
        "advice",
        "improve",
        "help",
    ]

    if any(word in text for word in feedback_keywords):
        return "feedback"

    if any(word in text for word in analytics_keywords):
        return "analytics"

    return "general_chat"


@chatbox_agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("chatbox_agent started")


@chatbox_agent.on_rest_post("/chat", ChatRequest, ChatResponse)
async def chat(ctx: Context, req: ChatRequest):
    try:
        intent = detect_intent(req.message)
        user_data = get_user_and_transactions(req.user_id)

        if not user_data:
            return ErrorResponse(error="User not found")

        analytics = run_combined_analysis(user_data)

        if intent == "analytics":
            reply = (
                f"Your current trend is {analytics['score_trend']}. "
                f"Your total credit score change is {analytics['total_score_change']}, "
                f"and your latest score is {analytics['latest_score']}."
            )
            return ChatResponse(
                user_id=req.user_id,
                intent=intent,
                reply=reply,
                analytics=analytics,
            )

        if intent == "feedback":
            reply = generate_credit_feedback(analytics)
            return ChatResponse(
                user_id=req.user_id,
                intent=intent,
                reply=reply,
                analytics=analytics,
            )

        reply = generate_chat_reply(req.message, analytics)
        return ChatResponse(
            user_id=req.user_id,
            intent=intent,
            reply=reply,
            analytics=analytics,
        )

    except Exception as e:
        ctx.logger.exception("Chat failed")
        return ErrorResponse(error=str(e))


if __name__ == "__main__":
    chatbox_agent.run()
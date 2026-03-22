import requests
from agents.config import OLLAMA_URL, OLLAMA_MODEL


def generate_credit_feedback(analytics: dict) -> str:
    prompt = f"""
You are a careful credit education assistant.

Here is the user's analytics summary:
Name: {analytics.get("name")}
Score trend: {analytics.get("score_trend")}
Total score change: {analytics.get("total_score_change")}
Latest score: {analytics.get("latest_score")}
Score volatility: {analytics.get("score_volatility")}
Monthly score changes: {analytics.get("monthly_score_changes")}
Has transactions: {analytics.get("has_transactions")}
Transaction count: {analytics.get("transaction_count")}
Total spend: {analytics.get("total_spend")}
Monthly spend: {analytics.get("monthly_spend")}
Spending spike months: {analytics.get("spending_spike_months")}
Top merchants: {analytics.get("top_merchants")}

Rules:
- Be brief.
- Do not claim certainty.
- Use words like "may", "might", or "could".
- Give educational feedback only.
- Keep it under 120 words.
"""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You explain credit score trends and spending patterns clearly and cautiously."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "stream": False,
        },
        timeout=60,
    )

    response.raise_for_status()
    return response.json()["message"]["content"].strip()


def generate_chat_reply(user_message: str, analytics: dict | None = None) -> str:
    prompt = f"""
You are a financial education chat assistant for a credit health app.

User message:
{user_message}

Analytics context:
{analytics}

Rules:
- Be helpful and simple.
- Do not pretend to be a financial advisor.
- Do not claim certainty.
- If analytics exists, use it.
- Keep response under 150 words.
"""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a friendly assistant for explaining credit and spending insights."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "stream": False,
        },
        timeout=60,
    )

    response.raise_for_status()
    return response.json()["message"]["content"].strip()
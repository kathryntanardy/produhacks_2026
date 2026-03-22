import requests
from agents.config import OLLAMA_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT_SECONDS
import json


def _normalize_text_field(value: object, fallback: str) -> str:
    if isinstance(value, list):
        parts = [str(v).strip() for v in value if str(v).strip()]
        return " ".join(parts) if parts else fallback
    if value is None:
        return fallback
    text = str(value).strip()
    if not text:
        return fallback
    if text.startswith("[") and text.endswith("]"):
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                parts = [str(v).strip() for v in parsed if str(v).strip()]
                return " ".join(parts) if parts else fallback
        except Exception:
            text = text[1:-1].strip()
    return text


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
        timeout=OLLAMA_TIMEOUT_SECONDS,
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
        timeout=OLLAMA_TIMEOUT_SECONDS,
    )

    response.raise_for_status()
    return response.json()["message"]["content"].strip()


def generate_habit_builder_copy(analytics_report: dict) -> dict:
    prompt = f"""
You are writing short in-app coaching copy for a credit analytics screen.

User context:
- Rank: {analytics_report.get("rank")}
- Goals: {analytics_report.get("goals")}
- Latest score: {analytics_report.get("latest_score")}
- Score change %: {analytics_report.get("score_change_pct")}
- Spending change %: {analytics_report.get("spending_change_pct")}
- Utilization change %: {analytics_report.get("utilization_change_pct")}
- Transaction count change %: {analytics_report.get("transaction_change_pct")}
- Transaction count: {analytics_report.get("transaction_count")}
- Top merchants: {analytics_report.get("top_merchants")}
- Recent transactions: {analytics_report.get("recent_transactions_summary")}
- New merchants this month: {analytics_report.get("new_spending_merchants")}
- Unwise spending flags: {analytics_report.get("unwise_spending_flags")}

Requirements:
- Output strict JSON only.
- JSON keys: habit_builder_title, habit_builder_message
- Title must be "Habit Builder".
- Message must be 1-2 short sentences, easy to understand.
- Message must reference rank level tone (beta = beginner, alpha = progressing, sigma = advanced).
- Message must consider user goals when available.
- Message must consider spending/transaction behavior, not just rank.
- Do not output list syntax like [] in any value.
- If transaction text includes "CREDIT CARD PAYMENT", treat it as the user's payment behavior (not merchant spending).
- No markdown, no extra keys.
"""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You produce strict JSON for mobile app copy."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "stream": False,
        },
        timeout=OLLAMA_TIMEOUT_SECONDS,
    )

    response.raise_for_status()
    content = response.json()["message"]["content"].strip()

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        parsed = json.loads(content[start : end + 1])

    title = _normalize_text_field(parsed.get("habit_builder_title"), "Habit Builder")
    message = _normalize_text_field(parsed.get("habit_builder_message"), "")
    if not message:
        raise ValueError("Missing habit_builder_message from LLM response")

    return {
        "habit_builder_title": title,
        "habit_builder_message": message,
    }
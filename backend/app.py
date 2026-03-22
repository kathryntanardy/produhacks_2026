import os
from datetime import datetime

import requests
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB

from auth_middleware import firebase_auth_required
from firebase_admin_init import initialize_firebase

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", "postgresql://kathryntanardy@localhost/credit_app"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
initialize_firebase()

ANALYTICS_AGENT_URL = os.getenv("ANALYTICS_AGENT_URL", "http://127.0.0.1:8001/analyze")
EXPLANATION_AGENT_URL = os.getenv("EXPLANATION_AGENT_URL", "http://127.0.0.1:8002/explain")
CHATBOX_AGENT_URL = os.getenv("CHATBOX_AGENT_URL", "http://127.0.0.1:8003/chat")


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(200), unique=True, nullable=False)
    name = db.Column(db.String(100))
    email = db.Column(db.String(150), unique=True)
    rank = db.Column(db.Integer, default=0)

    # IMPORTANT: credit_score is JSONB
    # example:
    # {"2025-12": 650, "2026-01": 670, "2026-02": 690}
    credit_score = db.Column(JSONB, nullable=False, server_default="{}")

    transactions = db.relationship(
        "Transaction",
        backref="user",
        cascade="all, delete-orphan",
        lazy=True,
    )


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    day = db.Column(db.Date, nullable=False)
    company = db.Column(db.String(150), nullable=False)


def get_or_create_db_user(profile_payload=None):
    firebase_uid = g.user.get("uid")
    payload = profile_payload or {}
    email = g.user.get("email") or payload.get("email")
    name = g.user.get("name") or payload.get("name") or ""

    if not firebase_uid:
        return None

    user = User.query.filter_by(firebase_uid=firebase_uid).first()

    if not user:
        user = User(
            firebase_uid=firebase_uid,
            name=name,
            email=email,
            rank=0,
            credit_score={},   # initialize JSONB
        )
        db.session.add(user)
        db.session.commit()
        return user

    updated = False

    if name and name != user.name:
        user.name = name
        updated = True

    if email and email != user.email:
        user.email = email
        updated = True

    if updated:
        db.session.commit()

    return user


@app.route("/auth/firebase", methods=["POST"])
@firebase_auth_required
def auth_firebase():
    payload = request.get_json(silent=True) or {}
    user = get_or_create_db_user(payload)
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    return jsonify({
        "message": "Authenticated successfully",
        "user": {
            "id": user.id,
            "firebase_uid": user.firebase_uid,
            "name": user.name,
            "email": user.email,
            "rank": user.rank,
            "credit_score": user.credit_score or {},
        }
    }), 200


@app.route("/api/me", methods=["GET"])
@firebase_auth_required
def me():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    return jsonify({
        "id": user.id,
        "firebase_uid": user.firebase_uid,
        "name": user.name,
        "email": user.email,
        "rank": user.rank,
        "credit_score": user.credit_score or {},
    })


@app.route("/api/transactions", methods=["POST"])
@firebase_auth_required
def create_transaction():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    data = request.get_json(silent=True) or {}
    amount = data.get("amount")
    day = data.get("day")
    company = data.get("company")

    if amount is None or not day or not company:
        return jsonify({"error": "amount, day, and company are required"}), 400

    try:
        parsed_day = datetime.strptime(day, "%Y-%m-%d").date()
        amount = float(amount)
    except ValueError:
        return jsonify({"error": "Invalid amount or day format"}), 400

    transaction = Transaction(
        user_id=user.id,
        amount=amount,
        day=parsed_day,
        company=company,
    )
    db.session.add(transaction)
    db.session.commit()

    return jsonify({
        "id": transaction.id,
        "user_id": transaction.user_id,
        "amount": float(transaction.amount),
        "day": transaction.day.isoformat(),
        "company": transaction.company,
    }), 201


@app.route("/api/transactions", methods=["GET"])
@firebase_auth_required
def list_transactions():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    transactions = (
        Transaction.query
        .filter_by(user_id=user.id)
        .order_by(Transaction.day.desc())
        .all()
    )

    return jsonify([
        {
            "id": t.id,
            "amount": float(t.amount),
            "day": t.day.isoformat(),
            "company": t.company,
        }
        for t in transactions
    ])


# Optional route to manually update the user's credit score history JSONB
@app.route("/api/credit-score", methods=["POST"])
@firebase_auth_required
def update_credit_score():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    data = request.get_json(silent=True) or {}
    month = data.get("month")
    score = data.get("score")

    if not month or score is None:
        return jsonify({"error": "month and score are required"}), 400

    try:
        # Validate format YYYY-MM
        datetime.strptime(month, "%Y-%m")
        score = int(score)
    except ValueError:
        return jsonify({"error": "month must be YYYY-MM and score must be integer"}), 400

    current = user.credit_score or {}
    current[month] = score
    user.credit_score = current

    db.session.commit()

    return jsonify({
        "message": "Credit score updated",
        "credit_score": user.credit_score,
    }), 200


@app.route("/api/credit-score", methods=["GET"])
@firebase_auth_required
def get_credit_score():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    return jsonify({
        "user_id": user.id,
        "credit_score": user.credit_score or {},
    })


# -----------------------------
# AGENT-INTEGRATED ROUTES
# -----------------------------

@app.route("/api/credit-analysis", methods=["GET"])
@firebase_auth_required
def credit_analysis():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    try:
        response = requests.post(
            ANALYTICS_AGENT_URL,
            json={"user_id": user.id},
            timeout=60,
        )
        return jsonify(response.json()), response.status_code
    except requests.RequestException as e:
        return jsonify({"error": f"Analytics agent unavailable: {str(e)}"}), 500


@app.route("/api/credit-feedback", methods=["GET"])
@firebase_auth_required
def credit_feedback():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    try:
        response = requests.post(
            EXPLANATION_AGENT_URL,
            json={"user_id": user.id},
            timeout=60,
        )
        return jsonify(response.json()), response.status_code
    except requests.RequestException as e:
        return jsonify({"error": f"Explanation agent unavailable: {str(e)}"}), 500


@app.route("/api/chat", methods=["POST"])
@firebase_auth_required
def chat():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "message is required"}), 400

    try:
        response = requests.post(
            CHATBOX_AGENT_URL,
            json={
                "user_id": user.id,
                "message": message,
            },
            timeout=60,
        )
        return jsonify(response.json()), response.status_code
    except requests.RequestException as e:
        return jsonify({"error": f"Chatbox agent unavailable: {str(e)}"}), 500


with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
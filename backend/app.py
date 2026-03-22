import os
from datetime import datetime

from flask import Flask, g, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv

from auth_middleware import firebase_auth_required
from firebase_admin_init import initialize_firebase

app = Flask(__name__)
CORS(app)
load_dotenv()

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", "postgresql://kathryntanardy@localhost/credit_app"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
initialize_firebase()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(200), unique=True, nullable=False)
    name = db.Column(db.String(100))
    email = db.Column(db.String(150), unique=True)
    rank = db.Column(db.Integer, default=0)

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
        )
        db.session.add(user)
        db.session.commit()
        return user

    if name and name != user.name:
        user.name = name

    if email and email != user.email:
        user.email = email

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
    except ValueError:
        return jsonify({"error": "day must be YYYY-MM-DD"}), 400

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

    transactions = Transaction.query.filter_by(user_id=user.id).order_by(Transaction.day.desc()).all()
    return jsonify([
        {
            "id": t.id,
            "amount": float(t.amount),
            "day": t.day.isoformat(),
            "company": t.company,
        }
        for t in transactions
    ])


with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
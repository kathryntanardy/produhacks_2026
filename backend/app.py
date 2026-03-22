import json
import os
import time
from datetime import datetime

import requests
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB

import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.link_token_account_filters import LinkTokenAccountFilters
from plaid.model.credit_filter import CreditFilter
from plaid.model.credit_account_subtypes import CreditAccountSubtypes
from plaid.model.credit_account_subtype import CreditAccountSubtype

from auth_middleware import firebase_auth_required
from firebase_admin_init import initialize_firebase
from sqlalchemy.dialects.postgresql import ARRAY


load_dotenv()

app = Flask(__name__)
CORS(app)

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

ALLOWED_INCOME_RANGES = {
    "$0 to $19,999",
    "$20,000 to $39,999",
    "$40,000 to $59,999",
    "$60,000 to $79,999",
    "$80,000 to $99,999",
    "$100,000 or more",
}

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(200), unique=True, nullable=False)
    name = db.Column(db.String(100))
    email = db.Column(db.String(150), unique=True)
    rank = db.Column(db.Integer, default=0)

    credit_score = db.Column(JSONB, nullable=False, server_default="{}")
    credit_limit = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    balance = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    goals = db.Column(ARRAY(db.String), nullable=False, default=list)
    annual_income = db.Column(db.String(50))

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
            "credit_limit": float(user.credit_limit),
            "balance": float(user.balance),
            "goals": user.goals or [],
            "annual_income": user.annual_income,
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
        "credit_limit": float(user.credit_limit),
        "balance": float(user.balance),
        "goals": user.goals or [],
        "annual_income": user.annual_income,
    })

# TODO: Add toast for payment and spending
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
    
@app.route("/api/goals", methods=["POST"])
@firebase_auth_required
def update_goals():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    data = request.get_json(silent=True) or {}
    goals = data.get("goals")

    if not isinstance(goals, list):
        return jsonify({"error": "goals must be an array of strings"}), 400

    if len(goals) > 2:
        return jsonify({"error": "You can select at most 2 goals"}), 400

    if not all(isinstance(goal, str) and goal.strip() for goal in goals):
        return jsonify({"error": "Each goal must be a non-empty string"}), 400

    user.goals = goals
    db.session.commit()

    return jsonify({
        "message": "Goals updated",
        "goals": user.goals,
    }), 200

@app.route("/api/goals", methods=["GET"])
@firebase_auth_required
def get_goals():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    return jsonify({
        "user_id": user.id,
        "goals": user.goals or [],
    }), 200

@app.route("/api/annual-income", methods=["POST"])
@firebase_auth_required
def update_annual_income():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    data = request.get_json(silent=True) or {}
    income = data.get("annual_income")

    if not income:
        return jsonify({"error": "annual_income is required"}), 400

    if income not in ALLOWED_INCOME_RANGES:
        return jsonify({"error": "Invalid income range"}), 400

    user.annual_income = income
    db.session.commit()

    return jsonify({
        "message": "Annual income updated",
        "annual_income": user.annual_income,
    }), 200

with app.app_context():
    db.create_all()


# ============================== Plaid API ==============================

PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID')
PLAID_SECRET = os.getenv('PLAID_SECRET')
PLAID_ENV = os.getenv('PLAID_ENV', 'sandbox')
PLAID_PRODUCTS = os.getenv('PLAID_PRODUCTS', 'transactions').split(',')
PLAID_COUNTRY_CODES = os.getenv('PLAID_COUNTRY_CODES', 'US').split(',')

def empty_to_none(field):
    value = os.getenv(field)
    if value is None or len(value) == 0:
        return None
    return value

host = plaid.Environment.Sandbox

if PLAID_ENV == 'sandbox':
    host = plaid.Environment.Sandbox

if PLAID_ENV == 'production':
    host = plaid.Environment.Production

PLAID_REDIRECT_URI = empty_to_none('PLAID_REDIRECT_URI')

configuration = plaid.Configuration(
    host=host,
    api_key={
        'clientId': PLAID_CLIENT_ID,
        'secret': PLAID_SECRET,
        'plaidVersion': '2020-09-14'
    }
)

api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

products = []
for product in PLAID_PRODUCTS:
    products.append(Products(product))

# In-memory store — keyed by firebase_uid so each user gets their own token
access_tokens = {}
item_ids = {}


def format_error(e):
    response = json.loads(e.body)
    return {
        'error': {
            'status_code': e.status,
            'display_message': response['error_message'],
            'error_code': response['error_code'],
            'error_type': response['error_type'],
        }
    }


@app.route('/plaid-link')
def plaid_link_page():
    """Self-hosted Plaid Link page. Receives a link_token via query param,
    opens Plaid Link with the JS SDK, and posts the result back via
    window.ReactNativeWebView.postMessage so the React Native WebView
    can receive it through onMessage."""
    return '''<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
<style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,sans-serif;background:#f7f7f7}
.msg{color:#666;font-size:16px}</style>
</head><body>
<p class="msg" id="status"></p>
<script>
var token = new URLSearchParams(window.location.search).get('token');
if (!token) {
  document.getElementById('status').textContent = 'Error: no link token';
} else {
  var handler = Plaid.create({
    token: token,
    onSuccess: function(publicToken, metadata) {
      var msg = JSON.stringify({event:'success', public_token: publicToken, metadata: metadata});
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
      document.getElementById('status').textContent = 'Connected! Returning...';
    },
    onExit: function(err, metadata) {
      var msg = JSON.stringify({event:'exit', error: err, metadata: metadata});
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
      document.getElementById('status').textContent = 'Closed.';
    },
    onEvent: function(eventName, metadata) {}
  });
  handler.open();
}
</script>
</body></html>'''


@app.route('/api/create_link_token', methods=['POST'])
@firebase_auth_required
def create_link_token():
    user = get_or_create_db_user()
    if not user:
        return jsonify({"error": "Invalid Firebase user"}), 401

    try:
        link_request = LinkTokenCreateRequest(
            products=products,
            client_name='CreditApp',
            country_codes=list(map(lambda x: CountryCode(x), PLAID_COUNTRY_CODES)),
            language='en',
            user=LinkTokenCreateRequestUser(
                client_user_id=str(user.id)
            ),
            account_filters=LinkTokenAccountFilters(
                credit=CreditFilter(
                    account_subtypes=CreditAccountSubtypes([
                        CreditAccountSubtype("credit card")
                    ])
                )
            )
        )

        if PLAID_REDIRECT_URI is not None:
            link_request['redirect_uri'] = PLAID_REDIRECT_URI

        response = client.link_token_create(link_request)
        return jsonify(response.to_dict())
    except plaid.ApiException as e:
        return jsonify(format_error(e)), e.status


@app.route('/api/set_access_token', methods=['POST'])
@firebase_auth_required
def set_access_token():
    uid = g.user.get("uid")
    public_token = request.form.get('public_token')

    if not public_token:
        return jsonify({"error": "public_token is required"}), 400

    try:
        exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
        exchange_response = client.item_public_token_exchange(exchange_request)
        access_tokens[uid] = exchange_response['access_token']
        item_ids[uid] = exchange_response['item_id']
        return jsonify(exchange_response.to_dict())
    except plaid.ApiException as e:
        return jsonify(format_error(e)), e.status


@app.route('/api/accounts', methods=['GET'])
@firebase_auth_required
def get_accounts():
    uid = g.user.get("uid")
    token = access_tokens.get(uid)

    if not token:
        return jsonify({"error": "No linked bank account. Link one first."}), 404

    try:
        accounts_request = AccountsGetRequest(access_token=token)
        response = client.accounts_get(accounts_request)
        return jsonify(response.to_dict())
    except plaid.ApiException as e:
        return jsonify(format_error(e)), e.status


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)

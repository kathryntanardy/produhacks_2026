# app.py
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from firebase_admin import credentials, auth
import firebase_admin

app = Flask(__name__)
CORS(app)

# 🔥 Your existing PostgreSQL DB
app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://kathryntanardy@localhost/credit_app"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# 🔥 Initialize Firebase Admin (ONLY ONCE)
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

# 🔥 Match EXISTING table schema
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(200), unique=True, nullable=False)
    name = db.Column(db.String(100))
    email = db.Column(db.String(150), unique=True)
    rank = db.Column(db.Integer, default=0)

# 🔥 Universal Firebase Auth Endpoint (NOT Google-specific)
@app.route("/auth/firebase", methods=["POST"])
def auth_firebase():
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing bearer token"}), 401

    id_token = auth_header.split("Bearer ")[1]

    try:
        decoded_token = auth.verify_id_token(id_token)
    except Exception as e:
        return jsonify({"error": f"Invalid token: {str(e)}"}), 401

    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    name = decoded_token.get("name")  # might be None

    # 🔍 Check existing user
    user = User.query.filter_by(firebase_uid=firebase_uid).first()

    if not user:
        # ✅ New user → insert
        user = User(
            firebase_uid=firebase_uid,
            name=name if name else "",   # avoid None
            email=email,
            rank=0
        )
        db.session.add(user)
        db.session.commit()

    else:
        # ✅ Existing user → update safely
        if name and name != user.name:
            user.name = name

        if email and email != user.email:
            user.email = email

        db.session.commit()

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

# 🔥 Test route
@app.route("/api/me", methods=["GET"])
def test():
    return jsonify({"status": "backend running"})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
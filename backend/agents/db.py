import psycopg2
from agents.config import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT


def get_connection():
    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
    )


def get_user_and_transactions(user_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, name, email, credit_score, rank, goals, credit_limit, balance, annual_income, xp
        FROM users
        WHERE id = %s
        """,
        (user_id,),
    )
    user_row = cur.fetchone()

    if not user_row:
        cur.close()
        conn.close()
        return None

    cur.execute(
        """
        SELECT id, amount, day, company
        FROM transactions
        WHERE user_id = %s
        ORDER BY day ASC
        """,
        (user_id,),
    )
    tx_rows = cur.fetchall()

    cur.close()
    conn.close()

    uid, name, email, credit_score, rank, goals, credit_limit, balance, annual_income, xp = user_row

    return {
        "id": uid,
        "name": name,
        "email": email,
        "credit_score": credit_score or {},   # JSONB dict
        "rank": rank or "beta",
        "goals": goals or [],
        "credit_limit": float(credit_limit or 0),
        "balance": float(balance or 0),
        "annual_income": annual_income,
        "xp": int(xp or 0),
        "transactions": [
            {
                "id": row[0],
                "amount": float(row[1]),
                "day": str(row[2]),
                "company": row[3],
            }
            for row in tx_rows
        ],
    }
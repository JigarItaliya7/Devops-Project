# order-service/app.py
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def root():
    return "Order Service (Flask + old requests)"

@app.route("/orders")
def get_orders():
    orders = [
        {"id": 1, "user_id": 1, "product_id": 2},
        {"id": 2, "user_id": 2, "product_id": 1}
    ]
    return jsonify(orders)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3002)

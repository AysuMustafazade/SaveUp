import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask import Flask, request, jsonify, render_template
print("CURRENT DIR:", os.getcwd())
print("FILES HERE:", os.listdir())

app = Flask(__name__)
# Enable CORS to allow your vanilla JavaScript frontend to connect safely
CORS(app)

DATA_FILE = 'expenses.json'
TOTAL_BUDGET = 1200.00

def load_stored_ledger():
    """Reads non-volatile transaction records from disk."""
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r') as file:
        try:
            return json.load(file)
        except json.JSONDecodeError:
            return []

def write_to_ledger(data):
    """Commits active memory modifications to the disk ledger file."""
    with open(DATA_FILE, 'w') as file:
        json.dump(data, file, indent=4)

@app.route('/expenses', methods=['GET'])
def get_expenses():
    expenses = load_stored_ledger()
    return jsonify({"status": "success", "expenses": expenses})

@app.route('/summary', methods=['GET'])
def get_summary():
    expenses = load_stored_ledger()
    total_spent = sum(float(item['amount']) for item in expenses)
    remaining_budget = TOTAL_BUDGET - total_spent
    
    return jsonify({
        "status": "success",
        "total_budget": TOTAL_BUDGET,
        "total_spent": total_spent,
        "remaining_budget": remaining_budget
    })

@app.route('/add-expense', methods=['POST'])
def add_expense():
    payload = request.json
    if not payload:
        return jsonify({"status": "error", "message": "Malformed application data payload"}), 400
    
    ledger = load_stored_ledger()
    
    # Standardized database map matching the script.js ingestion keyframes
    new_record = {
        "id": int(os.urandom(3).hex(), 16), # Secure local system integer mapping identifier
        "desc": payload.get('desc', 'Unregistered Outflow'),
        "amount": float(payload.get('amount', 0.00)),
        "category": payload.get('category', 'Other'),
        "date": payload.get('date', '')
    }
    
    # Insert at position 0 so recent transactions display first
    ledger.insert(0, new_record)
    write_to_ledger(ledger)
    return jsonify({"status": "success"})

@app.route('/delete-expense/<int:id>', methods=['DELETE'])
def delete_expense(id):
    ledger = load_stored_ledger()
    filtered_ledger = [item for item in ledger if item['id'] != id]
    write_to_ledger(filtered_ledger)
    return jsonify({"status": "success"})

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
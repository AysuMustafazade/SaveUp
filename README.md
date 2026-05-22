# SaveUp – Smart Expense Tracker

SaveUp is a simple full-stack web application designed to help users track their daily expenses, manage budgets, and gain insights into their spending habits.

## 🚀 Features

- Add and delete expenses in real time
- Categorize spending (Food, Education, Entertainment, Transport, etc.)
- View total budget, spent amount, and remaining balance
- Interactive charts for financial analytics
- Persistent storage using a Python Flask backend
- Clean and responsive frontend (HTML, CSS, JavaScript)

## 🛠️ Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Python (Flask)
- API: RESTful endpoints
- Data Storage: JSON file
- Deployment: Render

## 📦 API Endpoints

- GET /expenses – Get all expenses
- POST /add-expense – Add a new expense
- GET /summary – Get budget summary
- DELETE /delete-expense/<id> – Delete an expense

## ⚙️ Setup (Local)

```bash
pip install -r requirements.txt
python app.py
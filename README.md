
# My Flask Project

This is a backend project built using Flask, organized with a modular and scalable architecture.

## 📁 Project Structure

```
my_flask_project/
├── app/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── models/
│   │   └── user.py
│   ├── services/
│   │   └── auth_service.py
│   ├── config/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── dev_config.py
│   │   └── prod_config.py
│   └── extensions.py
├── migrations/
├── tests/
│   ├── __init__.py
│   └── test_auth.py
├── .env
├── .gitignore
├── app.py
├── requirements.txt
└── README.md
```

## 🚀 Getting Started

### 1. Create and activate virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Set up environment variables

Create a `.env` file in the root with the following (example):

```
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URI=sqlite:///data.db
```

### 4. Initialize database

```bash
flask db init
flask db migrate -m "Initial migration."
flask db upgrade
```

### 5. Run the app

```bash
flask run
```

## 📦 Dependencies

- Flask
- Flask-SQLAlchemy
- Flask-Migrate
- python-dotenv

## 📄 License

This project is licensed under the MIT License.

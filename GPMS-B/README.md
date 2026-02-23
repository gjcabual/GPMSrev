# FastAPI Gate Pass Management System

This project is a Vehicle Pass Authorization Management System designed to streamline campus access control. It manages and organizes vehicle registration data and access applications within the campus infrastructure. The system leverages Optical Character Recognition (OCR) technology to automatically validate and match information from applicant submissions, ensuring efficient and accurate processing of vehicle pass requests.

## Project Setup

### Prerequisites

- **Python 3.8+**: Make sure you have Python installed. You can download it from [python.org](https://www.python.org/downloads/).
- **Virtual Environment**: It’s recommended to create a virtual environment for this project.
- **Database**: This project requires a database setup (e.g., PostgreSQL, MySQL, etc.). Make sure to have it installed and configured.

### 1. Clone the Repository

Start by cloning this repository and navigating to the project directory:

```bash
git clone <repository_url>
cd project_directory
```

### 2. Create and Activate a Virtual Environment

Create a virtual environment to manage dependencies:

```bash
python -m venv .venv
```

Activate the virtual environment:
Windows:

```Bash
.venv\Scripts\activate
```

### 3. Install Dependencies

Install the project dependencies by running:

```bash
pip install -r requirements.txt
```

### 4. Configure Database

1. Create a new PostgreSQL database named `dbgpms`:

```sql
CREATE DATABASE dbgpms;
```

2. Set your DATABASE_URL in the format:

```bash
postgresql+asyncpg://username:password@localhost/dbgpms
```

3. Run the server to create tables:

```bash
uvicorn main:app --reload
```

4. Seed the database with initial data:

```bash
python -m app.utils.seed_db --action seed
```

> **Note**: Make sure your database server is running before executing these commands.

### 5. Run the Application

Start the FastAPI application using Uvicorn:

```bash
uvicorn main:app --reload
```

### Deactivating the Virtual Environment

Once done, you can deactivate the virtual environment with:

```bash
deactivate
```

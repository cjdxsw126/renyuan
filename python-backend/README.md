# Python Backend for Xuanren Project

This is the Python implementation of the Xuanren project backend, built with FastAPI and SQLAlchemy.

## Features

- User authentication (login/register) with JWT tokens
- User management (CRUD operations)
- Dataset management (CRUD operations)
- Person management (CRUD operations)
- Certificate management for persons
- Batch operations for persons
- SQLite database for data persistence

## Requirements

- Python 3.8+
- pip

## Installation

1. Clone the repository
2. Navigate to the python-backend directory
3. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Initialize the database:
   ```bash
   python init_db.py
   ```
6. Start the server:
   ```bash
   python main.py
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username and password
- `POST /api/auth/register` - Register a new user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/{user_id}` - Get a specific user
- `POST /api/users` - Create a new user
- `PUT /api/users/{user_id}` - Update a user
- `PUT /api/users/{user_id}/permissions` - Update user permissions
- `DELETE /api/users/{user_id}` - Delete a user

### Datasets
- `GET /api/datasets` - Get all datasets
- `GET /api/datasets/{dataset_id}` - Get a specific dataset
- `POST /api/datasets` - Create a new dataset
- `PUT /api/datasets/{dataset_id}` - Update a dataset
- `DELETE /api/datasets/{dataset_id}` - Delete a dataset

### Persons
- `GET /api/persons/dataset/{dataset_id}` - Get all persons in a dataset
- `GET /api/persons/{person_id}` - Get a specific person
- `POST /api/persons` - Create a new person
- `POST /api/persons/batch` - Batch create persons
- `PUT /api/persons/{person_id}` - Update a person
- `DELETE /api/persons/{person_id}` - Delete a person
- `DELETE /api/persons/batch` - Batch delete persons

## Database Schema

### Users
- id: string (primary key)
- username: string (unique)
- password: string (hashed)
- role: string (admin/member)
- enabled: boolean
- created_at: datetime
- last_password_change: datetime (nullable)

### Permissions
- id: string (primary key)
- user_id: string (foreign key to users)
- file_upload: boolean
- search: boolean
- download: boolean
- admin_panel: boolean
- data_delete: boolean

### Datasets
- id: string (primary key)
- name: string
- count: integer
- created_at: datetime
- updated_at: datetime (nullable)

### Persons
- id: integer (primary key, autoincrement)
- dataset_id: string (foreign key to datasets)
- name: string
- age: integer (nullable)
- education: string (nullable)
- employee_id: string (nullable)
- original_data: text (JSON string, nullable)

### Certificates
- id: integer (primary key, autoincrement)
- person_id: integer (foreign key to persons)
- name: string
- value: string (nullable)

## Testing

To run tests:
```bash
python -m pytest tests/
```

## Deployment

For production deployment, consider:
1. Using a production WSGI server like Gunicorn
2. Setting up proper CORS origins
3. Using environment variables for secret keys
4. Implementing HTTPS
5. Adding rate limiting and other security measures

## License

This project is licensed under the MIT License.
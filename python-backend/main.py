from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, users, datasets, persons

app = FastAPI(
    title="Xuanren API",
    description="Python backend for Xuanren project",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(persons.router, prefix="/api/persons", tags=["persons"])

# Health check
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
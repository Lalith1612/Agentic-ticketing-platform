import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.environ.get("JWT_SECRET", "showspot-jwt-secret-2024-xK9mP2vL")
ALGORITHM = "HS256"
TOKEN_HOURS = 48

security = HTTPBearer(auto_error=False)

def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id, email):
    return jwt.encode(
        {"user_id": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)},
        SECRET_KEY, algorithm=ALGORITHM
    )

def decode_token(token):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(401, "Not authenticated")
    return decode_token(credentials.credentials)

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        return decode_token(credentials.credentials)
    except:
        return None

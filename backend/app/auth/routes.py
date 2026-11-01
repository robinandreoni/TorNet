from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .models import User
from .schemas import UserCreate, UserLogin, UserResponse, Token
from .utils import verify_password, get_password_hash, create_access_token, get_current_user
from ..config import DEFAULT_ADMIN_USER, DEFAULT_ADMIN_PASS

router = APIRouter(prefix="/auth", tags=["Authentication"])

def ensure_default_admin(db: Session):
    admin = db.query(User).filter(User.username == DEFAULT_ADMIN_USER).first()
    if not admin:
        new_admin = User(
            username=DEFAULT_ADMIN_USER,
            email="admin@tornet.local",
            hashed_password=get_password_hash(DEFAULT_ADMIN_PASS),
            is_active=True,
            is_admin=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    ensure_default_admin(db)
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome utente o password errati"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account disattivato"
        )
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome utente già registrato"
        )
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        is_active=True,
        is_admin=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

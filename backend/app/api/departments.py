from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.hospital_models import Department, User
from backend.app.schemas.hospital_schemas import DepartmentCreate, DepartmentOut
from backend.app.api.deps import require_admin, get_current_user

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).filter(Department.is_active == True).order_by(Department.name).all()

@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing = db.query(Department).filter(
        (Department.name.ilike(payload.name)) | (Department.code.ilike(payload.code))
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department with this name or code already exists"
        )
    
    dept = Department(
        name=payload.name,
        code=payload.code.upper(),
        description=payload.description,
        icon=payload.icon or "Activity",
        is_active=payload.is_active if payload.is_active is not None else True
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: int,
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    
    dept.name = payload.name
    dept.code = payload.code.upper()
    dept.description = payload.description
    dept.icon = payload.icon or dept.icon
    if payload.is_active is not None:
        dept.is_active = payload.is_active
    
    db.commit()
    db.refresh(dept)
    return dept

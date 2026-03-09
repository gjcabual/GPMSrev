import re
from fastapi import HTTPException, status

EMAIL_REGEX = re.compile(
    r"^(?=.{6,254}$)(?=.{1,64}@)[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*@"
    r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)
PASSWORD_REGEX = re.compile(
    r"^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$"
)

PASSWORD_POLICY_MESSAGE = (
    "Password must be at least 8 characters and include one uppercase, one number, and one special character."
)
EMAIL_POLICY_MESSAGE = "Please enter a valid email address."


def normalize_email(value: str) -> str:
    return str(value or "").strip().lower()


def is_valid_email(value: str) -> bool:
    return bool(EMAIL_REGEX.fullmatch(normalize_email(value)))


def is_valid_password(value: str) -> bool:
    return bool(PASSWORD_REGEX.fullmatch(str(value or "")))


def ensure_valid_email(value: str, detail: str = EMAIL_POLICY_MESSAGE) -> str:
    email = normalize_email(value)
    if not is_valid_email(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
    return email


def ensure_valid_password(value: str, detail: str = PASSWORD_POLICY_MESSAGE) -> str:
    password = str(value or "")
    if not is_valid_password(password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
    return password

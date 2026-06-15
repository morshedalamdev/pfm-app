import re

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_LENGTH = 128


def normalize_email(email: str) -> str:
    normalized_email = email.strip().lower()
    if len(normalized_email) > 320 or not EMAIL_PATTERN.fullmatch(normalized_email):
        raise ValueError("Invalid email address")
    return normalized_email


def validate_password_strength(password: str) -> str:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError("Password must be at least 12 characters")
    if len(password) > MAX_PASSWORD_LENGTH:
        raise ValueError("Password must be at most 128 characters")
    if not any(character.islower() for character in password):
        raise ValueError("Password must contain a lowercase letter")
    if not any(character.isupper() for character in password):
        raise ValueError("Password must contain an uppercase letter")
    if not any(character.isdigit() for character in password):
        raise ValueError("Password must contain a number")
    return password

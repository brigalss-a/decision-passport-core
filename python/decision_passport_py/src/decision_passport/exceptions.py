class DecisionPassportError(Exception):
    """Base exception type for Decision Passport Python reference implementation."""


class CanonicalSerializationError(DecisionPassportError):
    """Raised when canonical serialization cannot represent a value."""


class ChainValidationError(DecisionPassportError):
    """Raised when a chain fails append-only integrity checks."""

export class CanonicalSerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalSerializationError";
  }
}

export class ChainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChainValidationError";
  }
}

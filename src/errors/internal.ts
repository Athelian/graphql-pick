class InternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalError";
  }
}

export class UnintializedError extends InternalError {
  constructor(message: string) {
    super("Pick not initialized. " + message);
  }
}

export class DocumentUninitializedError extends UnintializedError {
  constructor() {
    super("Missing document.");
  }
}

export class SchemaUninitializedError extends UnintializedError {
  constructor() {
    super("Missing schema.");
  }
}

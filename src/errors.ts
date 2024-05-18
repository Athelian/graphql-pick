export class UnspecifiedSelectionsError extends Error {
  constructor() {
    super("Missing selection in field path.");
    Object.setPrototypeOf(this, UnspecifiedSelectionsError.prototype);
  }
}

export class UnspecifiedTypeResolverError extends Error {
  constructor() {
    super("Missing type resolution for union type.");
    Object.setPrototypeOf(this, UnspecifiedTypeResolverError.prototype);
  }
}

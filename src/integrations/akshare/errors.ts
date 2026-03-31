export class AkshareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AkshareValidationError extends AkshareError {}

export class AkshareTransportError extends AkshareError {}

export class AkshareProtocolError extends AkshareError {}

export class AkshareExecutionError extends AkshareError {}

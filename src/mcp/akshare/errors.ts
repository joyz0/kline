export class AkshareMcpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AkshareMcpTransportError extends AkshareMcpError {}

export class AkshareMcpProtocolError extends AkshareMcpError {}

export class AkshareMcpExecutionError extends AkshareMcpError {}

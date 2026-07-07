declare module "alexa-verifier" {
  function verifier(
    certUrl: string,
    signature: string,
    requestBody: string,
    callback: (err?: Error | string | null) => void
  ): void;
  export = verifier;
}

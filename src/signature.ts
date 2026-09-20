import { createHmac, timingSafeEqual } from "node:crypto";
import { DEFAULT_SIGNATURE_TOLERANCE_SECONDS } from "./constants";
import { SuperchatError, SuperchatSignatureError, type SignatureErrorCode } from "./errors";
import type { WebhookEventEnvelope, WebhookVerifyOptions } from "./types/webhooks";

const SHA256_HEX = /^[0-9a-f]{64}$/i;
const textDecoder = new TextDecoder();

type SignatureEvaluation =
  | { valid: true; timestamp: number }
  | { valid: false; code: SignatureErrorCode; reason: string };

/**
 * Computes the `v1` value of a Superchat webhook signature: the HMAC-SHA256 of
 * `` `${timestamp}.${rawBody}` `` with the subscription secret, hex encoded.
 */
export function computeSignature(payload: string, secret: string, timestamp: number): string {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

/**
 * Verifies the `X-Superchat-Signature` header of a webhook request.
 *
 * Returns `false` when the header is missing or malformed, when the timestamp
 * falls outside the replay tolerance, or when the signature does not match.
 * Only a missing `secret` throws, because that is a configuration error rather
 * than an untrusted request.
 */
export function verifyWebhookSignature(options: WebhookVerifyOptions): boolean {
  const evaluation = evaluateSignature(options);
  if (evaluation.valid) return true;
  if (evaluation.code === "missing_secret") {
    throw new SuperchatSignatureError(evaluation.reason, evaluation.code);
  }
  return false;
}

/**
 * Verifies the signature of a webhook request and returns the parsed event
 * envelope.
 *
 * Throws a {@link SuperchatSignatureError} when verification fails, and a
 * {@link SuperchatError} with code `invalid_payload` when a verified body is not
 * a JSON event envelope.
 */
export function constructWebhookEvent<T = unknown>(options: WebhookVerifyOptions): WebhookEventEnvelope<T> {
  const evaluation = evaluateSignature(options);
  if (!evaluation.valid) {
    throw new SuperchatSignatureError(evaluation.reason, evaluation.code);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadToString(options.payload)) as unknown;
  } catch {
    throw new SuperchatError("Verified webhook payload is not valid JSON.", { code: "invalid_payload" });
  }

  if (typeof parsed !== "object" || parsed === null || typeof (parsed as { event?: unknown }).event !== "string") {
    throw new SuperchatError("Verified webhook payload is missing the `event` field.", {
      code: "invalid_payload",
    });
  }

  return parsed as WebhookEventEnvelope<T>;
}

function evaluateSignature(options: WebhookVerifyOptions): SignatureEvaluation {
  const { secret, signatureHeader } = options;

  if (!secret) {
    return { valid: false, code: "missing_secret", reason: "Missing webhook signing secret." };
  }

  if (!signatureHeader) {
    return {
      valid: false,
      code: "malformed_header",
      reason: "Missing the X-Superchat-Signature header value.",
    };
  }

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) {
    return {
      valid: false,
      code: "malformed_header",
      reason: `Malformed signature header "${signatureHeader}"; expected "t=<unix-seconds>,v1=<hex>".`,
    };
  }

  const tolerance = options.toleranceInSeconds ?? DEFAULT_SIGNATURE_TOLERANCE_SECONDS;
  if (tolerance > 0) {
    const age = Math.abs(Math.floor(Date.now() / 1000) - parsed.timestamp);
    if (age > tolerance) {
      return {
        valid: false,
        code: "timestamp_outside_tolerance",
        reason: `Webhook timestamp is ${age}s old and exceeds the ${tolerance}s tolerance.`,
      };
    }
  }

  const expected = computeSignature(payloadToString(options.payload), secret, parsed.timestamp);
  if (!timingSafeEqualHex(expected, parsed.signature)) {
    return {
      valid: false,
      code: "signature_mismatch",
      reason: "Webhook signature does not match the signed payload.",
    };
  }

  return { valid: true, timestamp: parsed.timestamp };
}

function parseSignatureHeader(header: string): { timestamp: number; signature: string } | undefined {
  let timestamp: number | undefined;
  let signature: string | undefined;

  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (value.length === 0) continue;

    if (key === "t") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) timestamp = parsed;
    } else if (key === "v1") {
      signature = value;
    }
  }

  if (timestamp === undefined || signature === undefined) return undefined;
  return { timestamp, signature };
}

function timingSafeEqualHex(expectedHex: string, receivedHex: string): boolean {
  if (!SHA256_HEX.test(receivedHex)) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex.toLowerCase(), "hex");
  if (expected.length !== received.length) return false;

  return timingSafeEqual(expected, received);
}

function payloadToString(payload: string | Uint8Array): string {
  return typeof payload === "string" ? payload : textDecoder.decode(payload);
}

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { appOrigin, secret } from "./config.mjs";
export function constantEqual(left, right) {
  return (
    typeof left === "string" &&
    typeof right === "string" &&
    Buffer.byteLength(left) === Buffer.byteLength(right) &&
    timingSafeEqual(Buffer.from(left), Buffer.from(right))
  );
}
export function requestContext(
  request,
  env = process.env,
  { mutate = false } = {},
) {
  const canonical = new URL(appOrigin(env));
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host") ?? requestUrl.host;
  if (host !== canonical.host) throw new Error("REQUEST_HOST_REJECTED");
  let ip = "127.0.0.1";
  if (env.TRUST_PROXY === "true") {
    if (
      !constantEqual(
        request.headers.get("x-atlas-proxy-key"),
        secret("TRUST_PROXY_KEY", env),
      )
    )
      throw new Error("PROXY_AUTH_REJECTED");
    if (
      request.headers.get("x-forwarded-proto") !==
        canonical.protocol.slice(0, -1) ||
      request.headers.get("x-forwarded-host") !== canonical.host
    )
      throw new Error("PROXY_HEADERS_REJECTED");
    ip = request.headers.get("x-real-ip") ?? "";
    if (!isIP(ip)) throw new Error("PROXY_IP_REJECTED");
  } else {
    if (!["localhost", "127.0.0.1", "[::1]"].includes(canonical.hostname))
      throw new Error("TRUSTED_PROXY_REQUIRED");
    if (requestUrl.protocol !== canonical.protocol)
      throw new Error("REQUEST_PROTOCOL_REJECTED");
    // Next adds forwarding headers internally. In direct local mode they are ignored.
  }
  if (mutate && request.headers.get("origin") !== canonical.origin)
    throw new Error("REQUEST_ORIGIN_REJECTED");
  return { origin: canonical.origin, ip };
}
export function opaqueHash(value, key) {
  return createHmac("sha256", key).update(value).digest("hex");
}
export function guestIdentity(cookie, key, now = Date.now()) {
  const [id, expiry, signature] =
    typeof cookie === "string" ? cookie.split(".") : [];
  const valid =
    !!id &&
    /^[A-Za-z0-9_-]{43}$/.test(id) &&
    /^\d{13}$/.test(expiry ?? "") &&
    Number(expiry) > now &&
    Number(expiry) <= now + 86400000 &&
    constantEqual(signature, opaqueHash(id + "." + expiry, key));
  if (valid) return { id, cookie };
  const fresh = randomBytes(32).toString("base64url"),
    expires = String(now + 86400000);
  return {
    id: fresh,
    cookie:
      fresh + "." + expires + "." + opaqueHash(fresh + "." + expires, key),
  };
}

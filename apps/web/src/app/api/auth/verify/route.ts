import {
  accountTokenStatus,
  consumeAccountToken,
  databaseReady,
} from "@sim/persistence";
import { tokenHash } from "../../../../lib/auth";
import {
  accountFailure,
  accountForm,
  accountReply,
  AuthError,
} from "../../../../lib/account-service";
export async function POST(request: Request) {
  try {
    const form = await accountForm(request);
    if (!(await databaseReady()))
      throw new AuthError("AUTH_STORAGE_UNAVAILABLE", 503);
    const token = form.get("token");
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new AuthError("AUTH_TOKEN_INVALID");
    const hash = tokenHash(token);
    if (!(await consumeAccountToken(hash, "verify"))) {
      const status = await accountTokenStatus(hash, "verify");
      throw new AuthError(
        status === "expired"
          ? "AUTH_TOKEN_EXPIRED"
          : status === "already-used"
            ? "AUTH_TOKEN_ALREADY_USED"
            : "AUTH_TOKEN_INVALID",
      );
    }
    return accountReply(request, "/account?notice=verified", { ok: true });
  } catch (error) {
    return accountFailure(request, error, "/account/verify-email");
  }
}

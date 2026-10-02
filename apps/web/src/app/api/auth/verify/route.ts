import { consumeAccountToken, databaseReady } from "@sim/persistence";
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
    if (
      !token ||
      !/^[A-Za-z0-9_-]{43}$/.test(token) ||
      !(await consumeAccountToken(tokenHash(token), "verify"))
    )
      throw new AuthError("AUTH_TOKEN_INVALID");
    return accountReply(request, "/account?notice=verified", { ok: true });
  } catch (error) {
    return accountFailure(request, error);
  }
}

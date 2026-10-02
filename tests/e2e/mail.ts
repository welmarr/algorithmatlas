import { expect, type APIRequestContext } from "@playwright/test";
export async function emailLink(
  request: APIRequestContext,
  email: string,
  purpose: "verify" | "reset",
) {
  let text = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(
          `${process.env.MAILPIT_API}/api/v1/search?query=${encodeURIComponent("to:" + email)}`,
        );
        const data = await response.json();
        const message = data.messages?.find((m: { Subject: string }) =>
          m.Subject.startsWith(purpose === "verify" ? "Verify" : "Reset"),
        );
        if (!message) return false;
        const detail = await request.get(
          `${process.env.MAILPIT_API}/api/v1/message/${message.ID}`,
        );
        text = (await detail.json()).Text;
        return !!text;
      },
      { timeout: 15000 },
    )
    .toBe(true);
  const url = text.match(/https?:\/\/[^\s]+/)?.[0];
  if (!url) throw new Error("Expected local email link");
  return url;
}

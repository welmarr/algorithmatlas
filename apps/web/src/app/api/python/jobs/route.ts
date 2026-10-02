import { proxyPython } from "../../../../lib/python-api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return proxyPython(request);
}

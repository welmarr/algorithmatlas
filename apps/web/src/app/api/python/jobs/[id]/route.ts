import { proxyPython } from "../../../../../lib/python-api";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxyPython(request, (await params).id);
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxyPython(request, (await params).id);
}

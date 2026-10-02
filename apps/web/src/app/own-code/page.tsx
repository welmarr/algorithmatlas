import { OwnCodeWorkspace } from "../../components/OwnCodeWorkspace";
import { pythonConfigured } from "../../lib/python-api";
import "../own-code.css";
export const dynamic = "force-dynamic";
export default function OwnCodePage() {
  return <OwnCodeWorkspace enabled={pythonConfigured()} />;
}

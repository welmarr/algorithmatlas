import Link from "next/link";
import { AlgorithmLab } from "../../components/AlgorithmLab";
import "./lab.css";
export default function LabPage() {
  return (
    <main className="lab-page lab-workspace">
      <div className="lab-heading">
        <div>
          <div className="eyebrow">ALGORITHM LAB</div>
          <h1>Build an input. Follow the algorithm.</h1>
          <p>
            Choose a structure, edit it directly, and replay how an algorithm
            responds. Every run stays on this page.
          </p>
        </div>
        <div className="lab-heading-links">
          <Link className="back-link" href="/lab/compare">
            Compare algorithms →
          </Link>
          <Link className="back-link" href="/lab/renderers">
            Structure gallery →
          </Link>
        </div>
      </div>
      <AlgorithmLab />
    </main>
  );
}

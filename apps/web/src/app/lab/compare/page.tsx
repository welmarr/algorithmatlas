import Link from "next/link";
import { AlgorithmComparison } from "../../../components/AlgorithmComparison";
import "../lab.css";
import "./compare.css";

export default function ComparePage() {
  return (
    <main className="lab-page lab-workspace comparison-page">
      <div className="lab-heading">
        <div>
          <div className="eyebrow">ALGORITHM COMPARISON</div>
          <h1>One input. Two ways through it.</h1>
          <p>
            Compare the actual event traces, explore each timeline, and check
            the resulting route or visit order.
          </p>
        </div>
        <Link className="back-link" href="/lab">
          ← Algorithm lab
        </Link>
      </div>
      <AlgorithmComparison />
    </main>
  );
}

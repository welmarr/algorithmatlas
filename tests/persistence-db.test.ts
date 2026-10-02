import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createSession,
  createUser,
  consumeRateLimit,
  dashboardData,
  databasePool,
  databaseReady,
  deleteSavedInput,
  deleteSession,
  findSavedInput,
  findSessionUser,
  recordCuratedRun,
  saveInput,
  saveSubmission,
  setLearningProgress,
} from "@sim/persistence";

const dbIt = process.env.DB_TEST_URL ? it : it.skip;

describe("PostgreSQL account isolation", () => {
  dbIt(
    "stores runs and inputs for one user without exposing them to another",
    async () => {
      process.env.DATABASE_URL = process.env.DB_TEST_URL;
      expect(await databaseReady()).toBe(true);
      const suffix = randomUUID();
      const first = await createUser(
        `first-${suffix}@example.test`,
        "First",
        "test-hash",
      );
      const second = await createUser(
        `second-${suffix}@example.test`,
        "Second",
        "test-hash",
      );
      try {
        const token = "a".repeat(64);
        await createSession(first.id, token, new Date(Date.now() + 60000));
        expect((await findSessionUser(token))?.id).toBe(first.id);
        const savedId = await saveInput(
          first.id,
          "increasing-array",
          "Hard case",
          { values: [8, 2, 5, 1, 7] },
        );
        expect((await findSavedInput(first.id, savedId))?.name).toBe(
          "Hard case",
        );
        expect(await findSavedInput(second.id, savedId)).toBeNull();
        expect(await deleteSavedInput(second.id, savedId)).toBe(false);
        await recordCuratedRun(
          first.id,
          "increasing-array",
          { values: [8, 2, 5, 1, 7] },
          "17",
          29,
        );
        await saveSubmission(
          first.id,
          "increasing-array",
          "javascript",
          "return 17;",
        );
        await setLearningProgress(first.id, "greedy", "practicing");
        const own = await dashboardData(first.id);
        const other = await dashboardData(second.id);
        expect(own).toMatchObject({
          problemsExplored: 1,
          simulationsCompleted: 1,
        });
        expect(own.recentRuns).toHaveLength(1);
        expect(own.savedInputs).toHaveLength(1);
        expect(own.learning).toEqual([
          { conceptId: "greedy", status: "practicing" },
        ]);
        expect(other).toMatchObject({
          problemsExplored: 0,
          simulationsCompleted: 0,
          recentRuns: [],
          savedInputs: [],
          learning: [],
        });
        const rateSubject = `test-${suffix}`;
        expect(await consumeRateLimit("test-quota", rateSubject, 2, 60)).toBe(
          true,
        );
        expect(await consumeRateLimit("test-quota", rateSubject, 2, 60)).toBe(
          true,
        );
        expect(await consumeRateLimit("test-quota", rateSubject, 2, 60)).toBe(
          false,
        );
        await deleteSession(token);
        expect(await findSessionUser(token)).toBeNull();
        const columns = await databasePool().query(
          "SELECT column_name FROM information_schema.columns WHERE table_name = $1",
          ["provider_configurations"],
        );
        expect(columns.rows.map((row) => row.column_name)).not.toContain(
          "api_key",
        );
      } finally {
        await databasePool().query(
          "DELETE FROM users WHERE id = ANY($1::uuid[])",
          [[first.id, second.id]],
        );
      }
    },
    15000,
  );
});

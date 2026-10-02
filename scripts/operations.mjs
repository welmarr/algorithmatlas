import {
  operationsPool,
  operationsStatus,
  pruneOperations,
  setControl,
} from "@sim/operations";
const [action, name, value] = process.argv.slice(2);
try {
  if (action === "status")
    console.info(JSON.stringify(await operationsStatus(), null, 2));
  else if (action === "prune")
    console.info(JSON.stringify(await pruneOperations()));
  else if (action === "control" && ["on", "off"].includes(value)) {
    await setControl(name, value === "on");
    console.info(JSON.stringify({ control: name, enabled: value === "on" }));
  } else if (action === "revoke-sessions" && name === "CONFIRM") {
    const result = await operationsPool().query("DELETE FROM sessions");
    console.info(JSON.stringify({ revoked: result.rowCount }));
  } else
    throw new Error(
      "Use status | prune | control NAME on|off | revoke-sessions CONFIRM",
    );
} catch (error) {
  console.error(
    error.message.startsWith("Use ")
      ? error.message
      : "OPERATIONS_COMMAND_FAILED",
  );
  process.exitCode = 1;
} finally {
  await operationsPool().end();
}

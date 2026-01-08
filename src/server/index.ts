import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";
import { printClientHelp, getInput } from "../internal/gamelogic/gamelogic.js";

async function main() {
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("Peril game server connected to RabbitMQ!");

  const ps: PlayingState = { isPaused: true };
  const ch = await conn.createConfirmChannel();

  ["SIGINT", "SIGTERM"].forEach((signal) =>
    process.on(signal, async () => {
      try {
        await conn.close();
        console.log("RabbitMQ connection closed.");
      } catch (err) {
        console.error("Error closing RabbitMQ connection:", err);
      } finally {
        process.exit(0);
      }
    })
  );

  printClientHelp();
  outerLoop: while (true) {
    const input = await getInput("> ");
    switch (input[0]) {
      case "pause":
        console.log("Pausing the game.");
        ps.isPaused = true;
        break;
      case "resume":
        console.log("Resuming the game.");
        ps.isPaused = false;
        break;
      case "quit":
        break outerLoop;
      default:
        console.log(`Unknown command: ${input[0]}`);
        printClientHelp();
        continue;
    }
    publishJSON(ch, ExchangePerilDirect, PauseKey, ps);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

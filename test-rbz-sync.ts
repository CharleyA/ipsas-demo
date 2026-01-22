
import { ExternalRateService } from "./src/lib/services/external-rate.service";

async function test() {
  try {
    console.log("Starting RBZ sync test...");
    const rate = await ExternalRateService.syncRBZRate("test-actor");
    console.log("Sync successful!");
    console.log("Rate:", rate);
  } catch (error) {
    console.error("Sync failed:", error);
  }
}

test();

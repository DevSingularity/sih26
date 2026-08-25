import type { Asset, Status } from "./types.js";

export function evaluateStatus(asset: Asset): Status {
  switch (asset.type) {
    case "fuel":
      if (asset.value < 20) return "critical";
      if (asset.value < 35) return "warn";
      return "ok";
    case "cargo":
      return asset.value < 5 ? "warn" : "ok";
    case "personnel":
      return "ok";
  }
}

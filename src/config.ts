import * as fs from "node:fs";
import * as path from "node:path";
import type { FactoryConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

export function loadConfig(cwd: string): FactoryConfig {
  const configPath = path.join(cwd, ".factoryrc.yml");
  if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const result: Record<string, unknown> = {};
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*(\w[\w.]*):\s*(.+)$/);
      if (m) {
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        result[m[1]] = val;
      }
    }
    return {
      orchestratorUrl: (result["orchestratorUrl"] as string) || DEFAULT_CONFIG.orchestratorUrl,
      defaultEnvironment: (result["defaultEnvironment"] as string) || DEFAULT_CONFIG.defaultEnvironment,
      const defaultLimit = parseInt(result["defaultLimit"] as string);
      const requestTimeout = parseInt(result["requestTimeout"] as string);
      const maxLogLines = parseInt(result["maxLogLines"] as string);
    return {
      orchestratorUrl: (result["orchestratorUrl"] as string) || DEFAULT_CONFIG.orchestratorUrl,
      defaultEnvironment: (result["defaultEnvironment"] as string) || DEFAULT_CONFIG.defaultEnvironment,
      defaultLimit: isNaN(defaultLimit) ? DEFAULT_CONFIG.defaultLimit : defaultLimit,
      requestTimeout: isNaN(requestTimeout) ? DEFAULT_CONFIG.requestTimeout : requestTimeout,
      maxLogLines: isNaN(maxLogLines) ? DEFAULT_CONFIG.maxLogLines : maxLogLines,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

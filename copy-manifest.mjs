import { copyFileSync, mkdirSync } from "node:fs";

// Ensure the target directory exists before copying
mkdirSync("dist", { recursive: true });
copyFileSync("appsscript.json", "dist/appsscript.json");

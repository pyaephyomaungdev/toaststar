import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = resolve(scriptDir, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const offenders = dependencySections
  .filter((section) => packageJson[section]?.[packageJson.name] !== undefined)
  .map((section) => `${section}.${packageJson.name}`);

const bundledSections = ["bundleDependencies", "bundledDependencies"];

for (const section of bundledSections) {
  const entries = packageJson[section];
  if (Array.isArray(entries) && entries.includes(packageJson.name)) {
    offenders.push(`${section}[${packageJson.name}]`);
  }
}

if (offenders.length > 0) {
  console.error(
    [
      `Refusing to publish ${packageJson.name}: package metadata contains a self-reference.`,
      `Remove these entries before packing or publishing: ${offenders.join(", ")}`,
    ].join("\n"),
  );
  process.exit(1);
}

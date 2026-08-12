import { spawn } from "node:child_process";

const hasCloudCredentials = Boolean(
  process.env.NEXT_PUBLIC_TINA_CLIENT_ID && process.env.TINA_TOKEN
);

const args = hasCloudCredentials
  ? ["build", "--content=local"]
  : ["build", "--local", "--skip-cloud-checks"];

console.log(
  `[tina-build] ${hasCloudCredentials ? "using TinaCloud/Git-backed admin build" : "using local admin build"}`
);

const child = spawn("tinacms", args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

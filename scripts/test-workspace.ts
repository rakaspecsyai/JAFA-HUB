import { cp, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function createTestWorkspace(prefix: string) {
  const project = process.cwd();
  await mkdir(join(project, ".local"), { recursive: true });
  const workspace = await mkdtemp(join(project, ".local", prefix));
  for (const name of ["src", "public", "data", "prisma", "scripts", "tests", "package.json", "package-lock.json", "prisma.config.ts", "tsconfig.json", "next-env.d.ts", ".env.example"]) {
    await cp(join(project, name), join(workspace, name), { recursive: true, force: false, errorOnExist: true });
  }
  await symlink(join(project, "node_modules"), join(workspace, "node_modules"), "dir");
  // Keep the dependency symlink inside Turbopack's root without changing the running app's config.
  await writeFile(join(workspace, "next.config.ts"), `${await readFile(join(project, "next.config.ts"), "utf8")}\nconfig.turbopack = { ...config.turbopack, root: ${JSON.stringify(project)} };\n`, { flag: "wx", mode: 0o600 });
  return workspace;
}

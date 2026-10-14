import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

// Devtools DOM attributes are invalid nested property paths on R3F objects.
const stripTsdSourceFrom3D = {
  name: "strip-tsd-source-r3f",
  enforce: "post" as const,
  apply: "serve" as const,
  transform(code: string, id: string) {
    if (
      id.includes("node_modules") ||
      !code.includes("data-tsd-source") ||
      !code.includes("@react-three/fiber")
    )
      return;
    return {
      code: code.replace(/['"]data-tsd-source['"]\s*:\s*['"][^'"]*['"]\s*,?/g, ""),
      map: null,
    };
  },
};

export default defineConfig({
  plugins: [
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Resolve the application router from the project source directory in
      // both local and Vercel production builds.
      srcDirectory: "src",
      router: { entry: "./router.tsx" },
      server: { entry: "./server.ts" },
    }),
    viteReact(),
    tailwindcss(),
    nitro(),
    stripTsdSourceFrom3D,
  ],
  server: {
    // Sandbox preview hostnames are generated per session.
    allowedHosts: true,
  },
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
});

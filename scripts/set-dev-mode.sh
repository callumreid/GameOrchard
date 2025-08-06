# Save as scripts/set-dev-mode.sh
sed -i '' -E 's|^\s*output:\s*"export",\s*// Disabled for development to allow API routes|// output: "export", // Disabled for development to allow API routes|' next.config.dev.ts
sed -i '' -E 's|^\s*export const dynamic = "force-static";|// export const dynamic = "force-static";|' src/app/api/session/route.ts
sed -i '' -E 's|^\s*export const dynamic = "force-static";|// export const dynamic = "force-static";|' src/app/api/responses/route.ts

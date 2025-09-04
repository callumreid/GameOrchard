import type { Config } from "tailwindcss";
import type { PluginAPI } from "tailwindcss/types/config"; // Import PluginAPI

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [
    function ({ addUtilities }: PluginAPI) {
      const newUtilities = {
        ".text-shadow-lg": {
          "text-shadow":
            "0px 1px 2px rgba(0, 0, 0, 0.5), 0px 3px 2px rgba(0, 0, 0, 0.1), 0px 4px 8px rgba(0, 0, 0, 0.1)",
        },
        ".text-shadow-md": {
          "text-shadow":
            "0px 1px 2px rgba(0, 0, 0, 0.2), 0px 3px 2px rgba(0, 0, 0, 0.1), 0px 4px 8px rgba(0, 0, 0, 0.1)",
        },
      };
      addUtilities(newUtilities);
    },
  ],
} satisfies Config;

// project-frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // This tells Tailwind to scan your HTML and all React files for classes
  ],
  theme: {
    extend: {
      colors: {
        // Your custom color palette, easily referenced by name in Tailwind classes
        'main-dark': '#222831',
        'secondary-dark': '#393E46',
        'accent-teal': '#00ADB5',
        'light-gray': '#EEEEEE',
        'lighter-red': '#F47C7C',
        // Derived colors for hover states or specific uses
        'darker-teal': '#008C94',
        'darker-charcoal': '#2B3036',
        'darker-light-gray': '#DBDBDB',
        'darker-lighter-red': '#E06666',
      }
    },
  },
  plugins: [],
}
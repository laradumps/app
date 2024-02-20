const colors = require("tailwindcss/colors");
module.exports = {
    content: ["./src/renderer/*.vue", "./src/renderer/components/*.vue", "./src/renderer/views/*.vue"],
    darkMode: "class",
    safelist: [
        {
            pattern: /bg-(slate|gray|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|violet|purple|pink)-(100|200|300|400|500|600|700|800)/
        },
        {
            pattern: /border-(slate|gray|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|blue|violet|purple|pink)-(100|200|300|400|500|600|700|800)/
        },
        "bg-black",
        "w-[1rem]",
        "h-[1rem]",
        "w-20",
        "gap-2"
    ],

    theme: {
        listStyleType: {
            none: "none",
            square: "square",
            roman: "upper-roman"
        },
        height: {
            "fill-available": "-webkit-fill-available"
        },
        zIndex: {
            100: "100",
            200: "200",
            300: "300"
        },
        screens: {
            tiny: "340px"
        },
        extend: {
            colors: {
                base1: colors.neutral,
                // primary: colors.amber
            }
        }
    },
    daisyui: {
        themes: [
            "light",
            "dark",
            "cupcake",
            "bumblebee",
            "emerald",
            "corporate",
            "synthwave",
            "retro",
            "cyberpunk",
            "valentine",
            "halloween",
            "garden",
            "forest",
            "aqua",
            "lofi",
            "pastel",
            "fantasy",
            "wireframe",
            "black",
            "luxury",
            "dracula",
            "cmyk",
            "autumn",
            "business",
            "acid",
            "lemonade",
            "night",
            "coffee",
            "winter",
            "dim",
            "nord",
            "sunset",
        ],
    },
    plugins: [
        require("postcss-import"),
        require("@tailwindcss/forms")({
            strategy: "class"
        }),
        require("daisyui")
    ]
};

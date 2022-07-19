module.exports = {
    content: [
        './src/renderer/*.html',
        './src/renderer/*/*/*.js',
        './src/renderer/js/*.js',
        './src/renderer/*.css',
        './src/renderer/*.js',
    ],
    darkMode: 'class',
    safelist: [
        {
            pattern: /bg-(slate|gray|zinc|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(100|200|300|400|500|600|700|800|900|1000)/,
            variants: ['lg', 'hover', 'focus', 'lg:hover'],
        },
        'bg-black',
        'w-[1rem]',
        'w-20',
    ],
    theme: {
        height: {
            'fill-available': '-webkit-fill-available',
        },
        zIndex: {
            100: '100',
            200: '200',
            300: '300',
        },
    },
};

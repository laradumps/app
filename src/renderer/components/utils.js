export const modifyHtml = (html, id) => {
    const script = String.raw`
        <script type="module">
        document.addEventListener("DOMContentLoaded", function () {
            document.body.addEventListener("click", function (event) {
                const target = event.target.closest("a");
                if (target && target.href.startsWith("http")) {
                    event.preventDefault();
                    window.parent.postMessage({ type: "open-external-link-${id}", url: target.href }, "*");
                }
            });
        });
        </script>`;

    return html.replace('</body>', script + '</body>');
};

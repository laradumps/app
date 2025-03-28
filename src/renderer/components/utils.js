export const modifyHtml = (html) => {
    const script = String.raw`
        <script type="module">
        document.addEventListener("DOMContentLoaded", function () {
            document.body.addEventListener("click", function (event) {
                var target = event.target.closest("a");
                if (target && target.href.startsWith("http")) {
                    event.preventDefault();
                    console.log(target.href);
                    window.parent.postMessage({ type: "open-external-link", url: target.href }, "*");
                }
            });
        });
        </script>`;

    return html.replace("</body>", script + "</body>");
};

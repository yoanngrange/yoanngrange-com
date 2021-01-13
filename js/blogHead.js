class blogHead extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="author" content="Yoann Grange" />
    <link href="../css/bootstrap.min.css" rel="stylesheet" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap" rel="stylesheet" />
    <link href="../css/styles.css" rel="stylesheet" />

    <link rel="icon" href="../favicon.ico" />
    <link rel="icon" href="../favicon.svg" type="image/svg+xml" sizes="any" />
    <link rel="apple-touch-icon" href="../fav-apple.png" />
    <link rel="manifest" href="../manifest.webmanifest" />

    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-2771720-9"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'UA-2771720-9');
    </script>
    `;
  }
}

customElements.define('blog-head-component', blogHead);

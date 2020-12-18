class Blog-Head extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="author" content="Yoann Grange" />
    <link href="./css/bootstrap.min.css" rel="stylesheet" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap" rel="stylesheet" />
    <link href="./css/styles.css" rel="stylesheet" />

    <link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="./favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="./favicon-16x16.png">
    <link rel="manifest" href="./site.webmanifest">
    <link rel="mask-icon" href="safari-pinned-tab.svg" color="#262173">
    <meta name="msapplication-TileColor" content="#262173">
    <meta name="theme-color" content="#262173">

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

customElements.define('blog-head-component', Blog-Head);

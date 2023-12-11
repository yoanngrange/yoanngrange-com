class blogHead extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="author" content="Yoann Grange">
    <link href="../css/bootstrap.min.css" rel="stylesheet" media="all">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap" rel="stylesheet" media="all">
    <link href="../css/styles.css" rel="stylesheet" media="all">
    <link rel="icon" href="../favicon.ico">
    <link rel="icon" href="../favicon.svg" type="image/svg+xml" sizes="any">
    <link rel="apple-touch-icon" href="../fav-apple.png">
    <link rel="manifest" href="../site.webmanifest">
    `;
  }
}

customElements.define('blog-head-component', blogHead);

lass Head extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `    
    <link href="css/bootstrap.min.css" rel="stylesheet" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap" rel="stylesheet" />
    <link href="css/styles.css" rel="stylesheet" />
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

customElements.define('head-component', Head);

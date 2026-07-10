class blogHeader extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
    <header class="hero text-center">
        <div class="container py-4">
            <h2><a href="../index.html">Yoann Grange</a></h2>
            <p><a href="mailto:yoann.grange@gmail.com">yoann.grange@gmail.com</a></p>
            <p><a class="btn btn-outline-light" href="../index.html">Retour à l’accueil</a></p>
        </div>
    </header>
    `;
  }
}

customElements.define('blog-header-component', blogHeader);

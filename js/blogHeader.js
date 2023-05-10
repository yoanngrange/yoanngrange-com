class blogHeader extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
    <section class="jumbotron text-center">
        <div class="container">
            <h2><a href="../index.html">Yoann Grange</a></h2>
            <p class="p2"><a href="mailto:yoann.grange@gmail.com">yoann.grange@gmail.com</a></p>
        </div>
    </section>
    `;
  }
}

customElements.define('blog-header-component', blogHeader);

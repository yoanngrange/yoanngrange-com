class Header extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
    <section class="jumbotron text-center">
        <div class="container">
            <h1><a href="index.html">Yoann Grange</a></h1>
            <p class="p2"><a href="mailto:yoann.grange@gmail.com">yoann.grange@gmail.com</a></p>
        </div>
    </section>
    `;
  }
}

customElements.define('header-component', Header);

class Header extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
    <section class="jumbotron text-center">
        <div class="container">
            <h1 class="jumbotron-heading"><a href="index.html">Yoann Grange</a></h1>
            <p class="lead">Product Manager, Marketer &amp; Designer</p>
            <p><a href="https://twitter.com/yoanngrange" target="_blank">@yoanngrange</a> - <a href="mailto:yoann.grange@gmail.com">yoann.grange@gmail.com</a></p>
        </div>
    </section>
    `;
  }
}

customElements.define('header-component', Header);

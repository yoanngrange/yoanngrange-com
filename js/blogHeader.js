class blogHeader extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
    <section class="jumbotron text-center">
        <div class="container">
            <h2><a href="../index.html">Yoann Grange</a></h2>
            <p class="p1">Product Manager, Marketer &amp; Designer</p>
            <p class="p2"><a href="https://twitter.com/yoanngrange" target="_blank" rel="noreferrer">@yoanngrange</a> - <a href="mailto:yoann.grange@gmail.com">yoann.grange@gmail.com</a></p>
        </div>
    </section>
    `;
  }
}

customElements.define('blog-header-component', blogHeader);

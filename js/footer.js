class Footer extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
    <footer class="text-center"><a href="../index.html">&laquo; Back home</a></footer>
    <br>
    <br>
    `;
  }
}

customElements.define('footer-component', Footer);

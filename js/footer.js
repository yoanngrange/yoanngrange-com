class Footer extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
    <footer class="text-center">
      <a class="btn btn-outline-primary" href="../index.html"><span data-lang="en">Back to home</span><span data-lang="fr">Retour à l’accueil</span></a>
    </footer>
    <div class="footer-lang">
      <a href="?lang=fr" data-lang-switch class="lang-switch"><span data-lang-switch-label>Français</span><span class="lang-switch-caret" aria-hidden="true"></span></a>
    </div>
    <br>
    <br>
    `;
  }
}

customElements.define('footer-component', Footer);

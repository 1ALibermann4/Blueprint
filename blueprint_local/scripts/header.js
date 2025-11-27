document.addEventListener('DOMContentLoaded', () => {
  const headerHTML = `
    <nav class="navbar is-link" role="navigation" aria-label="main navigation">
      <div class="navbar-brand">
        <a class="navbar-item" href="/">
          <strong class="title is-4 has-text-white">BluePrint</strong>
        </a>
      </div>
      <div class="navbar-menu">
        <div class="navbar-start">
          <a class="navbar-item" href="/">Projets Publiés</a>
          <a class="navbar-item" href="/intranet/editor.html">Éditeur</a>
          <a class="navbar-item" href="/admin/validate.html">Validation</a>
        </div>
        <div class="navbar-end">
          <div class="navbar-item">
            <div class="buttons">
              <a class="button is-light" onclick="logout()">
                Se déconnecter
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;

  // Inject the header at the beginning of the body
  document.body.insertAdjacentHTML('afterbegin', headerHTML);
});

function logout() {
  window.location.href = '/logout';
}
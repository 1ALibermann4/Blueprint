document.addEventListener('DOMContentLoaded', () => {
    loadLoginHistory();
});

/**
 * Charge et affiche l'historique des connexions.
 */
async function loadLoginHistory() {
    const container = document.getElementById('login-history-list');
    try {
        const response = await fetch('/api/logs/logins');
        if (!response.ok) throw new Error('La récupération de l'historique a échoué');

        const logins = await response.json();
        container.innerHTML = '';

        if (logins.length === 0) {
            container.innerHTML = '<p>Aucune connexion enregistrée.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'table is-fullwidth is-striped';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Utilisateur</th>
                    <th>Date et Heure</th>
                    <th>Statut</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');

        logins.forEach(login => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${login.data.user}</td>
                <td>${new Date(login.timestamp).toLocaleString('fr-FR')}</td>
                <td><span class="tag is-success">${login.data.result}</span></td>
            `;
            tbody.appendChild(tr);
        });

        container.appendChild(table);

    } catch (error) {
        console.error('Erreur lors du chargement de l'historique:', error);
        container.innerHTML = '<p class="has-text-danger">Impossible de charger l'historique.</p>';
    }
}

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function main() {
    console.log('--- Setting up rich test state ---');

    // 1. Create, submit, and publish "Projet Robotique"
    console.log('1. Creating and publishing "Projet Robotique"...');
    const robotiqueData = {
        titre: 'Projet Robotique',
        tags: ['robotique', 'ia'],
        content: '<h1>Projet Robotique</h1><p>Contenu du projet...</p>'
    };
    const robotiqueFile = await saveDraft(robotiqueData);
    await submitForReview(robotiqueFile);
    await publishProject(robotiqueFile);

    // 2. Feature "Projet Robotique"
    console.log('2. Featuring "Projet Robotique" in position 1...');
    await saveFeaturedProjects([{ fileName: 'projet_robotique.html', position: 1 }]);

    // 3. Create, submit, and reject "Projet Hydrogène"
    console.log('3. Creating and rejecting "Projet Hydrogène"...');
    const hydrogeneData = {
        titre: 'Projet Hydrogène',
        tags: ['énergie', 'environnement'],
        content: '<h1>Projet Hydrogène</h1><p>Contenu du projet...</p>'
    };
    const hydrogeneFile = await saveDraft(hydrogeneData);
    await submitForReview(hydrogeneFile);
    await rejectProject(hydrogeneFile);

    console.log('--- Test state setup complete ---');
}

async function saveDraft(data) {
    const response = await axios.post(`${BASE_URL}/api/drafts`, data);
    return response.data.file;
}

async function submitForReview(file) {
    await axios.post(`${BASE_URL}/api/submit_for_review`, { file });
}

async function publishProject(file) {
    await axios.post(`${BASE_URL}/api/publish`, { file });
}

async function saveFeaturedProjects(featured) {
    await axios.post(`${BASE_URL}/api/projects/featured`, { featured });
}

async function rejectProject(file) {
    await axios.post(`${BASE_URL}/api/reject_draft`, { file });
}

main().catch(error => {
    console.error('Error setting up test state:', error.message);
    if (error.response) {
        console.error('Response data:', error.response.data);
    }
});

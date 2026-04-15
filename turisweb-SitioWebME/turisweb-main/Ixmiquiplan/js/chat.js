document.addEventListener('DOMContentLoaded', () => {
    const avatar = document.getElementById('chatbot-avatar');
    const container = document.getElementById('chatbot-container');

    avatar.addEventListener('click', () => {
        // Al hacer clic, alternamos la clase 'show' para mostrar/ocultar
        container.classList.toggle('show');
    });
});
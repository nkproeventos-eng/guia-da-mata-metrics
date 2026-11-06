// Configuração do endereço da API
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api/metrics'
    : '/api/metrics';

// Gerar ou recuperar ID de sessão único
function getSessionId() {
    let sessionId = localStorage.getItem('guia_mata_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('guia_mata_session_id', sessionId);
    }
    return sessionId;
}

// Registrar acesso do usuário automaticamente
function trackSession() {
    fetch(`${API_BASE}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: getSessionId() })
    }).catch(err => console.error('Erro ao registrar sessão:', err));
}

// Registrar clique no botão do WhatsApp
function trackWhatsAppClick(comercioId, comercioNome) {
    fetch(`${API_BASE}/whatsapp-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            comercio_id: comercioId,
            comercio_nome: comercioNome
        })
    }).catch(err => console.error('Erro ao registrar clique:', err));
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', () => {
    trackSession();
});

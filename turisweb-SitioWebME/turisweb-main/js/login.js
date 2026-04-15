// Login Page JavaScript
// Verificar si ya está autenticado
if (isAuthenticated()) {
    const user = getCurrentUser();
    if (user.role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'index.html?view=municipios';
    }
}

function showAlert(message, type = 'error') {
    const container = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    container.innerHTML = '';
    container.appendChild(alertDiv);

    if (type === 'success') {
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

function showHelpAlert() {
    alert('Si has olvidado tu contraseña, contacta a soporte.\n\nCorreo: soporte@turisweb.com\nTeléfono: +52 771 XXXXXX');
}

async function handleLoginSubmit(event) {
    event.preventDefault();

    const usuario = document.getElementById('usuario').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const inputs = document.querySelectorAll('input');

    // Deshabilitar botón y mostrar loader
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loader"></span>';

    try {
        await handleLogin(usuario, password);
        showAlert('¡Login exitoso! Redirigiendo...', 'success');
    } catch (error) {
        showAlert(error.message || 'Error en el login');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Iniciar Sesión</span>';
    }
}
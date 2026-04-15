// Register Page JavaScript
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
        setTimeout(() => alertDiv.remove(), 4000);
    }
}

function checkPasswordRequirements() {
    const password = document.getElementById('password').value;
    const lengthReq = document.getElementById('req-length');

    if (password.length >= 6) {
        lengthReq.classList.add('valid');
    } else {
        lengthReq.classList.remove('valid');
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const registerBtn = document.getElementById('registerBtn');
    const inputs = document.querySelectorAll('input');

    // Deshabilitar botón y mostrar loader
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="loader"></span>';

    try {
        await handleRegister(nombre, email, password, confirmPassword);
        showAlert('¡Registro exitoso! Redirigiendo al login...', 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } catch (error) {
        showAlert(error.message || 'Error en el registro');
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<span>Crear Cuenta</span>';
    }
}
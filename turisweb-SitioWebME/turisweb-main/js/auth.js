// ============================================
// AUTENTICACIÓN Y MANEJO DE USUARIOS
// ============================================

// Configuración de Supabase (mismos datos del móvil)
const SUPABASE_URL = 'https://jnfmwdqvuybqbsurcpjd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZm13ZHF2dXlicWJzdXJjcGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzIzMTAsImV4cCI6MjA3OTA0ODMxMH0._WoKZsz03w8dy6CPRMp2r-Zmhe48Ws8rhnij3nt5C84';

// Clase para manejar Supabase en el navegador
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.url}/rest/v1${endpoint}`, {
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.statusText}`);
    }

    return response.json();
  }

  async getUsers() {
    return this.request('/usuarios1?select=*');
  }

  async insertUser(usuario) {
    return this.request('/usuarios1', {
      method: 'POST',
      body: JSON.stringify(usuario),
    });
  }

  async getUserByName(nombre) {
    const users = await this.getUsers();
    return users.find(u => u.Nombre?.trim() === nombre.trim());
  }
}

// Instancia global de Supabase
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

/**
 * Login - Verifica credenciales y redirige según rol
 */
async function handleLogin(nombre, password) {
  if (!nombre.trim() || !password.trim()) {
    throw new Error('Por favor completa todos los campos');
  }

  try {
    const users = await supabase.getUsers();
    const usuario = users.find(
      (u) => u.Nombre?.trim() === nombre.trim() && u.Pasword === password
    );

    if (!usuario) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    // Guardar usuario en localStorage
    localStorage.setItem('currentUser', JSON.stringify(usuario));

    // Redirigir según rol
    if (usuario.role === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'index.html?view=municipios';
    }

    return usuario;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

/**
 * Registro - Crea un nuevo usuario
 */
async function handleRegister(nombre, email, password, confirmPassword) {
  // Validaciones
  if (!nombre.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
    throw new Error('Por favor completa todos los campos');
  }

  if (password !== confirmPassword) {
    throw new Error('Las contraseñas no coinciden');
  }

  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new Error('Por favor ingresa un correo electrónico válido');
  }

  try {
    const users = await supabase.getUsers();

    // Verificar si el usuario ya existe
    if (users.some(u => u.Nombre?.trim().toLowerCase() === nombre.trim().toLowerCase())) {
      throw new Error('El usuario ya existe. Usa otro nombre.');
    }

    if (users.some(u => u.email?.trim().toLowerCase() === email.trim().toLowerCase())) {
      throw new Error('Este correo ya está registrado. Usa otro o inicia sesión.');
    }

    // Insertar nuevo usuario (sin rol especificado = usuario normal)
    const newUser = {
      Nombre: nombre.trim(),
      email: email.trim(),
      Pasword: password,
      role: 'usuario', // Por defecto es usuario normal
    };

    const result = await supabase.insertUser(newUser);

    if (!result || result.length === 0) {
      throw new Error('No se pudo crear el usuario');
    }

    return result[0];
  } catch (error) {
    console.error('Error en registro:', error);
    throw error;
  }
}

/**
 * Verificar si el usuario está autenticado
 */
function isAuthenticated() {
  return localStorage.getItem('currentUser') !== null;
}

/**
 * Obtener usuario actual
 */
function getCurrentUser() {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

/**
 * Verificar si el usuario actual es admin
 */
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

/**
 * Logout - Limpia la sesión
 */
function handleLogout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

/**
 * Redirigir a login si no está autenticado
 */
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
  }
}

/**
 * Redirigir a login si no es admin
 */
function requireAdmin() {
  if (!isAdmin()) {
    handleLogout();
  }
}

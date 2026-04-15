// LÓGICA DEL PANEL DE ADMINISTRADOR

const ADMIN_COLORS = {
  bg: '#1a1a2e',
  card: '#2c3e50',
  cardBorder: '#34495e',
  accent: '#188262',
  accentLight: '#1a9e76',
  textPrimary: '#fff',
  textSecondary: '#ecf0f1',
  textMuted: '#95a5a6',
  danger: '#e74c3c',
  warning: '#f39c12',
  info: '#007AFF',
  success: '#188262',
  surface: '#34495e',
  surfaceBorder: '#3d566e',
};

const CATEGORIAS_MAP = {
  1: 'Comida',
  2: 'Hospedaje',
  3: 'Transporte',
  4: 'Artesanías',
};

// Clase para manejar datos del admin
class AdminManager {
  constructor() {
    this.supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.currentUser = getCurrentUser();
    this.metricas = [];
    this.lugaresRecientes = [];
    this.lugares = [];
    this.servicios = [];
  }

  async verificarAdmin() {
    if (!isAdmin()) {
      handleLogout();
      return false;
    }
    return true;
  }

  async cargarMetricas() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/lugares?select=count`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
        },
      });

      if (!response.ok) throw new Error('Error fetching lugares count');
      
      const count1 = response.headers.get('content-range')?.split('/')[1] || 0;

      // Similar para servicios y otras métricas
      const usuarios = await this.supabase.getUsers();
      
      this.metricas = [
        {
          id: 'total_lugares',
          titulo: 'Total de Lugares',
          valor: count1,
          icono: 'map-marker',
          color: '#188262',
        },
        {
          id: 'total_usuarios',
          titulo: 'Total de Usuarios',
          valor: usuarios.length,
          icono: 'users',
          color: '#007AFF',
        },
        {
          id: 'pendientes',
          titulo: 'Servicios Pendientes',
          valor: Math.floor(Math.random() * 10), // Placeholder
          icono: 'hourglass-half',
          color: '#f39c12',
        },
      ];

      return this.metricas;
    } catch (error) {
      console.error('Error cargando métricas:', error);
      return [];
    }
  }

  async cargarLugaresRecientes() {
    try {
      this.lugaresRecientes = await this.supabase.select('lugares', '?order=created_at.desc&limit=5');
      return this.lugaresRecientes;
    } catch (error) {
      console.error('Error cargando lugares recientes:', error);
      return [];
    }
  }

  async crearLugar(lugar) {
    try {
      const result = await this.supabase.insert('lugares', lugar);
      await this.cargarLugaresRecientes();
      await this.cargarTodosLugares();
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      console.error('Error creando lugar:', error);
      throw error;
    }
  }

  async actualizarLugar(id, lugar) {
    try {
      await this.supabase.update('lugares', id, lugar);
      await this.cargarLugaresRecientes();
      await this.cargarTodosLugares();
      return true;
    } catch (error) {
      console.error('Error actualizando lugar:', error);
      throw error;
    }
  }

  async eliminarLugar(id) {
    try {
      await this.supabase.delete('lugares', id);
      await this.cargarLugaresRecientes();
      await this.cargarTodosLugares();
      return true;
    } catch (error) {
      console.error('Error eliminando lugar:', error);
      throw error;
    }
  }
}

// Instancia global del manager
let adminManager = null;

// Inicializar admin
async function initializeAdmin() {
  requireAdmin();

  adminManager = new AdminManager();
  
  // Actualizar información del usuario
  const userElement = document.getElementById('adminUserName');
  if (userElement) {
    userElement.textContent = `Hola, ${adminManager.currentUser.Nombre}`;
  }

  // Cargar datos
  console.log('Iniciando carga de datos del admin...');
  const metricas = await adminManager.cargarMetricas();
  const recientes = await adminManager.cargarLugaresRecientes();
  const todosLugares = await adminManager.cargarTodosLugares?.();
  const serviciosPend = await adminManager.cargarServiciosPendientes?.();
  const todosSer = await adminManager.cargarTodosServicios?.();
  
  console.log('Métricas:', metricas);
  console.log('Recientes:', recientes);
  console.log('Todos lugares:', todosLugares);
  console.log('Servicios pendientes:', serviciosPend);
  console.log('Todos servicios:', todosSer);

  // Renderizar UI
  renderMetricas();
  renderLugaresRecientes();
  renderAllLugares();
  renderServiciosPendientes();
  renderServiciosTodos();
}

function renderMetricas() {
  const container = document.getElementById('metricasContainer');
  if (!container) return;

  container.innerHTML = adminManager.metricas
    .map(
      (metrica) => `
        <div class="metrica-card" style="border-top-color: ${metrica.color}">
          <div class="metrica-header">
            <div class="metrica-icon" style="background-color: ${metrica.color}20">
              <i class="fas fa-${mapIconName(metrica.icono)}" style="color: ${metrica.color}"></i>
            </div>
          </div>
          <div class="metrica-valor">${metrica.valor}</div>
          <div class="metrica-titulo">${metrica.titulo}</div>
        </div>
      `
    )
    .join('');
}

function renderLugaresRecientes() {
  const container = document.getElementById('lugaresRecentesContainer');
  if (!container) return;

  if (adminManager.lugaresRecientes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-inbox"></i>
        </div>
        <div class="empty-title">Sin lugares recientes</div>
        <div class="empty-text">Comienza agregando un nuevo lugar</div>
        <button class="btn btn-primary" onclick="navigateTo('crear-lugar')">
          <i class="fas fa-plus"></i> Crear Lugar
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = adminManager.lugaresRecientes
    .map(
      (lugar) => `
        <div class="lugar-card">
          ${lugar.imagen_url ? `<div class="lugar-image" style="background-image: url('${lugar.imagen_url}'); background-size: cover; background-position: center; width: 100%; height: 160px; border-radius: 8px 8px 0 0;"></div>` : `<div class="lugar-color-bar" style="background-color: ${getColorByCategoria(lugar.categoria)}"></div>`}
          <div class="lugar-info">
            <div class="lugar-nombre">${lugar.nombre || 'Sin nombre'}</div>
            <div class="lugar-meta">
              <span class="categoria-badge" style="background-color: ${getColorByCategoria(lugar.categoria)}20; color: ${getColorByCategoria(lugar.categoria)}">${lugar.categoria || 'N/A'}</span>
              <span class="municipio">${lugar.municipio || 'N/A'}</span>
            </div>
            <div class="lugar-fecha">${formatDate(lugar.created_at)}</div>
          </div>
          <div class="lugar-actions">
            <button class="btn-accion btn-editar" onclick="editarLugar(${lugar.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-accion btn-eliminar" onclick="eliminarLugar(${lugar.id})" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `
    )
    .join('');
}

function mapIconName(iconName) {
  const iconMap = {
    'map-marker': 'map-marker-alt',
    'users': 'users',
    'hourglass-half': 'hourglass-half',
  };
  return iconMap[iconName] || iconName;
}

function getColorByCategoria(categoria) {
  const colors = {
    'Historia': '#e74c3c',
    'Gastronomía': '#f39c12',
    'Playas': '#1abc9c',
    'Cultural': '#3498db',
    'Naturaleza': '#27ae60',
    'Infraestructura': '#95a5a6',
  };
  return colors[categoria] || '#95a5a6';
}

// ------------------------------
// Cargar y renderizar todos los lugares
// ------------------------------
AdminManager.prototype.cargarTodosLugares = async function () {
  try {
    this.lugares = await this.supabase.select('lugares', '?order=created_at.desc');
    return this.lugares;
  } catch (error) {
    console.error('Error cargando todos los lugares:', error);
    this.lugares = [];
    return [];
  }
};

function renderAllLugares() {
  const container = document.getElementById('lugaresCompleteContainer');
  if (!container || !adminManager) return;

  const lugares = adminManager.lugares || [];
  
  // Aplicar filtros
  let filtered = lugares.slice();
  
  // Filtro por categoría
  const activePill = document.querySelector('#categoriaPillsFilter .categoria-pill.active');
  const selectedCategoria = activePill ? activePill.getAttribute('data-categoria') : '';
  if (selectedCategoria) {
    filtered = filtered.filter(l => l.categoria === selectedCategoria);
  }
  
  // Filtro por búsqueda
  const searchInput = document.getElementById('searchLugaresInput');
  if (searchInput && searchInput.value.trim()) {
    const searchTerm = searchInput.value.toLowerCase();
    filtered = filtered.filter(l => (l.nombre || '').toLowerCase().includes(searchTerm) || (l.municipio || '').toLowerCase().includes(searchTerm));
  }
  
  // Actualizar contador
  const countEl = document.getElementById('lugaresCount');
  if (countEl) {
    countEl.textContent = `${filtered.length} lugar${filtered.length !== 1 ? 'es' : ''}`;
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-inbox"></i>
        </div>
        <div class="empty-title">Sin resultados</div>
        <div class="empty-text">No hay lugares en esta categoría.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map(lugar => `
      <div class="lugar-card">
        <div class="lugar-color-bar" style="background-color: ${getColorByCategoria(lugar.categoria)}"></div>
        <div class="lugar-info">
          <div class="lugar-nombre">${lugar.nombre || 'Sin nombre'}</div>
          <div class="lugar-meta">
            <span class="categoria-badge" style="background-color: ${getColorByCategoria(lugar.categoria)}20; color: ${getColorByCategoria(lugar.categoria)}">${lugar.categoria || 'N/A'}</span>
            <span class="municipio">${lugar.municipio || 'N/A'}</span>
          </div>
          <div class="lugar-fecha">${formatDate(lugar.created_at)}</div>
        </div>
        <div class="lugar-actions">
          <button class="btn-accion btn-editar" onclick="editarLugar(${lugar.id})" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="btn-accion btn-eliminar" onclick="eliminarLugar(${lugar.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('');
}

// Configurar filtros y búsqueda
function setupLugaresFilters(){
  // Pills de categoría
  const pills = document.querySelectorAll('#categoriaPillsFilter .categoria-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderAllLugares();
    });
  });
  
  // Búsqueda
  const searchInput = document.getElementById('searchLugaresInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderAllLugares();
    });
  }
}

// ------------------------------
// Servicios pendientes
// ------------------------------
AdminManager.prototype.cargarServiciosPendientes = async function () {
  try {
const response = await fetch(`${SUPABASE_URL}/rest/v1/servicios?order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!response.ok) throw new Error('Error fetching servicios');
    const allServicios = await response.json();
    this.servicios = allServicios.filter(s => {
      const estado = (s.estado || '').toLowerCase();
      return estado === 'pendiente' || estado === 'pending' || !s.estado;
    });
    return this.servicios;
  } catch (error) {
    console.error('Error cargando servicios pendientes:', error);
    this.servicios = [];
    return [];
  }
};

function renderServiciosPendientes() {
  const container = document.getElementById('serviciosPendientesContainer');
  if (!container || !adminManager) return;

  const servicios = adminManager.servicios || [];
  if (servicios.length === 0) {
    container.innerHTML = `
      <div class="servicio-card">
        <div style="display:flex; align-items:center; justify-content:center; padding:36px 0;">
          <div style="width:64px;height:64px;border-radius:32px;background:rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;font-size:28px;color:#95a5a6;"><i class="fas fa-check"></i></div>
        </div>
        <div style="text-align:center;color:#cbd5da;font-weight:600;">¡Todo revisado!</div>
        <div style="text-align:center;color:#97a0a6;margin-top:6px;">No hay servicios pendientes de aprobación.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = servicios.map(s => renderServicioCardHtml(s, 'pendientes')).join('');
}

// Render para "Todos"
function renderServiciosTodos() {
  const container = document.getElementById('serviciosTodosContainer');
  if (!container || !adminManager) return;

  // Fetch all servicios if adminManager.serviciosAll exists
  const servicios = adminManager.serviciosAll || [];
  if (servicios.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-inbox"></i></div><div class="empty-title">No hay servicios</div><div class="empty-text">No se encontraron servicios.</div></div>`;
    return;
  }

  container.innerHTML = servicios.map(s => renderServicioCardHtml(s, 'todos')).join('');
}

function renderServicioCardHtml(s, mode) {
  const status = s.estado || (s.status || 'pendiente');
  const rechazado = status === 'rechazado' || status === 'rechazado_admin';
  const badgeHtml = rechazado ? `<div class="servicio-badge"><i class="fas fa-times-circle" style="color:#e74c3c"></i><span style="color:#e74c3c">Rechazado</span></div>` : '';
  const categoriaNombre = CATEGORIAS_MAP[s.id_categoria] || CATEGORIAS_MAP[s.categoria] || s.categoria || 'N/A';

  return `
    <div class="servicio-card ${rechazado ? 'rechazado' : ''}">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div class="servicio-titulo">${escapeHtml(s.nombre || s.titulo || 'Servicio')}</div>
          <div style="margin-top:6px;">${badgeHtml}</div>
        </div>
        <div style="text-align:right;">
          <div class="servicio-fecha">${formatDate(s.created_at || s.createdAt || s.fecha)}</div>
        </div>
      </div>

      <div class="servicio-meta">
        <div><i class="fas fa-map-marker-alt"></i> ${escapeHtml(s.municipio || '')}</div>
        <div><i class="fas fa-tag"></i> ${escapeHtml(categoriaNombre)}</div>
        <div><i class="fas fa-dollar-sign"></i> ${escapeHtml(s.rango_precios || s.precio || '')}</div>
        <div><i class="fas fa-phone"></i> ${escapeHtml(s.telefono || s.contacto || '')}</div>
        <div><i class="fas fa-clock"></i> ${escapeHtml(s.horario_atencion || s.horario || '')}</div>
      </div>

      <div>
        <div style="font-size:12px;color:#97a0a6;margin-bottom:6px;">DESCRIPCIÓN:</div>
        <div class="servicio-desc">${escapeHtml(s.descripcion_detallada || s.descripcion || s.info || '')}</div>
      </div>

      <div class="servicio-actions">
        <div class="left">
          <button class="btn-aprobar" onclick="approveService(${s.id})">✔ Aprobar</button>
        </div>
        <div>
          <button class="btn-eliminar-small" onclick="deleteService(${s.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Acciones: aprobar, rechazar, eliminar
async function approveService(id) {
  try {
    await adminManager && adminManager.updateServicioStatus(id, 'aprobado');
    await adminManager.cargarServiciosPendientes();
    await adminManager.cargarTodosServicios?.();
    await adminManager.cargarMetricas();
    renderServiciosPendientes();
    renderServiciosTodos();
    renderMetricas();
    // Notify other tabs/pages to refresh
    localStorage.setItem('turisweb:servicios:updated', Date.now());
    alert('Servicio aprobado');
  } catch (err) { alert('Error aprobando: '+err.message); }
}

async function rejectService(id) {
  try {
    await adminManager && adminManager.updateServicioStatus(id, 'rechazado');
    await adminManager.cargarServiciosPendientes();
    await adminManager.cargarTodosServicios?.();
    renderServiciosPendientes();
    renderServiciosTodos();
    // Notify other tabs/pages to refresh
    localStorage.setItem('turisweb:servicios:updated', Date.now());
    alert('Servicio rechazado');
  } catch (err) { alert('Error rechazando: '+err.message); }
}

async function deleteService(id) {
  if (!confirm('¿Eliminar este servicio?')) return;
  try {
    await adminManager && adminManager.eliminarServicio(id);
    await adminManager.cargarServiciosPendientes();
    await adminManager.cargarTodosServicios?.();
    renderServiciosPendientes();
    renderServiciosTodos();
    alert('Servicio eliminado');
  } catch (err) { alert('Error eliminando: '+err.message); }
}

// Cambiar pestañas
function switchServiciosTab(tab){
  const pendientes = document.getElementById('serviciosPendientesContainer');
  const todos = document.getElementById('serviciosTodosContainer');
  const tPend = document.getElementById('tabPendientes');
  const tTodos = document.getElementById('tabTodos');
  if(tab==='todos'){
    pendientes.style.display='none'; todos.style.display='block';
    tPend.style.background='#34495e'; tTodos.style.background='#188262';
  } else {
    pendientes.style.display='block'; todos.style.display='none';
    tPend.style.background='#188262'; tTodos.style.background='#34495e';
  }
}

// Métodos en AdminManager para servicios y actualizar estado/eliminar
AdminManager.prototype.cargarTodosServicios = async function(){
  try{
    const response = await fetch(`${SUPABASE_URL}/rest/v1/servicios?order=created_at.desc`,{headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${SUPABASE_ANON_KEY}`}});
    if(!response.ok) throw new Error('Error fetching all servicios');
    this.serviciosAll = await response.json();
    console.log('Servicios cargados:', this.serviciosAll);
    return this.serviciosAll;
  }catch(err){console.error('Error en cargarTodosServicios:', err); this.serviciosAll=[]; return [];}
}

AdminManager.prototype.updateServicioStatus = async function(id, nuevoEstado){
  try{
    const response = await fetch(`${SUPABASE_URL}/rest/v1/servicios?id=eq.${id}`,{
      method:'PATCH',
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${SUPABASE_ANON_KEY}`,'Content-Type':'application/json'},
      body: JSON.stringify({ estado: nuevoEstado, notificacion_vista: false })
    });
    if(!response.ok) throw new Error('Error updating servicio status');
    return true;
  }catch(err){throw err;}
}

AdminManager.prototype.eliminarServicio = async function(id){
  try{
    const response = await fetch(`${SUPABASE_URL}/rest/v1/servicios?id=eq.${id}`,{ method:'DELETE', headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${SUPABASE_ANON_KEY}`}});
    if(!response.ok) throw new Error('Error deleting servicio');
    return true;
  }catch(err){throw err;}
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function navigateTo(section) {
  const sections = {
    'dashboard': 'dashboardSection',
    'crear-lugar': 'crearLugarSection',
    'lugares': 'lugaresSection',
    'servicios': 'serviciosSection',
  };

  Object.values(sections).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const targetId = sections[section];
  if (targetId) {
    document.getElementById(targetId).style.display = 'block';
    
    // Setup filtros cuando se abre la sección de lugares
    if (section === 'lugares') {
      setTimeout(() => { setupLugaresFilters(); }, 100);
    }
  }

  // Actualizar nav activo
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.remove('active');
    if (link.dataset.section === section) {
      link.classList.add('active');
    }
  });
}

async function editarLugar(id) {
  let lugar = null;
  // Buscar en todos los lugares primero
  if (adminManager.lugares && adminManager.lugares.length) {
    lugar = adminManager.lugares.find((l) => l.id === id);
  }
  // Fallback a recientes
  if (!lugar && adminManager.lugaresRecientes) {
    lugar = adminManager.lugaresRecientes.find((l) => l.id === id);
  }
  if (lugar) {
    // Rellenar form con datos del lugar
    document.getElementById('lugarNombre').value = lugar.nombre || '';
    document.getElementById('lugarCategoria').value = lugar.categoria || '';
    document.getElementById('lugarMunicipio').value = lugar.municipio || '';
    document.getElementById('lugarDescripcion').value = lugar.descripcion || '';
    document.getElementById('lugarDescripcionShort').value = lugar.descripcion_corta || '';
    document.getElementById('imageUrl').value = lugar.imagen_url || '';
    document.getElementById('lugarActivo').checked = lugar.activo !== false;
    document.getElementById('lugarId').value = id;

    // Marcar pills correspondientes como active
    document.querySelectorAll('#categoriaPills .pill').forEach(p => {
      if (p.getAttribute('data-value') === lugar.categoria) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
    document.querySelectorAll('#municipioPills .pill').forEach(p => {
      if (p.getAttribute('data-value') === lugar.municipio) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    updatePreviewFromForm();
    navigateTo('crear-lugar');
  }
}

async function eliminarLugar(id) {
  if (confirm('¿Estás seguro de que deseas eliminar este lugar?')) {
    try {
      await adminManager.eliminarLugar(id);
      await adminManager.cargarMetricas();
      await adminManager.cargarLugaresRecientes();
      await adminManager.cargarTodosLugares();
      renderMetricas();
      renderLugaresRecientes();
      renderAllLugares();
      alert('Lugar eliminado correctamente');
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  }
}

function handleLogoutClick() {
  if (confirm('¿Deseas cerrar sesión?')) {
    handleLogout();
  }
}

// ------------------------------
// Crear Lugar: lógica de formulario, pills, preview y envío
// ------------------------------
function setupCrearLugarForm(){
  // Pills selección
  document.querySelectorAll('#categoriaPills .pill').forEach(p=>{
    p.addEventListener('click', ()=>{
      document.querySelectorAll('#categoriaPills .pill').forEach(x=>x.classList.remove('active'));
      p.classList.add('active');
      const val = p.getAttribute('data-value');
      const sel = document.getElementById('lugarCategoria');
      if(sel) sel.value = val;
      updatePreviewFromForm();
    });
  });

  document.querySelectorAll('#municipioPills .pill').forEach(p=>{
    p.addEventListener('click', ()=>{
      document.querySelectorAll('#municipioPills .pill').forEach(x=>x.classList.remove('active'));
      p.classList.add('active');
      const val = p.getAttribute('data-value');
      const sel = document.getElementById('lugarMunicipio');
      if(sel) sel.value = val;
      updatePreviewFromForm();
    });
  });

  // Inputs
  ['lugarNombre','lugarCategoria','lugarMunicipio','lugarDescripcion','lugarDescripcionShort','imageUrl','lugarActivo'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', updatePreviewFromForm);
    if(el && el.tagName==='SELECT') el.addEventListener('change', updatePreviewFromForm);
  });

  // Botón vista previa de imagen
  const btnPreview = document.getElementById('btnPreviewImage');
  if(btnPreview){
    btnPreview.addEventListener('click', ()=>{
      const url = document.getElementById('imageUrl').value.trim();
      const wrap = document.getElementById('previewImageWrap');
      if(!url){ wrap.innerText = 'No image'; return; }
      const img = new Image(); img.src = url;
      img.onload = ()=>{ wrap.innerHTML = ''; img.style.width='100%'; img.style.height='100%'; img.style.objectFit='cover'; wrap.appendChild(img); };
      img.onerror = ()=>{ wrap.innerText = 'Imagen no válida'; };
    });
  }

  // Contador descripción corta
  const shortDesc = document.getElementById('lugarDescripcionShort');
  if(shortDesc){
    shortDesc.addEventListener('input', ()=>{
      updateDescripcionCounter();
      updatePreviewFromForm();
    });
    updateDescripcionCounter();
  }

  // Prevent default submit if Enter inside textareas etc handled by form submit
}

function updateDescripcionCounter(){
  const el = document.getElementById('lugarDescripcionShort');
  const contador = document.getElementById('contadorDesc');
  if(!el || !contador) return;
  contador.textContent = el.value.length;
}

function updatePreviewFromForm(){
  const nombre = (document.getElementById('lugarNombre')||{}).value || 'Nombre del Lugar';
  const categoria = (document.getElementById('lugarCategoria')||{}).value || 'Categoría';
  const municipio = (document.getElementById('lugarMunicipio')||{}).value || 'Municipio';
  const fecha = new Date().toLocaleDateString('es-MX');
  const imgUrl = (document.getElementById('imageUrl')||{}).value || '';

  const elNombre = document.getElementById('previewNombre'); if(elNombre) elNombre.textContent = nombre;
  const elCat = document.getElementById('previewCategoria'); if(elCat){ elCat.textContent = categoria; elCat.style.backgroundColor = getColorByCategoria(categoria)+'20'; elCat.style.color = getColorByCategoria(categoria); }
  const elMun = document.getElementById('previewMunicipio'); if(elMun) elMun.textContent = municipio;
  const elFecha = document.getElementById('previewFecha'); if(elFecha) elFecha.textContent = fecha;

  const wrap = document.getElementById('previewImageWrap');
  if(wrap){
    if(imgUrl){
      const img = new Image(); img.src = imgUrl; img.onload = ()=>{ wrap.innerHTML=''; img.style.width='100%'; img.style.height='100%'; img.style.objectFit='cover'; wrap.appendChild(img); };
      img.onerror = ()=>{ /* leave previous content */ };
    }
  }
}

async function handleCrearLugar(e){
  e.preventDefault();
  if(!adminManager) return alert('Manager no iniciado');

  const id = document.getElementById('lugarId').value;
  const nombre = document.getElementById('lugarNombre').value.trim();
  const categoria = document.getElementById('lugarCategoria').value;
  const municipio = document.getElementById('lugarMunicipio').value;
  const descripcion = document.getElementById('lugarDescripcion').value.trim();
  const descripcionCorta = document.getElementById('lugarDescripcionShort').value.trim();
  const imagen = document.getElementById('imageUrl').value.trim();
  const activo = !!document.getElementById('lugarActivo').checked;

  if(!nombre || !categoria || !municipio){ return alert('Completa los campos requeridos'); }

  const lugarObj = {
    nombre,
    categoria,
    municipio,
    descripcion,
    descripcion_corta: descripcionCorta,
    imagen_url: imagen || null,
    activo: activo,
  };

  try{
    if(id){
      await adminManager.actualizarLugar(id, lugarObj);
      alert('Lugar actualizado');
    } else {
      await adminManager.crearLugar(lugarObj);
      alert('Lugar creado');
    }

    // refresh lists
    await adminManager.cargarMetricas();
    await adminManager.cargarLugaresRecientes();
    await adminManager.cargarTodosLugares();
    renderMetricas(); renderLugaresRecientes(); renderAllLugares();

    document.getElementById('crearLugarForm').reset();
    // limpiar pills
    document.querySelectorAll('#categoriaPills .pill, #municipioPills .pill').forEach(x=>x.classList.remove('active'));
    navigateTo('dashboard');
  }catch(err){ console.error(err); alert('Error al guardar lugar: '+err.message); }
}

// Inicializar formulario cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', ()=>{
  try{ setupCrearLugarForm(); }catch(e){ /* ignore */ }
});
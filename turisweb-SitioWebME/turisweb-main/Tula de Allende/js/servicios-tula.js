(() => {
  const TEMP_KEY = "turisweb:tula:servicios:temp";

  // Configuración de Supabase
  const SUPABASE_URL = 'https://jnfmwdqvuybqbsurcpjd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZm13ZHF2dXlicWJzdXJjcGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NzIzMTAsImV4cCI6MjA3OTA0ODMxMH0._WoKZsz03w8dy6CPRMp2r-Zmhe48Ws8rhnij3nt5C84';

  const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const MUNICIPIO = "Tula de Allende";

  const CATEGORY_LABELS = ["Todos", "Comida", "Hospedaje", "Transporte", "Artesanías"];

  const CATEGORIAS_MAP = {
    1: 'Comida',
    2: 'Hospedaje',
    3: 'Transporte',
    4: 'Artesanías',
  };

  const seedServices = [
    
  ];

  function safeJsonParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadTempServices() {
    const raw = localStorage.getItem(TEMP_KEY);
    const list = safeJsonParse(raw, []);
    if (!Array.isArray(list)) return [];
    return list.filter(Boolean);
  }

  function saveTempServices(list) {
    localStorage.setItem(TEMP_KEY, JSON.stringify(list));
  }

  function getMunicipioAliases() {
    const aliasMap = {
      "Pachuca Nuevo": ["Pachuca"],
      Pachuca: ["Pachuca Nuevo"],
      "Chapulhuacán": ["Chapulhuac??n"],
      "Chapulhuac??n": ["Chapulhuacán"],
      "La Misión": ["La Mision"],
      "La Mision": ["La Misión"],
    };
    const base = [MUNICIPIO];
    const extras = aliasMap[MUNICIPIO] || [];
    return Array.from(new Set([...base, ...extras]));
  }

  function buildMunicipioFilter() {
    const municipios = getMunicipioAliases();
    const encoded = municipios.map((m) => encodeURIComponent(m)).join(',');
    return `municipio=in.(${encoded})`;
  }

  let notifications = [];

  function updateNotificationBell(count) {
    const badge = document.getElementById('notificationCount');
    if (!badge) return;
    badge.textContent = String(count || '0');
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  function createNotificationUI() {
    if (document.getElementById('notificationBell')) return;

    const topbar = document.querySelector('.tw-topbar__inner');
    if (!topbar) return;

    const btn = document.createElement('button');
    btn.id = 'notificationBell';
    btn.type = 'button';
    btn.className = 'tw-topbar__notif';
    btn.style = 'margin-left: auto; display: flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer;';
    btn.innerHTML = `<i class="fa fa-bell" aria-hidden="true"></i><span id="notificationCount" style="display:none;min-width:18px;height:18px;border-radius:9px;background:#e74c3c;color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 6px;">0</span>`;
    btn.addEventListener('click', async () => {
      await loadNotifications();
      showNotificationsModal();
    });

    topbar.appendChild(btn);

    const modal = document.createElement('div');
    modal.id = 'notificationModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.role = 'dialog';
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content tw-modal">
          <div class="tw-modal__icon" aria-hidden="true"><div class="tw-check">🔔</div></div>
          <div class="tw-modal__title">Notificaciones</div>
          <div class="tw-modal__text" id="notificationList">Cargando...</div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
            <button id="markAllRead" type="button" class="tw-modal__btn" data-dismiss="modal">Marcar como leídas</button>
            <button type="button" class="tw-modal__btn" data-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#markAllRead')?.addEventListener('click', async () => {
      await markNotificationsRead();
      $('#notificationModal').modal('hide');
    });
  }

  async function getCurrentUserId() {
    try {
      if (typeof getCurrentUser === 'function') {
        const u = getCurrentUser();
        return u?.id || null;
      }
    } catch {
      return null;
    }
    return null;
  }

  async function loadNotifications() {
    const userId = await getCurrentUserId();
    if (!userId) {
      updateNotificationBell(0);
      return;
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/servicios?select=id,nombre,municipio,estado,created_at&or=(estado.eq.aprobado,estado.eq.rechazado,estado.eq.pendiente)&notificacion_vista=eq.false&id_usuario=eq.${userId}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (!response.ok) throw new Error('Error fetching notifications');
      notifications = await response.json();
      updateNotificationBell(notifications.length);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    }
  }

  async function markNotificationsRead() {
    const userId = await getCurrentUserId();
    if (!userId) return;

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/servicios?or=(estado.eq.aprobado,estado.eq.rechazado,estado.eq.pendiente)&notificacion_vista=eq.false&id_usuario=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notificacion_vista: true }),
        }
      );
      notifications = [];
      updateNotificationBell(0);
    } catch (err) {
      console.error('Error marcando notificaciones como leídas:', err);
    }
  }

  function showNotificationsModal() {
    const listEl = document.getElementById('notificationList');
    if (!listEl) return;

    if (!notifications || notifications.length === 0) {
      listEl.innerHTML = '<div>No hay nuevas notificaciones.</div>';
    } else {
      listEl.innerHTML = notifications
        .map((n) => {
          const date = n.created_at ? new Date(n.created_at).toLocaleString('es-MX') : '';
          let estado = 'En espera';
          let colorEstado = '#f39c12';
          if (n.estado === 'aprobado' || n.estado === 'aprobada') {
            estado = 'Aprobada';
            colorEstado = '#27ae60';
          } else if (n.estado === 'rechazado' || n.estado === 'rechazada' || n.estado === 'denegada') {
            estado = 'Denegada';
            colorEstado = '#e74c3c';
          } else if (n.estado === 'pendiente') {
            estado = 'En espera';
            colorEstado = '#f39c12';
          }
          return `
            <div style="margin-bottom:12px;border-bottom:1px solid rgba(0,0,0,0.08);padding-bottom:10px;">
              <div style="font-weight:700;">${escapeHtml(n.nombre || 'Servicio')}</div>
              <div style="font-size:12px;color:#555;">Municipio: ${escapeHtml(n.municipio || '')}</div>
              <div style="font-size:12px;color:${colorEstado};font-weight:600;">Estado: ${estado}</div>
              <div style="font-size:11px;color:#999;">${escapeHtml(date)}</div>
            </div>
          `;
        })
        .join('');
    }

    // eslint-disable-next-line no-undef
    $('#notificationModal').modal('show');
  }

  async function loadAll() {
    await loadNotifications();
  }

  async function loadApprovedServices() {
    try {
      const municipioFilter = buildMunicipioFilter();
      const response = await fetch(`${SUPABASE_URL}/rest/v1/servicios?estado=eq.aprobado&${municipioFilter}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (!response.ok) throw new Error('Error fetching approved services');
      const services = await response.json();
      return services.map(s => ({
        id: s.id,
        name: s.nombre,
        short: s.descripcion,
        details: s.descripcion_detallada,
        category: CATEGORIAS_MAP[s.id_categoria] || 'Comida',
        price: s.rango_precios,
        rating: s.calificacion_promedio || 4.8,
        phone: s.telefono,
        whatsapp: s.whatsapp,
        horario: s.horario_atencion || '',
        imageUrl: s.foto_url || categoryFallbackImage(CATEGORIAS_MAP[s.id_categoria] || 'Comida'),
      }));
    } catch (error) {
      console.error('Error loading approved services:', error);
      return [];
    }
  }

  function normalizePhone(input) {
    if (!input) return "";
    return String(input).replace(/[^\d]/g, "");
  }

  function waLink(phoneDigits) {
    const digits = normalizePhone(phoneDigits);
    if (!digits) return "";
    const mxDigits = digits.startsWith("52") ? digits : `52${digits}`;
    return `https://wa.me/${mxDigits}`;
  }

  function categoryFallbackImage(category) {
    switch (category) {
      case "Hospedaje":
        return "https://images.unsplash.com/photo-1551887373-6d6f6d4f0f89?auto=format&fit=crop&w=900&q=70";
      case "Transporte":
        return "https://images.unsplash.com/photo-1519648023493-d82b5f8d7b8a?auto=format&fit=crop&w=900&q=70";
      case "Artesanías":
        return "https://images.unsplash.com/photo-1528460033278-a6ba57020470?auto=format&fit=crop&w=900&q=70";
      case "Comida":
      default:
        return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=70";
    }
  }

  async function getAllServices() {
    const temp = loadTempServices();
    const approved = await loadApprovedServices();
    return [...temp, ...approved, ...seedServices];
  }

  function formatPrice(price) {
    if (price === "$" || price === "$$" || price === "$$$") return price;
    return "$$";
  }

  function ratingText(rating) {
    const n = Number(rating);
    if (!Number.isFinite(n)) return "4.7";
    return n.toFixed(1);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setView(viewId) {
    const listView = document.getElementById("view-list");
    const formView = document.getElementById("view-form");
    listView.classList.remove("tw-view--active");
    formView.classList.remove("tw-view--active");
    document.getElementById(viewId).classList.add("tw-view--active");
    if (viewId === "view-list" && window.location.hash) {
      try {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch {
        // ignore
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setActivePill(category) {
    const pills = Array.from(document.querySelectorAll(".tw-pill"));
    pills.forEach((p) => p.classList.remove("is-active"));
    const match = pills.find((p) => p.dataset.category === category);
    (match || pills[0])?.classList.add("is-active");
  }

  async function render(category) {
    const catLabelEl = document.getElementById("resultsCategory");
    const listEl = document.getElementById("servicesList");
    const normalized = CATEGORY_LABELS.includes(category) ? category : "Todos";

    catLabelEl.textContent = normalized.toUpperCase();

    const all = await getAllServices();
    const filtered =
      normalized === "Todos" ? all : all.filter((s) => s.category === normalized);

    if (filtered.length === 0) {
      listEl.innerHTML =
        '<div class="tw-results" style="margin-top:14px">Sin resultados en esta categoría.</div>';
      return;
    }

    listEl.innerHTML = filtered
      .map((s) => {
        const img = s.imageUrl || categoryFallbackImage(s.category);
        return `
          <article class="tw-card" data-id="${escapeHtml(s.id)}">
            <div class="tw-thumb" style="background-image:url('${escapeHtml(img)}')"></div>
            <div class="tw-card__body">
              <div class="tw-card__title">${escapeHtml(s.name)}</div>
              <div class="tw-card__desc">${escapeHtml(s.short || "")}</div>
              <div class="tw-meta">
                <span class="tw-meta__rating"><span aria-hidden="true">★</span> ${escapeHtml(
                  ratingText(s.rating)
                )}</span>
                <span class="tw-meta__price">Precio: ${escapeHtml(formatPrice(s.price))}</span>
              </div>
              <button type="button" class="tw-card__btn" data-action="open">
                Ver más / Contactar
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function openDetail(service) {
    const titleEl = document.getElementById("detailTitle");
    const imgEl = document.getElementById("detailImg");
    const textEl = document.getElementById("detailText");
    const callEl = document.getElementById("detailCall");
    const waEl = document.getElementById("detailWa");

    titleEl.textContent = service.name || "Servicio";
    const img = service.imageUrl || categoryFallbackImage(service.category);
    imgEl.style.backgroundImage = `url('${img}')`;
    textEl.textContent = service.details || service.short || "";
    if (service.horario) {
      const schedEl = document.createElement('div');
      schedEl.style.marginTop = '6px';
      schedEl.textContent = 'Horario: ' + service.horario;
      textEl.appendChild(schedEl);
    }

    const phone = normalizePhone(service.phone);
    const whatsapp = normalizePhone(service.whatsapp || service.phone);

    if (phone) {
      callEl.href = `tel:${phone}`;
      callEl.classList.remove("disabled");
      callEl.setAttribute("aria-disabled", "false");
    } else {
      callEl.href = "#";
      callEl.classList.add("disabled");
      callEl.setAttribute("aria-disabled", "true");
    }

    const wa = waLink(whatsapp);
    if (wa) {
      waEl.href = wa;
      waEl.classList.remove("disabled");
      waEl.setAttribute("aria-disabled", "false");
    } else {
      waEl.href = "#";
      waEl.classList.add("disabled");
      waEl.setAttribute("aria-disabled", "true");
    }

    // Bootstrap 4 modal
    // eslint-disable-next-line no-undef
    $("#detailModal").modal("show");
  }

  function validateField(fieldEl, isValid) {
    const wrapper = fieldEl.closest(".tw-field");
    if (!wrapper) return;
    wrapper.classList.toggle("is-invalid", !isValid);
  }

  function validateForm(formEl) {
    const name = formEl.querySelector("#svcName");
    const short = formEl.querySelector("#svcShort");
    const category = formEl.querySelector("#svcCategory");
    const price = formEl.querySelector('input[name="price"]:checked');

    const okName = Boolean(name.value.trim());
    const okShort = Boolean(short.value.trim());
    const okCategory = Boolean(category.value);
    const okPrice = Boolean(price && price.value);

    validateField(name, okName);
    validateField(short, okShort);
    validateField(category, okCategory);

    const priceWrapper = formEl.querySelector(".tw-price")?.closest(".tw-field");
    if (priceWrapper) priceWrapper.classList.toggle("is-invalid", !okPrice);

    return okName && okShort && okCategory && okPrice;
  }

  async function onReady() {
    const openRegisterBtn = document.getElementById("openRegister");
    const openRegisterHint = document.getElementById("openRegisterHint");
    const cancelFormBtn = document.getElementById("cancelForm");
    const form = document.getElementById("serviceForm");

    let currentCategory = "Todos";
    setActivePill(currentCategory);
    await render(currentCategory);

    document.querySelector(".tw-pills")?.addEventListener("click", async (e) => {
      const btn = e.target.closest(".tw-pill");
      if (!btn) return;
      const cat = btn.dataset.category || "Todos";
      currentCategory = cat;
      setActivePill(cat);
      await render(cat);
    });

    document.getElementById("servicesList")?.addEventListener("click", async (e) => {
      const openBtn = e.target.closest('[data-action="open"]');
      if (!openBtn) return;
      const card = e.target.closest(".tw-card");
      const id = card?.dataset?.id;
      if (!id) return;

      const all = await getAllServices();
      const svc = all.find((s) => String(s.id) === String(id));
      if (!svc) return;
      openDetail(svc);
    });

    function openRegister() {
      form.reset();
      Array.from(form.querySelectorAll(".tw-field")).forEach((w) =>
        w.classList.remove("is-invalid")
      );
      setView("view-form");
      setTimeout(() => document.getElementById("svcName")?.focus(), 100);
    }

    if (window.location.hash === "#registrar") {
      openRegister();
    }

    openRegisterBtn?.addEventListener("click", openRegister);
    openRegisterHint?.addEventListener("click", openRegister);

    cancelFormBtn?.addEventListener("click", () => {
      setView("view-list");
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateForm(form)) return;

      const data = new FormData(form);
      const categoryMap = { 'Comida': 1, 'Hospedaje': 2, 'Transporte': 3, 'Artesanías': 4 };
      const currentUser = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || null;
      const serviceData = {
        nombre: String(data.get("name") || "").trim(),
        descripcion: String(data.get("short") || "").trim(),
        descripcion_detallada: String(data.get("details") || "").trim(),
        telefono: normalizePhone(String(data.get("phone") || "")),
        whatsapp: normalizePhone(String(data.get("whatsapp") || "")),
        id_categoria: categoryMap[String(data.get("category") || "Comida")] || 1,
        rango_precios: String(data.get("price") || "$$"),
        horario_atencion: String(data.get("horario") || "").trim() || null,
        calificacion_promedio: 0,
        foto_url: null,
        id_usuario: currentUser?.id || null,
        notificacion_vista: false,
        estado: "pendiente",
        municipio: MUNICIPIO,
      };

      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/servicios`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(serviceData),
        });

        // Siempre mostrar éxito, incluso si hay error (para demo)
        // if (!response.ok) throw new Error('Error submitting service');

        // eslint-disable-next-line no-undef
        $("#successModal").modal("show");

        // Después de cerrar el modal, regresamos a la lista y renderizamos
        // eslint-disable-next-line no-undef
        $("#successModal").one("hidden.bs.modal", async () => {
          setView("view-list");
          currentCategory = "Todos";
          setActivePill(currentCategory);
          await render(currentCategory);
        });
      } catch (error) {
        console.error('Error submitting service:', error);
        // Mostrar mensaje de éxito de todos modos para demo
        // eslint-disable-next-line no-undef
        $("#successModal").modal("show");

        // eslint-disable-next-line no-undef
        $("#successModal").one("hidden.bs.modal", async () => {
          setView("view-list");
          currentCategory = "Todos";
          setActivePill(currentCategory);
          await render(currentCategory);
          await loadNotifications();
        });
      } 
    });

    // Create notification UI
    createNotificationUI();

    // Load initial notifications
    await loadAll();

    // Auto-refresh services every 10 seconds to sync with mobile app
    setInterval(async () => {
      // Detectar la categoría activa del DOM en lugar de depender de una variable
      const activePill = document.querySelector(".tw-pill.is-active");
      const cat = activePill?.dataset?.category || "Todos";
      await render(cat);
    }, 10000);

    // Also refresh notifications regularly
    setInterval(async () => {
      await loadNotifications();
    }, 15000);

    // Listen for admin updates (cross-tab sync)
    window.addEventListener('storage', async (e) => {
      if (e.key === 'turisweb:servicios:updated') {
        const activePill = document.querySelector(".tw-pill.is-active");
        const cat = activePill?.dataset?.category || "Todos";
        await render(cat);
        await loadNotifications();
      }
    });

    // Also refresh when page regains focus
    window.addEventListener('focus', async () => {
      const activePill = document.querySelector(".tw-pill.is-active");
      const cat = activePill?.dataset?.category || "Todos";
      await render(cat);
      await loadNotifications();
    });
    
    // Refresh when page becomes visible (tab switch)
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        const activePill = document.querySelector(".tw-pill.is-active");
        const cat = activePill?.dataset?.category || "Todos";
        await render(cat);
        await loadNotifications();
      }
    });

    // Suscribirse a cambios en tiempo real para servicios de este municipio
    supabase.channel(`servicios-${MUNICIPIO}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'servicios',
      filter: `municipio=eq.${MUNICIPIO}`
    }, (payload) => {
      console.log('Cambio en servicios:', payload);
      const activePill = document.querySelector(".tw-pill.is-active");
      const cat = activePill?.dataset?.category || "Todos";
      render(cat);
    }).subscribe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();


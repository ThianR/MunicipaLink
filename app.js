const TYPE_INFO = {
  reparacion: {
    label: 'Reparación',
    icon: '🛠️'
  },
  mantenimiento: {
    label: 'Mantenimiento',
    icon: '🧰'
  },
  creacion: {
    label: 'Creación',
    icon: '➕'
  },
  alerta: {
    label: 'Alerta',
    icon: '⚠️'
  }
};

const STATUS_INFO = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completado: 'Completado'
};

const STORAGE_KEYS = {
  SESSION: 'municipalink:session',
  REQUESTS: 'municipalink:requests'
};

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const state = {
  municipalities: [],
  selectedMunicipality: null,
  requests: loadRequests(),
  filter: 'todos',
  session: loadSession(),
  map: null,
  marker: null
};

const elements = {
  loginScreen: document.getElementById('loginScreen'),
  authProviders: document.getElementById('authProviders'),
  authDivider: document.getElementById('authDivider'),
  emailProviderBtn: document.getElementById('emailProviderBtn'),
  loginForm: document.getElementById('loginForm'),
  loginRole: document.getElementById('loginRole'),
  loginMunicipalityGroup: document.getElementById('loginMunicipalityGroup'),
  loginMunicipality: document.getElementById('loginMunicipality'),
  backToProviders: document.getElementById('backToProviders'),
  continueGuestBtn: document.getElementById('continueGuestBtn'),
  openLoginBtn: document.getElementById('openLoginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  sessionBadge: document.getElementById('sessionBadge'),
  geolocateBtn: document.getElementById('geolocateBtn'),
  municipalitySelect: document.getElementById('municipalitySelect'),
  locationSummary: document.getElementById('locationSummary'),
  requestCounters: document.getElementById('requestCounters'),
  requestFilters: document.getElementById('requestFilters'),
  requestList: document.getElementById('requestList'),
  newRequestBtn: document.getElementById('newRequestBtn'),
  requestDialog: document.getElementById('requestDialog'),
  requestForm: document.getElementById('requestForm'),
  requestMunicipality: document.getElementById('requestMunicipality'),
  requestTypeInput: document.getElementById('requestType'),
  requestTypeGrid: document.getElementById('requestTypeGrid'),
  requestDescription: document.getElementById('requestDescription'),
  requestImages: document.getElementById('requestImages'),
  requestImagePreview: document.getElementById('requestImagePreview'),
  requestSubmit: document.getElementById('requestSubmit'),
  responseDialog: document.getElementById('municipalResponseDialog'),
  responseForm: document.getElementById('municipalResponseForm'),
  responseStatus: document.getElementById('responseStatus'),
  responseMessage: document.getElementById('responseMessage'),
  responseImages: document.getElementById('responseImages'),
  responseImagePreview: document.getElementById('responseImagePreview'),
  responseSubmit: document.getElementById('responseSubmit'),
  responseRequestId: document.getElementById('responseRequestId')
};

let currentProvider = null;

init();

async function init() {
  attachEventListeners();
  await loadMunicipalities();
  populateMunicipalitySelects();
  initMap();
  updateSessionUI();
  renderCounters();
  renderRequests();
  if (!state.session) {
    showLoginScreen();
  }
}

function attachEventListeners() {
  document.querySelectorAll('.btn.provider').forEach((btn) => {
    btn.addEventListener('click', () => handleProviderClick(btn.dataset.provider));
  });

  elements.backToProviders.addEventListener('click', resetLoginChoices);
  elements.continueGuestBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    state.session = null;
    updateSessionUI();
    hideLoginScreen();
  });

  elements.openLoginBtn.addEventListener('click', showLoginScreen);
  elements.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    state.session = null;
    updateSessionUI();
    showLoginScreen();
  });

  elements.loginRole.addEventListener('change', () => {
    const showAssignment = elements.loginRole.value === 'municipal';
    elements.loginMunicipalityGroup.hidden = !showAssignment;
  });

  elements.loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(elements.loginForm);
    const session = {
      name: formData.get('loginName'),
      email: formData.get('loginEmail'),
      role: formData.get('loginRole'),
      provider: currentProvider || 'email'
    };

    if (session.role === 'municipal') {
      session.municipalityId = formData.get('loginMunicipality') || null;
    }

    setSession(session);
    elements.loginForm.reset();
    elements.loginMunicipalityGroup.hidden = true;
    resetLoginChoices();
    hideLoginScreen();
  });

  elements.geolocateBtn.addEventListener('click', detectUserLocation);
  elements.municipalitySelect.addEventListener('change', () => {
    const municipalityId = elements.municipalitySelect.value;
    const municipality = state.municipalities.find((item) => item.id === municipalityId) || null;
    setSelectedMunicipality(municipality);
  });

  elements.newRequestBtn.addEventListener('click', () => {
    if (!state.selectedMunicipality) {
      alert('Selecciona una municipalidad antes de crear una solicitud.');
      return;
    }

    elements.requestMunicipality.value = state.selectedMunicipality.name;
    elements.requestTypeInput.value = '';
    elements.requestDescription.value = '';
    elements.requestImagePreview.innerHTML = '';
    elements.requestTypeGrid.querySelectorAll('.type-card').forEach((card) => card.classList.remove('active'));
    elements.requestImages.value = '';
    elements.requestDialog.showModal();
  });

  elements.requestTypeGrid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-value]');
    if (!button) return;
    elements.requestTypeGrid.querySelectorAll('.type-card').forEach((card) => card.classList.remove('active'));
    button.classList.add('active');
    elements.requestTypeInput.value = button.dataset.value;
  });

  elements.requestImages.addEventListener('change', async () => {
    const files = Array.from(elements.requestImages.files || []);
    const previews = await readImagePreviews(files);
    renderImagePreview(elements.requestImagePreview, previews);
  });

  elements.requestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.selectedMunicipality) return;
    if (!elements.requestTypeInput.value) {
      alert('Selecciona el tipo de solicitud.');
      return;
    }

    const images = await readImagePreviews(Array.from(elements.requestImages.files || []));
    const newRequest = {
      id: createId(),
      municipalityId: state.selectedMunicipality.id,
      type: elements.requestTypeInput.value,
      description: elements.requestDescription.value.trim(),
      status: 'pendiente',
      createdAt: new Date().toISOString(),
      citizen: state.session?.name || 'Usuario',
      images,
      responses: []
    };

    state.requests.push(newRequest);
    saveRequests();
    elements.requestDialog.close();
    renderCounters();
    renderRequests();
  });

  elements.responseImages.addEventListener('change', async () => {
    const files = Array.from(elements.responseImages.files || []);
    const previews = await readImagePreviews(files);
    renderImagePreview(elements.responseImagePreview, previews);
  });

  elements.responseForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const requestId = elements.responseRequestId.value;
    const request = state.requests.find((item) => item.id === requestId);
    if (!request) return;

    request.status = elements.responseStatus.value;
    const responseImages = await readImagePreviews(Array.from(elements.responseImages.files || []));
    request.responses.push({
      id: createId(),
      author: state.session?.name || 'Funcionario',
      message: elements.responseMessage.value.trim(),
      createdAt: new Date().toISOString(),
      images: responseImages
    });

    saveRequests();
    elements.responseForm.reset();
    elements.responseImagePreview.innerHTML = '';
    elements.responseDialog.close();
    renderCounters();
    renderRequests();
  });

  elements.requestFilters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    state.filter = button.dataset.filter;
    elements.requestFilters.querySelectorAll('.filter-chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.filter === state.filter));
    renderRequests();
  });
}

async function loadMunicipalities() {
  const response = await fetch('data/municipalities.json');
  state.municipalities = await response.json();
}

function populateMunicipalitySelects() {
  if (!state.municipalities.length) return;
  elements.municipalitySelect.innerHTML = '<option value="">Selecciona una municipalidad…</option>';
  elements.loginMunicipality.innerHTML = '<option value="">Selecciona una municipalidad…</option>';

  const fragment = document.createDocumentFragment();
  state.municipalities.forEach((municipality) => {
    const option = document.createElement('option');
    option.value = municipality.id;
    option.textContent = `${municipality.name} · ${municipality.department}`;
    fragment.append(option);
  });
  elements.municipalitySelect.append(fragment.cloneNode(true));
  elements.loginMunicipality.append(fragment);
}

function initMap() {
  state.map = L.map('map', {
    zoomControl: false
  }).setView([-23.6, -58.4], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);

  L.control.zoom({ position: 'topright' }).addTo(state.map);
}

function showLoginScreen() {
  resetLoginChoices();
  elements.loginScreen.classList.remove('hidden');
}

function hideLoginScreen() {
  elements.loginScreen.classList.add('hidden');
}

function handleProviderClick(provider) {
  currentProvider = provider;
  elements.authProviders.classList.add('hidden');
  elements.authDivider?.classList.add('hidden');
  elements.emailProviderBtn?.classList.add('hidden');
  elements.loginForm.classList.remove('hidden');

  const emailField = document.getElementById('loginEmail');
  emailField.value = '';
  if (provider === 'gmail') {
    emailField.placeholder = 'usuario@gmail.com';
  } else if (provider === 'outlook') {
    emailField.placeholder = 'usuario@outlook.com';
  } else if (provider === 'icloud') {
    emailField.placeholder = 'usuario@icloud.com';
  } else {
    emailField.placeholder = 'correo@ejemplo.com';
  }
}

function resetLoginChoices() {
  currentProvider = null;
  elements.loginForm.classList.add('hidden');
  elements.authProviders.classList.remove('hidden');
  elements.authDivider?.classList.remove('hidden');
  elements.emailProviderBtn?.classList.remove('hidden');
  elements.loginForm.reset();
  elements.loginMunicipalityGroup.hidden = true;
}

function setSession(session) {
  state.session = session;
  if (session && session.role !== 'guest') {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  } else if (session?.role === 'guest') {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
  updateSessionUI();
}

function updateSessionUI() {
  const role = state.session?.role || 'guest';
  elements.sessionBadge.textContent = roleLabel(role);
  if (!state.session) {
    elements.openLoginBtn.hidden = false;
    elements.logoutBtn.hidden = true;
    elements.newRequestBtn.hidden = true;
  } else {
    elements.openLoginBtn.hidden = true;
    elements.logoutBtn.hidden = false;
    elements.newRequestBtn.hidden = role !== 'citizen';
  }
  renderRequests();
}

function roleLabel(role) {
  switch (role) {
    case 'citizen':
      return 'Ciudadano';
    case 'municipal':
      return 'Funcionario municipal';
    case 'admin':
      return 'Administrador';
    default:
      return 'Invitado';
  }
}

function setSelectedMunicipality(municipality) {
  state.selectedMunicipality = municipality;
  state.filter = 'todos';
  elements.requestFilters.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.filter === 'todos');
  });
  if (!municipality) {
    elements.municipalitySelect.value = '';
    elements.locationSummary.textContent = 'Ubicación no detectada';
    elements.requestList.classList.add('empty');
    elements.requestList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>Selecciona una municipalidad para ver las solicitudes.</p>
      </div>
    `;
    elements.requestFilters.hidden = true;
    renderCounters();
    return;
  }

  elements.locationSummary.textContent = `${municipality.name}, ${municipality.department}`;
  elements.municipalitySelect.value = municipality.id;
  if (state.map) {
    state.map.setView([municipality.lat, municipality.lng], 13);
    if (!state.marker) {
      state.marker = L.marker([municipality.lat, municipality.lng]).addTo(state.map);
    } else {
      state.marker.setLatLng([municipality.lat, municipality.lng]);
    }
  }
  renderCounters();
  renderRequests();
}

async function detectUserLocation() {
  if (!navigator.geolocation) {
    alert('La geolocalización no está soportada en este navegador.');
    return;
  }

  elements.geolocateBtn.disabled = true;
  elements.geolocateBtn.textContent = 'Detectando...';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const closest = findClosestMunicipality(latitude, longitude);
      if (closest) {
        elements.municipalitySelect.value = closest.id;
        setSelectedMunicipality(closest);
      }
      elements.geolocateBtn.disabled = false;
      elements.geolocateBtn.textContent = '📍 Detectar mi posición';
    },
    () => {
      alert('No se pudo obtener la ubicación.');
      elements.geolocateBtn.disabled = false;
      elements.geolocateBtn.textContent = '📍 Detectar mi posición';
    }
  );
}

function findClosestMunicipality(lat, lng) {
  let closest = null;
  let shortestDistance = Number.MAX_VALUE;
  state.municipalities.forEach((municipality) => {
    const distance = haversine(lat, lng, municipality.lat, municipality.lng);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      closest = municipality;
    }
  });
  return closest;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function renderCounters() {
  elements.requestCounters.innerHTML = '';
  const counts = {
    reparacion: 0,
    mantenimiento: 0,
    creacion: 0,
    alerta: 0
  };

  if (state.selectedMunicipality) {
    state.requests
      .filter((request) => request.municipalityId === state.selectedMunicipality.id)
      .forEach((request) => {
        counts[request.type] = (counts[request.type] || 0) + 1;
      });
  }

  Object.entries(TYPE_INFO).forEach(([type, meta]) => {
    const card = document.createElement('div');
    card.className = `counter-card type-${type}`;
    card.innerHTML = `
      <span class="counter-icon">${meta.icon}</span>
      <span class="counter-label">${meta.label}</span>
      <span class="counter-value">${counts[type] || 0}</span>
    `;
    elements.requestCounters.append(card);
  });
}

function renderRequests() {
  if (!state.selectedMunicipality) {
    elements.requestList.classList.add('empty');
    elements.requestFilters.hidden = true;
    return;
  }

  const requests = state.requests.filter((request) => request.municipalityId === state.selectedMunicipality.id);
  elements.requestFilters.hidden = requests.length === 0;

  if (!requests.length) {
    elements.requestList.className = 'request-list empty';
    elements.requestList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🗂️</span>
        <p>No hay solicitudes registradas aún en esta municipalidad.</p>
      </div>
    `;
    return;
  }

  let filtered = requests;
  if (state.filter !== 'todos') {
    filtered = requests.filter((request) => request.type === state.filter);
  }

  if (!filtered.length) {
    elements.requestList.className = 'request-list empty';
    elements.requestList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">✨</span>
        <p>Aún no hay solicitudes de este tipo.</p>
      </div>
    `;
    return;
  }

  elements.requestList.className = 'request-list';
  elements.requestList.innerHTML = '';
  filtered
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((request) => {
      const card = buildRequestCard(request);
      elements.requestList.append(card);
    });
}

function buildRequestCard(request) {
  const card = document.createElement('article');
  card.className = 'request-card';

  const header = document.createElement('div');
  header.className = 'request-card-header';

  const info = document.createElement('div');
  info.className = 'info';

  const icon = document.createElement('div');
  icon.className = `request-icon type-${request.type}`;
  icon.textContent = TYPE_INFO[request.type]?.icon || '📌';

  const text = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'request-title';
  title.textContent = TYPE_INFO[request.type]?.label || 'Solicitud';

  const meta = document.createElement('p');
  meta.className = 'request-meta';
  meta.textContent = `${formatDate(request.createdAt)} · ${request.citizen || 'Ciudadano'}`;

  text.append(title, meta);
  info.append(icon, text);

  const status = document.createElement('span');
  status.className = `status-badge status-${request.status}`;
  status.textContent = STATUS_INFO[request.status] || request.status;

  header.append(info, status);

  const description = document.createElement('p');
  description.className = 'request-description';
  description.textContent = request.description;

  card.append(header, description);

  if (request.images?.length) {
    const gallery = document.createElement('div');
    gallery.className = 'image-preview';
    request.images.forEach((src) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Evidencia de la solicitud';
      gallery.append(img);
    });
    card.append(gallery);
  }

  if (request.responses?.length) {
    request.responses.forEach((response) => {
      const block = document.createElement('div');
      block.className = 'response-block';
      const heading = document.createElement('h4');
      heading.textContent = `Respuesta · ${formatDate(response.createdAt)}`;
      const message = document.createElement('p');
      message.textContent = response.message;
      block.append(heading, message);
      if (response.images?.length) {
        const gallery = document.createElement('div');
        gallery.className = 'image-preview';
        response.images.forEach((src) => {
          const img = document.createElement('img');
          img.src = src;
          img.alt = 'Evidencia de solución';
          gallery.append(img);
        });
        block.append(gallery);
      }
      card.append(block);
    });
  }

  if (canManageRequest(request)) {
    const actions = document.createElement('div');
    const button = document.createElement('button');
    button.className = 'btn secondary';
    button.textContent = 'Actualizar seguimiento';
    button.addEventListener('click', () => openResponseDialog(request));
    actions.append(button);
    card.append(actions);
  }

  return card;
}

function canManageRequest(request) {
  if (!state.session) return false;
  if (state.session.role === 'admin') return true;
  if (state.session.role === 'municipal') {
    return state.session.municipalityId === request.municipalityId;
  }
  return false;
}

function openResponseDialog(request) {
  elements.responseRequestId.value = request.id;
  elements.responseStatus.value = request.status;
  elements.responseMessage.value = '';
  elements.responseImages.value = '';
  elements.responseImagePreview.innerHTML = '';
  elements.responseDialog.showModal();
}

function renderImagePreview(container, images) {
  container.innerHTML = '';
  images.forEach((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Vista previa';
    container.append(img);
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-PY', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(new Date(value));
}

function readImagePreviews(files) {
  const uploads = files.slice(0, 6).map((file) => {
    if (file.size > 25 * 1024 * 1024) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  });
  return Promise.all(uploads).then((images) => images.filter(Boolean));
}

function loadSession() {
  const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error parsing session', error);
    return null;
  }
}

function loadRequests() {
  const stored = localStorage.getItem(STORAGE_KEYS.REQUESTS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing requests', error);
    }
  }
  const seed = seedRequests();
  localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(seed));
  return seed;
}

function saveRequests() {
  localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(state.requests));
}

function seedRequests() {
  const now = new Date();
  return [
    {
      id: createId(),
      municipalityId: 'asu',
      type: 'reparacion',
      description: 'Bache en la calle principal',
      status: 'pendiente',
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4).toISOString(),
      citizen: 'María López',
      images: [],
      responses: []
    },
    {
      id: createId(),
      municipalityId: 'asu',
      type: 'mantenimiento',
      description: 'Poste de luz con problemas eléctricos',
      status: 'en_progreso',
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      citizen: 'Luis Fernández',
      images: [],
      responses: [
        {
          id: createId(),
          author: 'Equipo de Alumbrado',
          message: 'Se programó la reparación para el fin de semana.',
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
          images: []
        }
      ]
    },
    {
      id: createId(),
      municipalityId: 'asu',
      type: 'alerta',
      description: 'Árbol caído obstruyendo la vereda',
      status: 'completado',
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      citizen: 'Andrea Benítez',
      images: [],
      responses: [
        {
          id: createId(),
          author: 'Dirección de Servicios',
          message: 'Se retiró el árbol y se liberó el paso.',
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          images: []
        }
      ]
    },
    {
      id: createId(),
      municipalityId: 'asu',
      type: 'creacion',
      description: 'Solicitud de semáforo en intersección concurrida',
      status: 'pendiente',
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      citizen: 'Roberto Díaz',
      images: [],
      responses: []
    }
  ];
}

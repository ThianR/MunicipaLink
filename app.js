const STORAGE_KEYS = {
  requests: 'municipalink_requests',
  users: 'municipalink_users',
  session: 'municipalink_session'
};

const REQUEST_TYPES = {
  reparacion: {
    label: 'Reparación',
    color: '#f97316',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 21l1.5-4.5L17.25 3.75a2.12 2.12 0 013 3L7.5 19.5 3 21z"/></svg>'
  },
  mantenimiento: {
    label: 'Mantenimiento',
    color: '#2563eb',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.75a3 3 0 013 3v9.75H9V9.75a3 3 0 013-3zm0 0V3"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7.5 21h9"/></svg>'
  },
  creacion: {
    label: 'Creación',
    color: '#4ade80',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.5v15"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.5 12h15"/></svg>'
  },
  alerta: {
    label: 'Alerta',
    color: '#dc2626',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v4.5"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 17.25h.008v.008H12z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.29 3.86L1.82 18a1.5 1.5 0 001.29 2.25h17.78A1.5 1.5 0 0022.18 18L13.71 3.86a1.5 1.5 0 00-2.42 0z"/></svg>'
  }
};

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completado: 'Completado'
};

const map = L.map('map', { zoomControl: false }).setView([-23.35, -58.4], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
L.control.zoom({ position: 'topright' }).addTo(map);

const municipalityLayer = L.layerGroup().addTo(map);
const requestLayer = L.layerGroup().addTo(map);

const state = {
  municipalities: [],
  selectedMunicipality: null,
  requests: loadFromStorage(STORAGE_KEYS.requests),
  users: loadFromStorage(STORAGE_KEYS.users),
  currentUser: null
};
state.currentUser = restoreSession();

const elements = {
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  authDialog: document.getElementById('authDialog'),
  authName: document.getElementById('authName'),
  authEmail: document.getElementById('authEmail'),
  authRole: document.getElementById('authRole'),
  authSubmit: document.getElementById('authSubmit'),
  assignedMunicipality: document.getElementById('assignedMunicipality'),
  municipalAssignment: document.getElementById('municipalAssignment'),
  municipalitySelect: document.getElementById('municipalitySelect'),
  sessionInfo: document.getElementById('sessionInfo'),
  newRequestBtn: document.getElementById('newRequestBtn'),
  requestDialog: document.getElementById('requestDialog'),
  requestForm: document.getElementById('requestForm'),
  requestMunicipality: document.getElementById('requestMunicipality'),
  requestType: document.getElementById('requestType'),
  requestDescription: document.getElementById('requestDescription'),
  requestImages: document.getElementById('requestImages'),
  requestImagePreview: document.getElementById('requestImagePreview'),
  requestList: document.getElementById('requestList'),
  requestCounters: document.getElementById('requestCounters'),
  selectedMunicipality: document.getElementById('selectedMunicipality'),
  geolocateBtn: document.getElementById('geolocateBtn'),
  viewAllMunicipalitiesBtn: document.getElementById('viewAllMunicipalitiesBtn'),
  municipalityDialog: document.getElementById('municipalityDialog'),
  municipalityList: document.getElementById('municipalityList'),
  municipalitySearch: document.getElementById('municipalitySearch'),
  municipalPanel: document.getElementById('municipalPanel'),
  municipalInfo: document.getElementById('municipalInfo'),
  municipalTools: document.getElementById('municipalTools'),
  municipalResponseDialog: document.getElementById('municipalResponseDialog'),
  responseStatus: document.getElementById('responseStatus'),
  responseMessage: document.getElementById('responseMessage'),
  responseImages: document.getElementById('responseImages'),
  responseImagePreview: document.getElementById('responseImagePreview'),
  responseRequestId: document.getElementById('responseRequestId'),
  adminPanel: document.getElementById('adminPanel'),
  adminTools: document.getElementById('adminTools'),
  logoutBtnEl: document.getElementById('logoutBtn'),
  sessionInfoEl: document.getElementById('sessionInfo')
};

let selectedProvider = null;

init();

function init() {
  setupEventListeners();
  loadMunicipalities();
  hydrateUI();
}

function setupEventListeners() {
  elements.loginBtn.addEventListener('click', () => openAuthDialog());
  elements.logoutBtn.addEventListener('click', () => logout());

  elements.authRole.addEventListener('change', () => toggleMunicipalAssignment());
  elements.authDialog.querySelectorAll('.auth-providers button').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedProvider = btn.dataset.provider;
      elements.authDialog.querySelectorAll('.auth-providers button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  elements.authSubmit.addEventListener('click', handleAuthSubmit);
  elements.municipalitySelect.addEventListener('change', event => {
    const municipality = state.municipalities.find(m => m.id === event.target.value);
    if (municipality) {
      focusMunicipality(municipality);
    }
  });
  elements.geolocateBtn.addEventListener('click', detectGeolocation);
  elements.newRequestBtn.addEventListener('click', openRequestDialog);
  elements.requestForm.addEventListener('submit', handleRequestSubmit);
  elements.requestImages.addEventListener('change', () => previewImages(elements.requestImages.files, elements.requestImagePreview));
  elements.responseImages.addEventListener('change', () => previewImages(elements.responseImages.files, elements.responseImagePreview));
  document.getElementById('municipalResponseForm').addEventListener('submit', handleMunicipalResponseSubmit);
  elements.viewAllMunicipalitiesBtn.addEventListener('click', () => elements.municipalityDialog.showModal());
  elements.municipalityDialog.addEventListener('close', () => {
    elements.municipalitySearch.value = '';
    renderMunicipalityList(state.municipalities);
  });
  elements.municipalitySearch.addEventListener('input', () => {
    const search = elements.municipalitySearch.value.toLowerCase();
    const filtered = state.municipalities.filter(m => m.name.toLowerCase().includes(search) || m.department.toLowerCase().includes(search));
    renderMunicipalityList(filtered);
  });
}

function loadMunicipalities() {
  fetch('data/municipalities.json')
    .then(response => response.json())
    .then(data => {
      state.municipalities = data;
      populateMunicipalitySelect();
      renderMunicipalityList(data);
      populateMunicipalAssignmentOptions();
      plotMunicipalitiesOnMap();
      if (!state.selectedMunicipality && state.currentUser?.assignedMunicipalityId) {
        const assigned = state.municipalities.find(m => m.id === state.currentUser.assignedMunicipalityId);
        if (assigned) {
          focusMunicipality(assigned);
        }
      }
    })
    .catch(() => {
      notify('No se pudieron cargar las municipalidades.');
    });
}

function populateMunicipalitySelect() {
  elements.municipalitySelect.innerHTML = '<option value="">Selecciona una municipalidad…</option>';
  state.municipalities
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = `${m.name} (${m.department})`;
      elements.municipalitySelect.append(option);
    });
}

function renderMunicipalityList(municipalities) {
  elements.municipalityList.innerHTML = '';
  municipalities.forEach(m => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${m.name}</strong><br><small>${m.department}</small>`;
    li.addEventListener('click', () => {
      focusMunicipality(m);
      elements.municipalityDialog.close();
    });
    elements.municipalityList.append(li);
  });
}

function populateMunicipalAssignmentOptions() {
  elements.assignedMunicipality.innerHTML = '<option value="">Selecciona una municipalidad</option>';
  state.municipalities.forEach(m => {
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = `${m.name} (${m.department})`;
    elements.assignedMunicipality.append(option);
  });
}

function plotMunicipalitiesOnMap() {
  municipalityLayer.clearLayers();
  state.municipalities.forEach(m => {
    const marker = L.circleMarker([m.lat, m.lng], {
      radius: 6,
      color: '#256073',
      weight: 1,
      fillColor: '#4c9a6a',
      fillOpacity: 0.7
    }).addTo(municipalityLayer);
    marker.bindTooltip(`${m.name} (${m.department})`);
    marker.on('click', () => focusMunicipality(m));
  });
}

function focusMunicipality(municipality) {
  state.selectedMunicipality = municipality;
  map.setView([municipality.lat, municipality.lng], 11);
  highlightMunicipality(municipality);
  renderSelectedMunicipality();
  renderRequests();
}

function highlightMunicipality(municipality) {
  municipalityLayer.eachLayer(layer => {
    if (layer.setStyle) {
      layer.setStyle({ fillOpacity: 0.7, radius: 6, color: '#256073' });
    }
  });

  municipalityLayer.eachLayer(layer => {
    if (layer.getLatLng && layer.getLatLng().lat === municipality.lat && layer.getLatLng().lng === municipality.lng) {
      layer.setStyle({ fillOpacity: 1, radius: 10, color: '#f97316' });
    }
  });
}

function detectGeolocation() {
  if (!navigator.geolocation) {
    notify('La geolocalización no es compatible con este navegador.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude } = position.coords;
      map.setView([latitude, longitude], 13);
      const municipality = findClosestMunicipality(latitude, longitude);
      if (municipality) {
        focusMunicipality(municipality);
        notify(`Ubicación detectada: ${municipality.name}`);
      } else {
        notify('No se encontró una municipalidad cercana en el listado.');
      }
    },
    error => {
      if (error.code === error.PERMISSION_DENIED) {
        notify('Necesitamos permiso de ubicación para detectar tu municipalidad.');
      } else {
        notify('No se pudo obtener la ubicación actual.');
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function findClosestMunicipality(lat, lng) {
  if (!state.municipalities.length) return null;
  let closest = null;
  let minDistance = Infinity;

  state.municipalities.forEach(m => {
    const distance = haversineDistance(lat, lng, m.lat, m.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closest = m;
    }
  });

  return closest;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function openAuthDialog() {
  selectedProvider = null;
  elements.authDialog.querySelectorAll('.auth-providers button').forEach(b => b.classList.remove('active'));
  elements.authName.value = '';
  elements.authEmail.value = '';
  elements.authRole.value = 'citizen';
  toggleMunicipalAssignment();
  elements.authDialog.showModal();
}

function toggleMunicipalAssignment() {
  if (elements.authRole.value === 'municipal') {
    elements.municipalAssignment.hidden = false;
  } else {
    elements.municipalAssignment.hidden = true;
    elements.assignedMunicipality.value = '';
  }
}

function handleAuthSubmit(event) {
  event.preventDefault();
  if (!selectedProvider) {
    notify('Selecciona un proveedor de autenticación.');
    return;
  }

  if (elements.authRole.value === 'municipal' && !elements.assignedMunicipality.value) {
    notify('Selecciona la municipalidad asignada.');
    return;
  }

  const email = elements.authEmail.value.trim().toLowerCase();
  const name = elements.authName.value.trim();

  if (!email || !name) {
    notify('Completa todos los campos requeridos.');
    return;
  }

  const existingUser = state.users.find(u => u.email === email);
  let user;
  if (existingUser) {
    user = { ...existingUser, name, provider: selectedProvider, role: elements.authRole.value };
    if (elements.authRole.value === 'municipal') {
      user.assignedMunicipalityId = elements.assignedMunicipality.value;
    }
    state.users = state.users.map(u => (u.id === user.id ? user : u));
  } else {
    user = {
      id: crypto.randomUUID(),
      name,
      email,
      provider: selectedProvider,
      role: elements.authRole.value,
      assignedMunicipalityId: elements.assignedMunicipality.value || null,
      createdAt: new Date().toISOString()
    };
    state.users.push(user);
  }

  persistToStorage(STORAGE_KEYS.users, state.users);
  state.currentUser = user;
  persistToStorage(STORAGE_KEYS.session, { userId: user.id });
  elements.authDialog.close();
  hydrateUI();
  notify(`Bienvenido ${user.name}`);
}

function hydrateUI() {
  if (state.currentUser) {
    elements.sessionInfo.textContent = `${state.currentUser.name} · ${rolLabel(state.currentUser.role)}`;
    elements.loginBtn.hidden = true;
    elements.logoutBtn.hidden = false;
    elements.newRequestBtn.hidden = state.currentUser.role !== 'citizen';
  } else {
    elements.sessionInfo.textContent = 'Sesión invitado';
    elements.loginBtn.hidden = false;
    elements.logoutBtn.hidden = true;
    elements.newRequestBtn.hidden = true;
  }

  renderMunicipalPanel();
  renderAdminPanel();
  renderRequests();
}

function renderMunicipalPanel() {
  if (state.currentUser?.role === 'municipal') {
    elements.municipalPanel.hidden = false;
    const municipality = state.municipalities.find(m => m.id === state.currentUser.assignedMunicipalityId);
    if (municipality) {
      elements.municipalInfo.innerHTML = `<strong>${municipality.name}</strong><p>${municipality.department}</p>`;
      const requests = getRequestsByMunicipality(municipality.id);
      elements.municipalTools.innerHTML = `
        <div class="municipal-summary">
          <p><strong>Total solicitudes:</strong> ${requests.length}</p>
          <p><strong>Pendientes:</strong> ${requests.filter(r => r.status === 'pendiente').length}</p>
          <p><strong>En progreso:</strong> ${requests.filter(r => r.status === 'en_progreso').length}</p>
          <p><strong>Completadas:</strong> ${requests.filter(r => r.status === 'completado').length}</p>
        </div>
        <button class="btn secondary" id="goToAssignedMunicipality">Ver solicitudes asignadas</button>
      `;
      document.getElementById('goToAssignedMunicipality').addEventListener('click', () => focusMunicipality(municipality));
      if (!state.selectedMunicipality) {
        focusMunicipality(municipality);
      }
    } else {
      elements.municipalInfo.textContent = 'No hay municipalidad asignada.';
      elements.municipalTools.innerHTML = '';
    }
  } else {
    elements.municipalPanel.hidden = true;
  }
}

function renderAdminPanel() {
  if (state.currentUser?.role === 'admin') {
    elements.adminPanel.hidden = false;
    renderAdminTools();
  } else {
    elements.adminPanel.hidden = true;
    elements.adminTools.innerHTML = '';
  }
}

function renderAdminTools() {
  const usersTableRows = state.users.map(user => `
    <tr>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${rolLabel(user.role)}</td>
      <td>${user.assignedMunicipalityId ? municipalityName(user.assignedMunicipalityId) : '—'}</td>
    </tr>
  `).join('');

  const reports = generateReportData();
  const reportRows = reports.municipalities.map(row => `
    <tr>
      <td>${row.municipality}</td>
      <td>${row.total}</td>
      <td>${row.pendiente}</td>
      <td>${row.en_progreso}</td>
      <td>${row.completado}</td>
    </tr>
  `).join('');

  elements.adminTools.innerHTML = `
    <section>
      <h4>Usuarios registrados</h4>
      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Municipalidad</th>
          </tr>
        </thead>
        <tbody>${usersTableRows || '<tr><td colspan="4">Sin usuarios registrados</td></tr>'}</tbody>
      </table>
    </section>
    <section>
      <h4>Informe de solicitudes</h4>
      <table class="table">
        <thead>
          <tr>
            <th>Municipalidad</th>
            <th>Total</th>
            <th>Pendientes</th>
            <th>En progreso</th>
            <th>Completadas</th>
          </tr>
        </thead>
        <tbody>${reportRows || '<tr><td colspan="5">Sin datos disponibles</td></tr>'}</tbody>
      </table>
      <div class="request-actions">
        <button class="btn secondary" id="downloadReport">Descargar CSV</button>
      </div>
    </section>
  `;

  document.getElementById('downloadReport').addEventListener('click', () => downloadCSVReport(reports));
}

function renderSelectedMunicipality() {
  if (!state.selectedMunicipality) {
    elements.selectedMunicipality.hidden = true;
    return;
  }
  const { name, department } = state.selectedMunicipality;
  elements.selectedMunicipality.hidden = false;
  elements.selectedMunicipality.innerHTML = `<strong>${name}</strong> · ${department}`;
  elements.municipalitySelect.value = state.selectedMunicipality.id;
  elements.requestMunicipality.value = name;
  renderCounters();
  plotRequestsOnMap();
}

function renderCounters() {
  if (!state.selectedMunicipality) return;
  const requests = getRequestsByMunicipality(state.selectedMunicipality.id);
  const counts = Object.keys(REQUEST_TYPES).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  requests.forEach(r => {
    counts[r.type] = (counts[r.type] || 0) + 1;
  });
  elements.requestCounters.innerHTML = Object.entries(REQUEST_TYPES)
    .map(([key, value]) => `<span class="counter-pill" style="background:${hexToRgba(value.color, 0.12)};color:${value.color}">${value.icon} ${value.label}: ${counts[key] || 0}</span>`)
    .join('');
}

function openRequestDialog() {
  if (!state.selectedMunicipality) {
    notify('Selecciona una municipalidad antes de cargar la solicitud.');
    return;
  }
  elements.requestMunicipality.value = state.selectedMunicipality.name;
  elements.requestType.value = '';
  elements.requestDescription.value = '';
  elements.requestImages.value = '';
  elements.requestImagePreview.innerHTML = '';
  elements.requestDialog.showModal();
}

async function handleRequestSubmit(event) {
  event.preventDefault();
  if (!state.currentUser || state.currentUser.role !== 'citizen') {
    notify('Debes iniciar sesión como ciudadano para crear solicitudes.');
    return;
  }
  if (!state.selectedMunicipality) {
    notify('Selecciona una municipalidad.');
    return;
  }

  const type = elements.requestType.value;
  const description = elements.requestDescription.value.trim();
  if (!type || !description) {
    notify('Completa el tipo y la descripción.');
    return;
  }

  const images = await serializeFiles(elements.requestImages.files);

  const newRequest = {
    id: crypto.randomUUID(),
    municipalityId: state.selectedMunicipality.id,
    type,
    description,
    images,
    status: 'pendiente',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    citizenId: state.currentUser.id,
    followUps: []
  };

  state.requests.push(newRequest);
  persistToStorage(STORAGE_KEYS.requests, state.requests);
  elements.requestDialog.close();
  renderCounters();
  renderRequests();
  plotRequestsOnMap();
  notify('Solicitud registrada correctamente.');
}

function previewImages(files, container) {
  container.innerHTML = '';
  Array.from(files).forEach(file => {
    if (file.size > 25 * 1024 * 1024) {
      notify(`La imagen ${file.name} supera los 25MB y no se incluirá.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      const img = document.createElement('img');
      img.src = event.target.result;
      img.alt = file.name;
      container.append(img);
    };
    reader.readAsDataURL(file);
  });
}

function serializeFiles(fileList) {
  const files = Array.from(fileList);
  const promises = files.map(file => {
    if (file.size > 25 * 1024 * 1024) {
      return Promise.resolve(null);
    }
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = event => {
        resolve({ name: file.name, dataUrl: event.target.result });
      };
      reader.readAsDataURL(file);
    });
  });
  return Promise.all(promises).then(results => results.filter(Boolean));
}

function renderRequests() {
  if (!state.selectedMunicipality) {
    elements.requestList.classList.add('empty-state');
    elements.requestList.innerHTML = '<p>Selecciona una municipalidad para ver las solicitudes.</p>';
    requestLayer.clearLayers();
    return;
  }

  const requests = getRequestsByMunicipality(state.selectedMunicipality.id);
  if (!requests.length) {
    elements.requestList.classList.add('empty-state');
    elements.requestList.innerHTML = '<p>No se registran solicitudes para esta municipalidad.</p>';
    requestLayer.clearLayers();
    return;
  }

  elements.requestList.classList.remove('empty-state');
  elements.requestList.innerHTML = '';

  requests
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(request => {
      const template = document.getElementById('requestTemplate');
      const node = template.content.cloneNode(true);
      const card = node.querySelector('.request-card');
      const typeMeta = REQUEST_TYPES[request.type];
      card.querySelector('[data-type]').innerHTML = typeMeta.icon;
      card.querySelector('[data-type]').style.background = hexToRgba(typeMeta.color, 0.1);
      card.querySelector('[data-title]').textContent = `${typeMeta.label}`;
      card.querySelector('[data-meta]').textContent = `Cargada el ${formatDate(request.createdAt)}`;
      card.querySelector('[data-status]').textContent = STATUS_LABELS[request.status];
      card.querySelector('[data-status]').dataset.state = request.status;
      card.querySelector('[data-description]').textContent = request.description;
      const imagesContainer = card.querySelector('[data-images]');
      request.images.forEach(image => {
        const img = document.createElement('img');
        img.src = image.dataUrl;
        img.alt = image.name;
        imagesContainer.append(img);
      });
      if (request.followUps.length) {
        const details = card.querySelector('[data-responses]');
        details.hidden = false;
        const list = card.querySelector('[data-response-list]');
        request.followUps.forEach(followUp => {
          const li = document.createElement('li');
          const author = userName(followUp.userId);
          li.innerHTML = `<strong>${author}</strong> · ${formatDate(followUp.createdAt)}<br>${followUp.message}`;
          if (followUp.images?.length) {
            const preview = document.createElement('div');
            preview.className = 'image-preview';
            followUp.images.forEach(imgData => {
              const img = document.createElement('img');
              img.src = imgData.dataUrl;
              img.alt = imgData.name;
              preview.append(img);
            });
            li.append(preview);
          }
          list.append(li);
        });
      }

      if (canManageRequest(request)) {
        const actions = card.querySelector('[data-actions]');
        actions.hidden = false;
        const button = document.createElement('button');
        button.className = 'btn secondary';
        button.textContent = 'Dar seguimiento';
        button.addEventListener('click', () => openMunicipalResponseDialog(request));
        actions.append(button);
      }

      elements.requestList.append(card);
    });

  plotRequestsOnMap();
}

function plotRequestsOnMap() {
  requestLayer.clearLayers();
  if (!state.selectedMunicipality) return;
  const requests = getRequestsByMunicipality(state.selectedMunicipality.id);
  requests.forEach(request => {
    const municipality = state.municipalities.find(m => m.id === request.municipalityId);
    if (!municipality) return;
    const icon = L.divIcon({
      className: 'request-map-icon',
      html: `<span style="background:${REQUEST_TYPES[request.type].color}"></span>`,
      iconSize: [20, 20]
    });
    L.marker([municipality.lat + randomOffset(), municipality.lng + randomOffset()], { icon })
      .addTo(requestLayer)
      .bindPopup(`
        <strong>${REQUEST_TYPES[request.type].label}</strong><br>
        Estado: ${STATUS_LABELS[request.status]}<br>
        ${truncate(request.description, 120)}
      `);
  });
}

function randomOffset() {
  return (Math.random() - 0.5) * 0.01;
}

function canManageRequest(request) {
  if (!state.currentUser) return false;
  if (state.currentUser.role === 'admin') return true;
  if (state.currentUser.role === 'municipal') {
    return state.currentUser.assignedMunicipalityId === request.municipalityId;
  }
  return false;
}

function openMunicipalResponseDialog(request) {
  elements.responseRequestId.value = request.id;
  elements.responseStatus.value = request.status;
  elements.responseMessage.value = '';
  elements.responseImages.value = '';
  elements.responseImagePreview.innerHTML = '';
  elements.municipalResponseDialog.showModal();
}

async function handleMunicipalResponseSubmit(event) {
  event.preventDefault();
  const requestId = elements.responseRequestId.value;
  const request = state.requests.find(r => r.id === requestId);
  if (!request) return;
  const status = elements.responseStatus.value;
  const message = elements.responseMessage.value.trim();
  if (!message) {
    notify('Describe la acción realizada.');
    return;
  }
  const images = await serializeFiles(elements.responseImages.files);
  const followUp = {
    id: crypto.randomUUID(),
    userId: state.currentUser.id,
    status,
    message,
    images,
    createdAt: new Date().toISOString()
  };
  request.followUps.push(followUp);
  request.status = status;
  request.updatedAt = new Date().toISOString();
  state.requests = state.requests.map(r => (r.id === request.id ? request : r));
  persistToStorage(STORAGE_KEYS.requests, state.requests);
  elements.municipalResponseDialog.close();
  renderRequests();
  renderCounters();
  plotRequestsOnMap();
  notify('Seguimiento actualizado.');
}

function getRequestsByMunicipality(id) {
  return state.requests.filter(r => r.municipalityId === id);
}

function notify(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function restoreSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.session));
    if (!session?.userId) return null;
    const user = state?.users?.find(u => u.id === session.userId);
    return user || null;
  } catch {
    return null;
  }
}

function logout() {
  state.currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.session);
  hydrateUI();
  notify('Sesión cerrada.');
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function municipalityName(id) {
  const municipality = state.municipalities.find(m => m.id === id);
  return municipality ? municipality.name : '—';
}

function userName(id) {
  const user = state.users.find(u => u.id === id);
  return user ? user.name : 'Funcionario municipal';
}

function rolLabel(role) {
  switch (role) {
    case 'citizen':
      return 'Ciudadano';
    case 'municipal':
      return 'Funcionario';
    case 'admin':
      return 'Administrador';
    default:
      return role;
  }
}

function generateReportData() {
  const municipalities = state.municipalities.map(m => {
    const requests = getRequestsByMunicipality(m.id);
    return {
      municipality: `${m.name} (${m.department})`,
      total: requests.length,
      pendiente: requests.filter(r => r.status === 'pendiente').length,
      en_progreso: requests.filter(r => r.status === 'en_progreso').length,
      completado: requests.filter(r => r.status === 'completado').length
    };
  }).filter(row => row.total > 0);

  const statusDistribution = state.requests.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] || 0) + 1;
    return acc;
  }, {});

  return { municipalities, statusDistribution };
}

function downloadCSVReport(report) {
  const headers = ['Municipalidad', 'Total', 'Pendiente', 'En progreso', 'Completadas'];
  const rows = report.municipalities.map(row => [row.municipality, row.total, row.pendiente, row.en_progreso, row.completado]);
  const csvContent = [headers, ...rows].map(columns => columns.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reporte-solicitudes.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function truncate(text, limit) {
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function hexToRgba(hex, alpha) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return hex;
  }
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Toast styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #1f2933;
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 1000;
}
.toast.visible {
  opacity: 0.95;
  transform: translateY(0);
}
.request-map-icon span {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px rgba(0,0,0,0.15);
}
`;
document.head.append(toastStyles);

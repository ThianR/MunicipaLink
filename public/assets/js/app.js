// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const authScreen = document.getElementById('auth-screen');
  const appContainer = document.getElementById('app-container');
  const userArea = document.getElementById('user-area');
  const guestArea = document.getElementById('guest-area');
  const userName = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');
  const loginBtn = document.getElementById('login-btn');
  const citizenTab = document.getElementById('citizen-tab');
  const municipalTab = document.getElementById('municipal-tab');
  const adminTab = document.getElementById('admin-tab');
  const citizenView = document.getElementById('citizen-view');
  const municipalView = document.getElementById('municipal-view');
  const adminView = document.getElementById('admin-view');
  const locateBtn = document.getElementById('locate-me');
  const locationStatus = document.getElementById('location-status');
  const municipalitySelector = document.getElementById('municipality-selector');
  const createRequestBtn = document.getElementById('create-request-btn');
  const newRequestSection = document.getElementById('new-request-section');
  const citizenRequestsSection = document.getElementById('citizen-requests-section');
  const requestForm = document.getElementById('request-form');
  const requestImages = document.getElementById('request-images');
  const imagePreview = document.getElementById('image-preview');
  
  // State variables
  let currentUser = null;
  let currentRole = 'citizen';
  let map = null;
  let userMarker = null;
  let currentMunicipality = null;
  let selectedImages = [];
  
  // Authentication functions
  function loginWithGoogle() {
    // This will be replaced with actual API call
    simulateLogin({
      name: 'Juan Pérez',
      email: 'juan@example.com',
      role: 'citizen'
    });
  }
  
  function loginWithOutlook() {
    // This will be replaced with actual API call
    simulateLogin({
      name: 'María González',
      email: 'maria@example.com',
      role: 'municipal'
    });
  }
  
  function loginWithICloud() {
    // This will be replaced with actual API call
    simulateLogin({
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    });
  }
  
  function continueAsGuest() {
    // Set up guest user
    currentUser = null;
    showApp();
    setupGuest();
  }
  
  function simulateLogin(user) {
    currentUser = user;
    showApp();
    setupUser(user);
  }
  
  function logout() {
    currentUser = null;
    authScreen.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
  
  function showApp() {
    authScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');
    initializeMap();
  }
  
  function setupUser(user) {
    userArea.classList.remove('hidden');
    guestArea.classList.add('hidden');
    userName.textContent = user.name;
    createRequestBtn.classList.remove('hidden');
    
    // Show tabs based on role
    if (user.role === 'admin') {
      adminTab.classList.remove('hidden');
      municipalTab.classList.remove('hidden');
    } else if (user.role === 'municipal') {
      municipalTab.classList.remove('hidden');
      adminTab.classList.add('hidden');
    } else {
      municipalTab.classList.add('hidden');
      adminTab.classList.add('hidden');
    }
  }
  
  function setupGuest() {
    userArea.classList.add('hidden');
    guestArea.classList.remove('hidden');
    createRequestBtn.classList.add('hidden');
    municipalTab.classList.add('hidden');
    adminTab.classList.add('hidden');
  }
  
  // Map initialization
  function initializeMap() {
    if (map !== null) return;
    
    map = L.map('map-container').setView([-25.3, -57.6], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
  }
  
  // Geolocation functionality
  function getUserLocation() {
    locationStatus.textContent = 'Obteniendo ubicación...';
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          locationStatus.textContent = 'Ubicación obtenida!';
          updateMapLocation(lat, lng);
          identifyMunicipality(lat, lng);
        },
        error => {
          locationStatus.textContent = 'Error al obtener ubicación.';
          console.error('Geolocation error:', error);
        }
      );
    } else {
      locationStatus.textContent = 'Geolocalización no soportada por su navegador.';
    }
  }
  
  function updateMapLocation(lat, lng) {
    map.setView([lat, lng], 14);
    
    if (userMarker) {
      userMarker.setLatLng([lat, lng]);
    } else {
      userMarker = L.marker([lat, lng]).addTo(map);
    }
  }
  
  function identifyMunicipality(lat, lng) {
    // In a real application, this would make an API call to identify the municipality
    // For the prototype, we'll simulate this with a timeout
    setTimeout(() => {
      // Simulate identifying Asunción based on coordinates
      currentMunicipality = 'asuncion';
      municipalitySelector.value = currentMunicipality;
      
      Swal.fire({
        icon: 'success',
        title: 'Municipalidad identificada',
        text: 'Su ubicación corresponde a Asunción',
        confirmButtonColor: '#667eea'
      });
      
      loadMunicipalityRequests(currentMunicipality);
    }, 1000);
  }
  
  function handleMunicipalitySelection() {
    const municipalityId = municipalitySelector.value;
    if (!municipalityId) return;
    
    currentMunicipality = municipalityId;
    
    // Update map to show the selected municipality
    // In a real app, we would have polygon data for each municipality
    const municipalityCoordinates = {
      asuncion: [-25.2968, -57.6332],
      ciudad_del_este: [-25.5097, -54.6111],
      encarnacion: [-27.3325, -55.8667],
      san_lorenzo: [-25.3333, -57.5167],
      lambare: [-25.3468, -57.6366],
      fernando_de_la_mora: [-25.3386, -57.5217],
      luque: [-25.2697, -57.4847],
      capiata: [-25.3552, -57.4253]
    };
    
    const coords = municipalityCoordinates[municipalityId];
    map.setView(coords, 13);
    
    loadMunicipalityRequests(municipalityId);
  }
  
  function loadMunicipalityRequests(municipalityId) {
    const requestsList = document.getElementById('requests-list');
    requestsList.innerHTML = `
      <div class="text-center py-10">
        <div class="loading-spinner mx-auto mb-3"></div>
        <p class="text-gray-500">Cargando solicitudes de ${getMunicipalityName(municipalityId)}...</p>
      </div>
    `;
    
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock request data
      updateRequestCounts({
        repairs: 12,
        maintenance: 8,
        creation: 5,
        alert: 3
      });
      
      displayRequests(getMockRequests(municipalityId));
    }, 1500);
  }
  
  function getMunicipalityName(id) {
    const names = {
      asuncion: 'Asunción',
      ciudad_del_este: 'Ciudad del Este',
      encarnacion: 'Encarnación',
      san_lorenzo: 'San Lorenzo',
      lambare: 'Lambaré',
      fernando_de_la_mora: 'Fernando de la Mora',
      luque: 'Luque',
      capiata: 'Capiatá'
    };
    return names[id] || id;
  }
  
  function getMockRequests(municipalityId) {
    // This would be replaced with actual API data
    return [
      {
        id: 1,
        type: 'reparacion',
        typeName: 'Reparación',
        description: 'Bache en la calle principal',
        status: 'pendiente',
        date: '2025-04-10',
        location: 'Calle Palma 123',
        images: ['https://cdn.pixabay.com/photo/2018/01/17/04/14/road-3087868_1280.jpg']
      },
      {
        id: 2,
        type: 'mantenimiento',
        typeName: 'Mantenimiento',
        description: 'Poste de luz caído',
        status: 'en-progreso',
        date: '2025-04-09',
        location: 'Avda. España 234',
        images: ['https://cdn.pixabay.com/photo/2016/10/22/20/34/outdoors-1761292_1280.jpg']
      },
      {
        id: 3,
        type: 'creacion',
        typeName: 'Creación',
        description: 'Solicitud de semáforo en intersección',
        status: 'pendiente',
        date: '2025-04-08',
        location: 'Cruce Itá Ybaté y Mcal. López',
        images: ['https://cdn.pixabay.com/photo/2017/08/01/11/48/blue-2564660_1280.jpg']
      },
      {
        id: 4,
        type: 'alerta',
        typeName: 'Alerta',
        description: 'Árbol a punto de caer',
        status: 'completado',
        date: '2025-04-07',
        location: 'Plaza Uruguaya',
        images: ['https://cdn.pixabay.com/photo/2015/07/05/13/44/beach-832346_1280.jpg']
      }
    ];
  }
  
  function updateRequestCounts(counts) {
    document.getElementById('repairs-count').textContent = counts.repairs;
    document.getElementById('maintenance-count').textContent = counts.maintenance;
    document.getElementById('creation-count').textContent = counts.creation;
    document.getElementById('alert-count').textContent = counts.alert;
  }
  
  function displayRequests(requests) {
    const requestsList = document.getElementById('requests-list');
    
    if (requests.length === 0) {
      requestsList.innerHTML = `
        <div class="text-center py-10">
          <i class="fas fa-inbox fa-3x text-gray-300 mb-3"></i>
          <p class="text-gray-500">No hay solicitudes para mostrar</p>
        </div>
      `;
      return;
    }
    
    requestsList.innerHTML = '';
    
    requests.forEach(request => {
      const statusClass = getStatusClass(request.status);
      const statusText = getStatusText(request.status);
      const iconClass = getTypeIcon(request.type);
      
      const requestCard = document.createElement('div');
      requestCard.className = `request-card mb-4 ${request.type}-request`;
      requestCard.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex items-start">
            <div class="mr-4 mt-1">
              <i class="${iconClass} text-xl"></i>
            </div>
            <div>
              <h3 class="font-medium text-lg">${request.typeName}</h3>
              <p class="text-gray-600 mb-2">${request.description}</p>
              <div class="flex items-center text-sm text-gray-500 mb-3">
                <span class="mr-3"><i class="fas fa-map-marker-alt mr-1"></i> ${request.location}</span>
                <span><i class="far fa-calendar-alt mr-1"></i> ${formatDate(request.date)}</span>
              </div>
              ${request.images && request.images.length > 0 ? `
                <div class="flex flex-wrap gap-2 mb-3">
                  ${request.images.map(img => `
                    <img src="${img}" alt="Imagen de solicitud" class="w-20 h-20 object-cover rounded-lg shadow-sm cursor-pointer">
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
          <span class="badge ${statusClass}">${statusText}</span>
        </div>
        ${request.response ? `
          <div class="mt-4 pt-4 border-t">
            <p class="font-medium text-sm mb-1">Respuesta municipal:</p>
            <p class="text-gray-600 text-sm">${request.response}</p>
          </div>
        ` : ''}
      `;
      
      requestsList.appendChild(requestCard);
    });
  }
  
  function getStatusClass(status) {
    switch(status) {
      case 'pendiente': return 'badge-pending';
      case 'en-progreso': return 'badge-progress';
      case 'completado': return 'badge-completed';
      default: return 'badge-pending';
    }
  }
  
  function getStatusText(status) {
    switch(status) {
      case 'pendiente': return 'Pendiente';
      case 'en-progreso': return 'En progreso';
      case 'completado': return 'Completado';
      default: return 'Pendiente';
    }
  }
  
  function getTypeIcon(type) {
    switch(type) {
      case 'reparacion': return 'fas fa-tools text-indigo-500';
      case 'mantenimiento': return 'fas fa-broom text-blue-500';
      case 'creacion': return 'fas fa-plus-circle text-green-500';
      case 'alerta': return 'fas fa-exclamation-triangle text-red-500';
      default: return 'fas fa-question-circle text-gray-500';
    }
  }
  
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', options);
  }
  
  // Tab navigation
  function setupTabNavigation() {
    citizenTab.addEventListener('click', () => {
      switchTab('citizen');
    });
    
    municipalTab.addEventListener('click', () => {
      switchTab('municipal');
    });
    
    adminTab.addEventListener('click', () => {
      switchTab('admin');
    });
  }
  
  function switchTab(tab) {
    // Update tab styling
    citizenTab.classList.remove('active');
    municipalTab.classList.remove('active');
    adminTab.classList.remove('active');
    
    // Hide all views
    citizenView.classList.remove('active');
    municipalView.classList.remove('active');
    adminView.classList.remove('active');
    
    citizenView.classList.add('hidden');
    municipalView.classList.add('hidden');
    adminView.classList.add('hidden');
    
    // Show selected tab and view
    switch(tab) {
      case 'citizen':
        citizenTab.classList.add('active');
        citizenView.classList.add('active');
        citizenView.classList.remove('hidden');
        break;
      case 'municipal':
        municipalTab.classList.add('active');
        municipalView.classList.add('active');
        municipalView.classList.remove('hidden');
        loadMunicipalDashboard();
        break;
      case 'admin':
        adminTab.classList.add('active');
        adminView.classList.add('active');
        adminView.classList.remove('hidden');
        loadAdminDashboard();
        break;
    }
    
    currentRole = tab;
  }
  
  function loadMunicipalDashboard() {
    const municipalityName = document.getElementById('municipality-name');
    const municipalityStats = document.getElementById('municipality-stats');
    const pendingCount = document.getElementById('pending-count');
    const inprogressCount = document.getElementById('inprogress-count');
    const completedCount = document.getElementById('completed-count');
    
    // In a real app, this would fetch data from an API
    setTimeout(() => {
      municipalityName.textContent = 'Municipalidad de Asunción';
      municipalityStats.textContent = '28 solicitudes activas | 15 resueltas este mes';
      pendingCount.textContent = '12';
      inprogressCount.textContent = '8';
      completedCount.textContent = '15';
      
      // Load municipality requests
      const municipalityRequestsList = document.getElementById('municipality-requests-list');
      municipalityRequestsList.innerHTML = `
        <div class="space-y-4">
          <div class="request-card">
            <div class="flex justify-between items-start">
              <div class="flex items-start">
                <div class="mr-4 mt-1">
                  <i class="fas fa-tools text-indigo-500 text-xl"></i>
                </div>
                <div>
                  <h3 class="font-medium text-lg">Reparación</h3>
                  <p class="text-gray-600 mb-2">Bache en la calle principal</p>
                  <div class="flex items-center text-sm text-gray-500 mb-3">
                    <span class="mr-3"><i class="fas fa-map-marker-alt mr-1"></i> Calle Palma 123</span>
                    <span><i class="far fa-calendar-alt mr-1"></i> 10 de abril, 2025</span>
                  </div>
                  <div class="flex flex-wrap gap-2 mb-3">
                    <img src="https://cdn.pixabay.com/photo/2018/01/17/04/14/road-3087868_1280.jpg" alt="Bache" class="w-20 h-20 object-cover rounded-lg shadow-sm cursor-pointer">
                  </div>
                </div>
              </div>
              <div>
                <span class="badge badge-pending">Pendiente</span>
              </div>
            </div>
            
            <div class="mt-4 pt-4 border-t">
              <h4 class="font-medium text-sm mb-3">Responder:</h4>
              <textarea class="form-control text-sm" placeholder="Escriba una respuesta o actualización..." rows="2"></textarea>
              <div class="flex justify-between items-center mt-3">
                <div>
                  <button class="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    <i class="fas fa-paperclip mr-1"></i> Adjuntar
                  </button>
                </div>
                <div class="space-x-2">
                  <button class="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">En progreso</button>
                  <button class="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm">Completado</button>
                  <button class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm">Enviar</button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="request-card">
            <div class="flex justify-between items-start">
              <div class="flex items-start">
                <div class="mr-4 mt-1">
                  <i class="fas fa-broom text-blue-500 text-xl"></i>
                </div>
                <div>
                  <h3 class="font-medium text-lg">Mantenimiento</h3>
                  <p class="text-gray-600 mb-2">Poste de luz caído</p>
                  <div class="flex items-center text-sm text-gray-500 mb-3">
                    <span class="mr-3"><i class="fas fa-map-marker-alt mr-1"></i> Avda. España 234</span>
                    <span><i class="far fa-calendar-alt mr-1"></i> 9 de abril, 2025</span>
                  </div>
                  <div class="flex flex-wrap gap-2 mb-3">
                    <img src="https://cdn.pixabay.com/photo/2016/10/22/20/34/outdoors-1761292_1280.jpg" alt="Poste caído" class="w-20 h-20 object-cover rounded-lg shadow-sm cursor-pointer">
                  </div>
                </div>
              </div>
              <div>
                <span class="badge badge-progress">En progreso</span>
              </div>
            </div>
            
            <div class="mt-4 pt-4 border-t">
              <div class="bg-blue-50 p-3 rounded-lg mb-3">
                <p class="text-sm text-blue-800"><i class="fas fa-comment mr-1"></i> <strong>Respuesta:</strong> El equipo de mantenimiento está en camino para evaluar la situación.</p>
                <p class="text-xs text-blue-600 mt-1">Hace 2 horas</p>
              </div>
              <textarea class="form-control text-sm" placeholder="Escriba una respuesta o actualización..." rows="2"></textarea>
              <div class="flex justify-between items-center mt-3">
                <div>
                  <button class="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    <i class="fas fa-paperclip mr-1"></i> Adjuntar
                  </button>
                </div>
                <div class="space-x-2">
                  <button class="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm">Completado</button>
                  <button class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm">Enviar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }, 1000);
  }
  
  function loadAdminDashboard() {
    const totalRequests = document.getElementById('total-requests');
    const activeMunicipalities = document.getElementById('active-municipalities');
    const resolutionRate = document.getElementById('resolution-rate');
    const avgResolutionTime = document.getElementById('avg-resolution-time');
    const userList = document.getElementById('user-list');
    
    // In a real app, this would fetch data from an API
    setTimeout(() => {
      totalRequests.textContent = '325';
      activeMunicipalities.textContent = '18';
      resolutionRate.textContent = '76%';
      avgResolutionTime.textContent = '3.2 días';
      
      // Load user list
      userList.innerHTML = `
        <tr>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-10 w-10">
                <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                  <i class="fas fa-user"></i>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">Juan Pérez</div>
                <div class="text-sm text-gray-500">juan@example.com</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              Ciudadano
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button class="text-indigo-600 hover:text-indigo-900">Editar</button>
          </td>
        </tr>
        <tr>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-10 w-10">
                <div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                  <i class="fas fa-building"></i>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">María González</div>
                <div class="text-sm text-gray-500">maria@example.com</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              Municipal
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button class="text-indigo-600 hover:text-indigo-900">Editar</button>
          </td>
        </tr>
        <tr>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-10 w-10">
                <div class="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-500">
                  <i class="fas fa-user-shield"></i>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">Admin User</div>
                <div class="text-sm text-gray-500">admin@example.com</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
              Administrador
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button class="text-indigo-600 hover:text-indigo-900">Editar</button>
          </td>
        </tr>
      `;
    }, 1000);
  }
  
  // Request form functionality
  function handleRequestForm() {
    createRequestBtn.addEventListener('click', () => {
      newRequestSection.classList.toggle('hidden');
      createRequestBtn.innerHTML = newRequestSection.classList.contains('hidden') ? 
        '<i class="fas fa-plus mr-2"></i> Nueva solicitud' :
        '<i class="fas fa-times mr-2"></i> Cancelar';
    });
    
    requestImages.addEventListener('change', handleImageSelection);
    
    requestForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const requestType = document.getElementById('request-type').value;
      const requestDescription = document.getElementById('request-description').value;
      
      if (!requestType || !requestDescription) {
        Swal.fire({
          icon: 'error',
          title: 'Formulario incompleto',
          text: 'Por favor complete los campos requeridos.',
          confirmButtonColor: '#667eea'
        });
        return;
      }
      
      // This would be replaced with an actual API call
      Swal.fire({
        icon: 'success',
        title: 'Solicitud enviada',
        text: 'Su solicitud ha sido registrada exitosamente.',
        confirmButtonColor: '#667eea'
      }).then(() => {
        // Reset form and hide section
        requestForm.reset();
        imagePreview.innerHTML = '';
        selectedImages = [];
        newRequestSection.classList.add('hidden');
        createRequestBtn.innerHTML = '<i class="fas fa-plus mr-2"></i> Nueva solicitud';
        
        // Reload requests to show the new one
        loadMunicipalityRequests(currentMunicipality);
      });
    });
  }
  
  function handleImageSelection(e) {
    const files = e.target.files;
    
    if (!files || files.length === 0) return;
    
    imagePreview.innerHTML = '';
    selectedImages = Array.from(files);
    
    selectedImages.forEach(file => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'img-preview';
        img.alt = file.name;
        imagePreview.appendChild(img);
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  // Request filtering
  function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active state
        filterButtons.forEach(btn => btn.classList.remove('active', 'bg-indigo-100', 'text-indigo-800'));
        filterButtons.forEach(btn => btn.classList.add('bg-gray-100', 'text-gray-800'));
        button.classList.remove('bg-gray-100', 'text-gray-800');
        button.classList.add('active', 'bg-indigo-100', 'text-indigo-800');
        
        const filter = button.dataset.filter;
        filterRequests(filter);
      });
    });
    
    const muniFilterButtons = document.querySelectorAll('.muni-filter-btn');
    muniFilterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active state
        muniFilterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const filter = button.dataset.filter;
        // This would filter municipal requests in a real app
      });
    });
  }
  
  function filterRequests(filter) {
    const requests = document.querySelectorAll('.request-card');
    
    if (filter === 'all') {
      requests.forEach(request => {
        request.style.display = 'block';
      });
    } else {
      requests.forEach(request => {
        if (request.classList.contains(`${filter}-request`)) {
          request.style.display = 'block';
        } else {
          request.style.display = 'none';
        }
      });
    }
  }
  
  // Initialize the app
  function init() {
    // Auth buttons
    document.getElementById('google-login').addEventListener('click', loginWithGoogle);
    document.getElementById('outlook-login').addEventListener('click', loginWithOutlook);
    document.getElementById('icloud-login').addEventListener('click', loginWithICloud);
    document.getElementById('guest-login').addEventListener('click', continueAsGuest);
    logoutBtn.addEventListener('click', logout);
    loginBtn.addEventListener('click', () => {
      authScreen.classList.remove('hidden');
      appContainer.classList.add('hidden');
    });
    
    // Location functionality
    locateBtn.addEventListener('click', getUserLocation);
    municipalitySelector.addEventListener('change', handleMunicipalitySelection);
    
    // Navigation and form handling
    setupTabNavigation();
    handleRequestForm();
    setupFilters();
    
    // Generate report button
    document.getElementById('generate-report').addEventListener('click', () => {
      Swal.fire({
        title: 'Generando reporte',
        html: 'Preparando su reporte, por favor espere...',
        timer: 2000,
        timerProgressBar: true,
        didOpen: () => {
          Swal.showLoading();
        }
      }).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Reporte generado',
          text: 'El reporte ha sido generado y está listo para descargar.',
          confirmButtonColor: '#667eea'
        });
      });
    });
  }
  
  // Start the application
  init();
});

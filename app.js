/**
 * Smart Weather Dashboard Application Logic
 * Demonstrates Vanilla JS, Fetch API, DOM manipulation, and LocalStorage
 */

// --- Configuration ---
// Note: Usually, API keys should be handled on a backend server to prevent exposure.
// For this frontend-only demo, we insert it directly.
// The user will need to provide their own valid API key from weatherapi.com.
const API_KEY = '7aea627267d64be28f2113703250805';
const BASE_URL = 'https://api.weatherapi.com/v1/forecast.json';

// --- DOM Elements Reference ---
const elements = {
    // Inputs & Forms
    searchForm: document.getElementById('search-form'),
    cityInput: document.getElementById('city-input'),
    errorMsg: document.getElementById('error-message'),

    // UI States
    emptyState: document.getElementById('empty-state'),
    loader: document.getElementById('loading-spinner'),
    dashboard: document.getElementById('weather-dashboard'),

    // Current Weather Elements
    currentCity: document.getElementById('current-city'),
    currentDate: document.getElementById('current-date'),
    currentTemp: document.getElementById('current-temp'),
    currentIcon: document.getElementById('current-icon'),
    currentCondition: document.getElementById('current-condition'),
    currentHumidity: document.getElementById('current-humidity'),
    currentWind: document.getElementById('current-wind'),
    currentFeelsLike: document.getElementById('current-feels-like'),
    currentVisibility: document.getElementById('current-visibility'),

    // Forecast & History Elements
    forecastContainer: document.getElementById('forecast-container'),
    recentSearches: document.getElementById('recent-searches'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),

    // Theme Toggle
    themeToggleBtn: document.getElementById('theme-toggle')
};

// --- State Management ---
let searchHistory = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];

// --- Initialization ---
function init() {
    setupEventListeners();
    loadTheme();
    renderSearchHistory();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Search form submission
    elements.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = elements.cityInput.value.trim();
        if (city) {
            fetchWeatherData(city);
        }
    });

    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Clear history
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
}

// --- Theme Management ---
function loadTheme() {
    const savedTheme = localStorage.getItem('weatherTheme');
    const icon = elements.themeToggleBtn.querySelector('i');

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        icon.classList.replace('fa-moon', 'fa-sun');
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    const icon = elements.themeToggleBtn.querySelector('i');

    if (isDark) {
        document.body.classList.remove('light-theme');
        icon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('weatherTheme', 'dark');
    } else {
        document.body.classList.add('light-theme');
        icon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('weatherTheme', 'light');
    }
}

// --- API Interaction (Fetch Data) ---
async function fetchWeatherData(city) {
    // 1. Update UI state to loading
    showLoadingState();

    try {
        // Prepare URL with query parameters (fetch 5 days of forecast)
        const url = `${BASE_URL}?key=${API_KEY}&q=${encodeURIComponent(city)}&days=5&aqi=no&alerts=no`;

        // 2. Perform Fetch request
        const response = await fetch(url);
        const data = await response.json();

        // 3. Check for API errors (e.g., city not found)
        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch weather data');
        }

        // 4. Update UI with fetched data
        updateDashboard(data);

        // 5. Save successfully searched city to history
        saveSearchHistory(data.location.name);

    } catch (error) {
        console.error('Error fetching weather:', error);
        showErrorState(error.message);
    }
}

// --- UI Updates ---
function updateDashboard(data) {
    elements.errorMsg.classList.add('hidden');
    elements.loader.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');

    // Destructure required data objects
    const { location, current, forecast } = data;

    // Update Current Weather UI
    elements.currentCity.textContent = `${location.name}, ${location.country}`;
    elements.currentDate.textContent = formatDate(location.localtime);

    elements.currentTemp.textContent = Math.round(current.temp_c);

    elements.currentIcon.src = `https:${current.condition.icon}`;
    elements.currentIcon.alt = current.condition.text;
    elements.currentIcon.classList.remove('hidden');

    elements.currentCondition.textContent = current.condition.text;

    elements.currentHumidity.textContent = `${current.humidity}%`;
    elements.currentWind.textContent = `${current.wind_kph} km/h`;
    elements.currentFeelsLike.textContent = `${Math.round(current.feelslike_c)}°C`;
    elements.currentVisibility.textContent = `${current.vis_km} km`;

    // Clear and build 5-day forecast UI
    elements.forecastContainer.innerHTML = '';

    forecast.forecastday.forEach(dayInfo => {
        const dateObj = new Date(dayInfo.date);

        // Create a card for each forecast day
        const card = document.createElement('div');
        card.className = 'step-card';
        card.innerHTML = `
            <div class="forecast-day">${getDayOfWeek(dateObj)}</div>
            <img src="https:${dayInfo.day.condition.icon}" alt="${dayInfo.day.condition.text}" class="forecast-icon">
            <div class="forecast-temp">${Math.round(dayInfo.day.maxtemp_c)}°C</div>
            <div class="forecast-condition">${dayInfo.day.condition.text}</div>
        `;
        elements.forecastContainer.appendChild(card);
    });
}

// --- State Handlers ---
function showLoadingState() {
    elements.errorMsg.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.dashboard.classList.add('hidden');
    elements.loader.classList.remove('hidden');
}

function showErrorState(message) {
    elements.loader.classList.add('hidden');
    // If we have existing weather displayed, keep it, just show error toast
    // If not, revert to empty state
    if (elements.dashboard.classList.contains('hidden')) {
        elements.emptyState.classList.remove('hidden');
    }
    elements.errorMsg.textContent = message === 'No matching location found.' ? 'City not found. Please try again.' : message;
    elements.errorMsg.classList.remove('hidden');
}

// --- LocalStorage History Management ---
function saveSearchHistory(cityName) {
    // Remove if already exists (to prevent duplicates and move to top)
    searchHistory = searchHistory.filter(city => city.toLowerCase() !== cityName.toLowerCase());

    // Add to beginning of array
    searchHistory.unshift(cityName);

    // Keep only top 5 recent searches
    if (searchHistory.length > 5) {
        searchHistory.pop();
    }

    // Save to LocalStorage
    localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistory));

    // Update Sidebar UI
    renderSearchHistory();
}

function renderSearchHistory() {
    elements.recentSearches.innerHTML = '';

    if (searchHistory.length === 0) {
        elements.recentSearches.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">No recent searches</p>';
        elements.clearHistoryBtn.classList.add('hidden');
        return;
    }

    elements.clearHistoryBtn.classList.remove('hidden');

    searchHistory.forEach(city => {
        const btn = document.createElement('button');
        btn.className = 'history-item';
        btn.innerHTML = `
            <span>${city}</span>
            <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem; color: var(--text-secondary);"></i>
        `;

        // Re-fetch weather when history item is clicked
        btn.addEventListener('click', () => {
            elements.cityInput.value = city;
            fetchWeatherData(city);
        });

        elements.recentSearches.appendChild(btn);
    });
}

function clearHistory() {
    searchHistory = [];
    localStorage.removeItem('weatherSearchHistory');
    renderSearchHistory();
}

// --- Utility Functions ---
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, options);
}

function getDayOfWeek(date) {
    // Returns short day name (e.g., 'Mon', 'Tue')
    return date.toLocaleDateString(undefined, { weekday: 'short' });
}

// Boot the application
init();


const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const statusMessage = document.getElementById("status");
const weatherPanel = document.getElementById("weather-panel");

// Convert Open-Meteo weather codes into readable descriptions.
function getWeatherDescription(code) {
    const weatherCodes = {
        0: ["Clear sky", "☀️"],
        1: ["Mainly clear", "🌤️"],
        2: ["Partly cloudy", "⛅"],
        3: ["Overcast", "☁️"],
        45: ["Fog", "🌫️"],
        48: ["Depositing rime fog", "🌫️"],
        51: ["Light drizzle", "🌦️"],
        53: ["Moderate drizzle", "🌦️"],
        55: ["Dense drizzle", "🌧️"],
        56: ["Light freezing drizzle", "🌧️"],
        57: ["Dense freezing drizzle", "🌧️"],
        61: ["Slight rain", "🌦️"],
        63: ["Moderate rain", "🌧️"],
        65: ["Heavy rain", "🌧️"],
        66: ["Light freezing rain", "🌧️"],
        67: ["Heavy freezing rain", "🌧️"],
        71: ["Slight snowfall", "🌨️"],
        73: ["Moderate snowfall", "🌨️"],
        75: ["Heavy snowfall", "❄️"],
        77: ["Snow grains", "❄️"],
        80: ["Slight rain showers", "🌦️"],
        81: ["Moderate rain showers", "🌧️"],
        82: ["Violent rain showers", "⛈️"],
        85: ["Slight snow showers", "🌨️"],
        86: ["Heavy snow showers", "❄️"],
        95: ["Thunderstorm", "⛈️"],
        96: ["Thunderstorm with slight hail", "⛈️"],
        99: ["Thunderstorm with heavy hail", "⛈️"]
    };

    return weatherCodes[code] || ["Unknown conditions", "🌡️"];
}

// Safely display status messages.
function setStatus(message) {
    statusMessage.textContent = message;
}

// Fetch city coordinates using the Geocoding API.
async function getCityCoordinates(city) {
    const url = new URL(
        "https://geocoding-api.open-meteo.com/v1/search"
    );

    url.search = new URLSearchParams({
        name: city,
        count: "1",
        language: "en",
        format: "json"
    });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `City search failed (HTTP ${response.status}).`
        );
    }

    const data = await response.json();

    if (!Array.isArray(data.results) || data.results.length === 0) {
        throw new Error(
            "City not found. Please check the spelling and try again."
        );
    }

    return data.results[0];
}

// Fetch the current weather for the selected coordinates.
async function getWeather(latitude, longitude) {
    const url = new URL(
        "https://api.open-meteo.com/v1/forecast"
    );

    url.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "weather_code",
            "wind_speed_10m"
        ].join(","),
        timezone: "auto"
    });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Weather request failed (HTTP ${response.status}).`
        );
    }

    const data = await response.json();

    // Validate the nested JSON data before using it.
    if (
        !data.current ||
        typeof data.current.temperature_2m !== "number" ||
        typeof data.current.relative_humidity_2m !== "number" ||
        typeof data.current.wind_speed_10m !== "number"
    ) {
        throw new Error("Weather data is incomplete. Please try again.");
    }

    return data;
}

// Render the returned JSON data on the dashboard.
function displayWeather(place, data) {
    const current = data.current;
    const [description, icon] =
        getWeatherDescription(current.weather_code);

    const locationParts = [
        place.name,
        place.admin1,
        place.country
    ].filter((part, index, parts) =>
        part && parts.indexOf(part) === index
    );

    document.getElementById("city-name").textContent =
        locationParts.join(", ");

    document.getElementById("temperature").textContent =
        `${Math.round(current.temperature_2m)}°C`;

    document.getElementById("description").textContent =
        description;

    document.getElementById("weather-icon").textContent = icon;

    document.getElementById("humidity").textContent =
        `${current.relative_humidity_2m}%`;

    document.getElementById("wind-speed").textContent =
        `${current.wind_speed_10m} km/h`;

    const feelsLike = current.apparent_temperature;

    document.getElementById("feels-like").textContent =
        typeof feelsLike === "number"
            ? `${Math.round(feelsLike)}°C`
            : "N/A";

    document.getElementById("local-time").textContent =
        current.time
            ? `Local time: ${current.time.replace("T", " ")}`
            : "";

    document.getElementById("updated").textContent =
        `Weather data timestamp: ${current.time || "Unavailable"}`
        + ` | Time zone: ${data.timezone || "Local time"}`;

    weatherPanel.hidden = false;
}

// Main asynchronous search function.
async function searchWeather(city) {
    searchButton.disabled = true;
    searchButton.textContent = "Loading...";
    weatherPanel.hidden = true;

    try {
        setStatus("Searching for city and fetching weather...");

        // Step 1: Find the city and its coordinates.
        const place = await getCityCoordinates(city);

        // Step 2: Fetch weather using the coordinates.
        const weatherData = await getWeather(
            place.latitude,
            place.longitude
        );

        // Step 3: Render the JSON data.
        displayWeather(place, weatherData);

        setStatus("Weather information loaded successfully.");
    } catch (error) {
        console.error("Weather dashboard error:", error);

        if (error instanceof TypeError) {
            setStatus(
                "Network error. Check your internet connection "
                + "and try again."
            );
        } else {
            setStatus(
                error.message || "Something went wrong. Please try again."
            );
        }
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Search";
    }
}

// Search when the user submits the form.
searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (!city) {
        setStatus("Please enter a city name.");
        cityInput.focus();
        return;
    }

    searchWeather(city);
});

// Load a default city when the page opens.
searchWeather("Meerut");

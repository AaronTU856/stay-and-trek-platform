# 🌦️ Weather Map Project

A Django-based web application that displays real-time weather information for selected cities using the **OpenWeatherMap API**.  
This project serves as a modular component for future integration into the **Stay & Trek web mapping system**.

---

## 🚀 Features

- Fetches live weather data via OpenWeatherMap API.
- Displays temperature, humidity, wind speed, and conditions per city.
- Provides a clean map interface (Leaflet-ready) for visual context.
- Built with scalability in mind — can integrate with geospatial data (e.g. trails, routes).
- Configurable via `.env` for secure API key management.

---

## 🧱 Tech Stack

| Component | Technology |
|------------|-------------|
| **Backend** | Django 5.x |
| **Frontend** | HTML, Bootstrap |
| **API** | OpenWeatherMap |
| **Database** | SQLite (default) / PostgreSQL (optional) |
| **Deployment** | Google Cloud Run / Docker |
| **Secrets Management** | python-decouple |

---

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AaronTU856/weather_map_project.git
   cd weather_map_project

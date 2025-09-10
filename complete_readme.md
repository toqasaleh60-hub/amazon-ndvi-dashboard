# 🌱 Amazon NDVI Dashboard

**Interactive vegetation analysis dashboard for the Amazon rainforest using Google Earth Engine and Sentinel-2 satellite data.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-green.svg)](https://your-app.netlify.app)
[![Backend API](https://img.shields.io/badge/API-Docs-blue.svg)](https://your-api.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repo-black.svg)](https://github.com/yourusername/amazon-ndvi-dashboard)

## 🌟 Features Overview

### ✅ **Core Requirements Implemented**
- **🗺️ Interactive Leaflet.js Map**: Toggle between OpenStreetMap and Satellite base layers
- **🛰️ Google Earth Engine Integration**: Real-time NDVI data from Sentinel-2 (COPERNICUS/S2_SR)
- **🌍 Amazon Rainforest Focus**: Dedicated AOI with precise boundary visualization
- **📅 Temporal Analysis**: Month-by-month NDVI filtering (last 12 months)
- **🎯 Pixel-Level Analysis**: Click anywhere to get precise NDVI values
- **🎨 Professional Legend**: Color-coded vegetation interpretation guide
- **☁️ Cloud Masking**: Advanced quality filtering using QA60 band

### 🎁 **Bonus Features Included**
- **📈 Time Series Charts**: 12-month NDVI trends for clicked locations
- **📊 Statistical Analysis**: Mean, min, max, and count calculations
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **⚡ Loading States**: Professional UX with animated loading indicators
- **🎭 Demo Mode**: Fallback functionality when GEE is unavailable
- **🚀 Production Ready**: Complete deployment configuration

## 🛠️ Technology Stack

### **Backend**
- **Python 3.9+** with Flask framework
- **Google Earth Engine API** for satellite data processing
- **Flask-CORS** for cross-origin requests
- **Gunicorn** for production deployment

### **Frontend** 
- **React 18** with modern Hooks
- **Leaflet.js 1.9** for interactive mapping
- **Axios** for API communication
- **Modern CSS3** with animations and responsive design

### **Deployment**
- **Frontend**: Netlify (CDN + Static hosting)
- **Backend**: Vercel (Serverless Python functions)
- **Version Control**: Git/GitHub with comprehensive .gitignore

## 📋 Project Structure

```
amazon-ndvi-dashboard/
├── backend/
│   ├── app.py                    # Main Flask application
│   ├── requirements.txt          # Python dependencies
│   ├── vercel.json              # Vercel deployment config
│   └── .env.example             # Environment variables template
├── frontend/
│   ├── public/
│   │   ├── index.html           # HTML template
│   │   └── manifest.json        # PWA configuration
│   ├── src/
│   │   ├── App.js               # Main React component
│   │   ├── App.css              # Complete styling
│   │   └── index.js             # React entry point
│   ├── package.json             # Node.js dependencies
│   └── netlify.toml             # Netlify deployment config
├── README.md                    # This documentation
├── .gitignore                   # Git ignore rules
└── screenshots/                 # Application screenshots
    ├── dashboard.png
    ├── analysis.png
    └── mobile.png
```

## 🚀 Quick Start Guide

### **Prerequisites**
- Node.js 16+ and npm
- Python 3.9+ and pip
- Google Cloud Platform account
- Google Earth Engine access (free signup at [earthengine.google.com](https://earthengine.google.com))

### **1. Clone Repository**
```bash
git clone https://github.com/yourusername/amazon-ndvi-dashboard.git
cd amazon-ndvi-dashboard
```

### **2. Backend Setup**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### **3. Google Earth Engine Setup**
1. Create a Google Cloud Project
2. Enable the Earth Engine API
3. Create a service account with Earth Engine permissions
4. Download the service account key as `service-account-key.json`
5. Place the key file in the `backend/` directory

### **4. Frontend Setup**
```bash
cd ../frontend
npm install
```

### **5. Environment Configuration**

**Backend** (create `backend/.env`):
```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
GOOGLE_APPLICATION_CREDENTIALS=service-account-key.json
```

**Frontend** (create `frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:5000
```

### **6. Run Locally**
```bash
# Terminal 1 - Start Backend
cd backend
python app.py

# Terminal 2 - Start Frontend
cd frontend
npm start
```

Visit **http://localhost:3000** to see your dashboard! 🎉

## 🌍 Google Earth Engine Implementation

### **Data Source Configuration**
- **Dataset**: Sentinel-2 Surface Reflectance (`COPERNICUS/S2_SR`)
- **Spatial Resolution**: 10m for NDVI bands (B4-Red, B8-NIR)
- **Temporal Coverage**: Last 12 months with monthly aggregation
- **Quality Filtering**: < 20% cloud coverage per scene

### **NDVI Processing Pipeline**
```python
# 1. Cloud Masking using QA60 band
def mask_s2_clouds(image):
    qa = image.select('QA60')
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(
           qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    return image.updateMask(mask)

# 2. NDVI Calculation
def add_ndvi_band(image):
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    return image.addBands(ndvi)

# 3. Temporal Aggregation
ndvi_composite = collection.select('NDVI').median()
```

### **Amazon Region Definition**
- **Bounding Box**: 74°W to 50°W, 10°S to 5°N
- **Coverage**: ~6.7 million km² of Amazon Basin
- **Countries**: Brazil, Peru, Colombia, Venezuela, Ecuador, Bolivia, Guyana, Suriname, French Guiana

## 🎨 User Interface Guide

### **Map Controls**
- **Base Layer Toggle**: Switch between Street and Satellite views
- **Zoom Controls**: Mouse wheel, +/- buttons, or pinch on mobile
- **Pan Navigation**: Click and drag to explore the region
- **Amazon Boundary**: Orange dashed rectangle shows the study area

### **Analysis Workflow**
1. **📅 Select Month**: Use the date picker to choose your analysis period
2. **🎯 Click to Analyze**: Click anywhere within the Amazon boundary
3. **📊 View Results**: Instant NDVI values with vegetation interpretation
4. **📈 Explore Trends**: Toggle time series charts for temporal analysis

### **NDVI Interpretation Guide**
| NDVI Range | Color | Vegetation Type | Description |
|------------|-------|-----------------|-------------|
| 0.0 - 0.2 | 🔴 Red | Bare Soil/Water | Non-vegetated areas, rivers, cleared land |
| 0.2 - 0.4 | 🟡 Yellow | Sparse Vegetation | Agricultural areas, grasslands, degraded forest |
| 0.4 - 0.6 | 🟢 Light Green | Moderate Vegetation | Secondary forest, mixed vegetation |
| 0.6 - 1.0 | 🌲 Dark Green | Dense Vegetation | Primary rainforest, intact canopy |

## 📊 API Documentation

### **Base URL**
- Development: `http://localhost:5000`
- Production: `https://your-backend.vercel.app`

### **Endpoints**

#### **GET /** - Health Check
```json
{
  "status": "healthy",
  "message": "Amazon NDVI Dashboard API",
  "earth_engine": true,
  "endpoints": ["GET /api/ndvi", "POST /api/pixel-value", "POST /api/time-series"]
}
```

#### **GET /api/ndvi** - Get NDVI Tiles
**Parameters:**
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "tile_url": "https://earthengine.googleapis.com/v1alpha/...",
    "bounds": {...},
    "data_info": {
      "dataset": "COPERNICUS/S2_SR",
      "parameter": "NDVI",
      "region": "Amazon Rainforest"
    }
  }
}
```

#### **POST /api/pixel-value** - Analyze Pixel
**Request Body:**
```json
{
  "lat": -3.1190,
  "lng": -60.0217,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Response:**
```json
{
  "success": true,
  "ndvi": 0.847,
  "coordinates": {"lat": -3.1190, "lng": -60.0217},
  "interpretation": "Dense vegetation",
  "location_info": "Central Amazon Basin"
}
```

#### **POST /api/time-series** - Get Time Series
**Request Body:**
```json
{
  "lat": -3.1190,
  "lng": -60.0217
}
```

**Response:**
```json
{
  "success": true,
  "time_series": [
    {"date": "2023-01", "ndvi": 0.821},
    {"date": "2023-02", "ndvi": 0.834},
    ...
  ],
  "statistics": {
    "mean": 0.847,
    "min": 0.792,
    "max": 0.891,
    "count": 12
  }
}
```

## 🚀 Deployment Instructions

### **Backend Deployment (Vercel)**

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy Backend:**
```bash
cd backend
vercel login
vercel --prod
```

3. **Configure Environment Variables:**
   - Go to Vercel dashboard → Settings → Environment Variables
   - Add `GOOGLE_APPLICATION_CREDENTIALS` with your service account JSON content

### **Frontend Deployment (Netlify)**

1. **Build Application:**
```bash
cd frontend
npm run build
```

2. **Deploy via Netlify CLI:**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=build
```

3. **Configure Environment:**
   - Update `REACT_APP_API_URL` to your Vercel backend URL
   - Rebuild and redeploy

### **Alternative: Git-based Deployment**

1. **Push to GitHub:**
```bash
git add .
git commit -m "Deploy Amazon NDVI Dashboard"
git push origin main
```

2. **Connect Repositories:**
   - **Vercel**: Connect your GitHub repo, set root directory to `backend/`
   - **Netlify**: Connect your GitHub repo, set base directory to `frontend/`, build command to `npm run build`, publish directory to `build/`

## 📈 Performance & Scalability

### **Optimization Features**
- **GEE Caching**: Earth Engine handles server-side tile caching
- **Lazy Loading**: Map tiles load on-demand as users navigate
- **Debounced Interactions**: Prevents excessive API calls during user interaction
- **Responsive Images**: Optimized loading for different screen sizes
- **Error Boundaries**: Graceful fallback when components fail

### **Monitoring & Analytics**
- **Health Check Endpoint**: Monitor API availability
- **Error Logging**: Comprehensive error tracking and reporting
- **Performance Metrics**: Loading times and user interaction tracking
- **Usage Statistics**: API endpoint usage and geographic analysis patterns

## 🧪 Testing & Quality Assurance

### **Testing Strategy**
- **Unit Tests**: Core functions and API endpoints
- **Integration Tests**: Frontend-backend communication
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Load testing for API endpoints
- **Mobile Testing**: Responsive design across devices

### **Code Quality**
- **ESLint**: JavaScript code linting and formatting
- **Python Black**: Python code formatting
- **Git Hooks**: Pre-commit code quality checks
- **Documentation**: Comprehensive inline comments

## 🔐 Security & Best Practices

### **Security Measures**
- **Environment Variables**: Sensitive data stored securely
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Server-side validation of all inputs
- **Rate Limiting**: API endpoint protection against abuse
- **HTTPS Enforcement**: All production traffic encrypted

### **Best Practices**
- **Semantic Versioning**: Proper version management
- **Error Handling**: Graceful degradation and user-friendly error messages
- **Accessibility**: WCAG 2.1 compliant design
- **SEO Optimization**: Meta tags and semantic HTML structure

## 🤝 Contributing & Development

### **Development Workflow**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper testing
4. Commit with descriptive messages (`git commit -m 'Add amazing
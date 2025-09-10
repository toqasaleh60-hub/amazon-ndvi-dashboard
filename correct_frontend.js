import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './App.css';

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// NDVI Legend Component
const NDVILegend = () => {
  const legendItems = [
    { color: '#d73027', label: '0.0 - 0.2: Bare Soil/Built Areas', range: [0, 0.2] },
    { color: '#fdae61', label: '0.2 - 0.4: Sparse Vegetation', range: [0.2, 0.4] },
    { color: '#abdda4', label: '0.4 - 0.6: Moderate Vegetation', range: [0.4, 0.6] },
    { color: '#3288bd', label: '0.6 - 1.0: Dense Vegetation', range: [0.6, 1.0] }
  ];

  return (
    <div className="ndvi-legend">
      <h3>🎨 NDVI Legend</h3>
      <div className="legend-items">
        {legendItems.map((item, index) => (
          <div key={index} className="legend-item">
            <span 
              className="legend-color" 
              style={{ backgroundColor: item.color }}
            ></span>
            <span className="legend-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Time Series Chart Component
const TimeSeriesChart = ({ data, coordinates }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !chartRef.current) return;

    // Clear previous chart
    chartRef.current.innerHTML = '';

    // Simple SVG chart
    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'time-series-chart');
    
    // Create scales
    const xScale = (i) => margin.left + (i / (data.length - 1)) * (width - margin.left - margin.right);
    const yScale = (value) => height - margin.bottom - (value * (height - margin.top - margin.bottom));
    
    // Draw grid lines
    for (let i = 0; i <= 10; i++) {
      const y = height - margin.bottom - (i / 10) * (height - margin.top - margin.bottom);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', margin.left);
      line.setAttribute('y1', y);
      line.setAttribute('x2', width - margin.right);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#e0e0e0');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
    
    // Draw line
    let pathData = '';
    data.forEach((point, index) => {
      const x = xScale(index);
      const y = yScale(point.ndvi);
      
      if (index === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
      
      // Add circle for each point
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', '#4a7c59');
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);
    });
    
    // Add path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', '#4a7c59');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
    
    // Add labels
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', width / 2);
    title.setAttribute('y', 15);
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('font-size', '14');
    title.setAttribute('font-weight', 'bold');
    title.textContent = `NDVI Time Series (${coordinates.lat.toFixed(2)}, ${coordinates.lng.toFixed(2)})`;
    svg.appendChild(title);
    
    chartRef.current.appendChild(svg);
  }, [data, coordinates]);

  if (!data || data.length === 0) {
    return <div className="no-chart">No time series data available</div>;
  }

  return (
    <div className="time-series-container">
      <div ref={chartRef}></div>
    </div>
  );
};

// Main Map Component with Leaflet
const LeafletMap = ({ ndviData, onMapClick, selectedDate, loading }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const ndviLayerRef = useRef(null);
  const [baseLayerType, setBaseLayerType] = useState('osm');

  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      // Initialize Leaflet map
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [-2.5, -62], // Amazon center
        zoom: 6,
        zoomControl: true
      });

      // Add base layers
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        id: 'osm'
      });

      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Esri, DigitalGlobe, GeoEye, Earthstar Geographics',
          id: 'satellite'
        }
      );

      // Add default layer
      osmLayer.addTo(mapInstanceRef.current);
      mapInstanceRef.current.currentBaseLayer = osmLayer;
      mapInstanceRef.current.osmLayer = osmLayer;
      mapInstanceRef.current.satelliteLayer = satelliteLayer;

      // Add Amazon boundary
      const amazonBounds = L.rectangle(
        [[-10, -74], [5, -50]],
        {
          color: '#ff7800',
          weight: 3,
          fillOpacity: 0.1,
          dashArray: '10, 10'
        }
      ).addTo(mapInstanceRef.current);

      amazonBounds.bindPopup(
        '<strong>Amazon Rainforest Region</strong><br>Click anywhere inside to analyze NDVI values'
      );

      // Add click event
      mapInstanceRef.current.on('click', (e) => {
        onMapClick(e.latlng);
      });

      // Add custom control for base layer toggle
      const LayerControl = L.Control.extend({
        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
          container.style.backgroundColor = 'white';
          container.style.padding = '5px';
          container.innerHTML = `
            <button id="osm-btn" class="layer-btn active" style="margin-right: 5px; padding: 5px 10px; border: none; cursor: pointer; border-radius: 3px;">Street</button>
            <button id="satellite-btn" class="layer-btn" style="padding: 5px 10px; border: none; cursor: pointer; border-radius: 3px;">Satellite</button>
          `;
          
          container.onclick = (e) => {
            e.stopPropagation();
            if (e.target.id === 'osm-btn') {
              switchToOSM();
              setBaseLayerType('osm');
            } else if (e.target.id === 'satellite-btn') {
              switchToSatellite();
              setBaseLayerType('satellite');
            }
          };
          
          return container;
        }
      });

      new LayerControl({ position: 'topright' }).addTo(mapInstanceRef.current);

      const switchToOSM = () => {
        if (mapInstanceRef.current.currentBaseLayer !== mapInstanceRef.current.osmLayer) {
          mapInstanceRef.current.removeLayer(mapInstanceRef.current.currentBaseLayer);
          mapInstanceRef.current.addLayer(mapInstanceRef.current.osmLayer);
          mapInstanceRef.current.currentBaseLayer = mapInstanceRef.current.osmLayer;
        }
        updateButtonStyles('osm');
      };

      const switchToSatellite = () => {
        if (mapInstanceRef.current.currentBaseLayer !== mapInstanceRef.current.satelliteLayer) {
          mapInstanceRef.current.removeLayer(mapInstanceRef.current.currentBaseLayer);
          mapInstanceRef.current.addLayer(mapInstanceRef.current.satelliteLayer);
          mapInstanceRef.current.currentBaseLayer = mapInstanceRef.current.satelliteLayer;
        }
        updateButtonStyles('satellite');
      };

      const updateButtonStyles = (active) => {
        const osmBtn = document.getElementById('osm-btn');
        const satBtn = document.getElementById('satellite-btn');
        
        if (osmBtn && satBtn) {
          osmBtn.classList.toggle('active', active === 'osm');
          satBtn.classList.toggle('active', active === 'satellite');
          
          osmBtn.style.backgroundColor = active === 'osm' ? '#4a7c59' : '#f0f0f0';
          osmBtn.style.color = active === 'osm' ? 'white' : 'black';
          satBtn.style.backgroundColor = active === 'satellite' ? '#4a7c59' : '#f0f0f0';
          satBtn.style.color = active === 'satellite' ? 'white' : 'black';
        }
      };

      // Initialize button styles
      setTimeout(() => updateButtonStyles('osm'), 100);
    }

    // Handle NDVI layer updates
    if (ndviData?.data?.tile_url && mapInstanceRef.current) {
      // Remove existing NDVI layer
      if (ndviLayerRef.current) {
        mapInstanceRef.current.removeLayer(ndviLayerRef.current);
      }

      // Add new NDVI layer
      ndviLayerRef.current = L.tileLayer(ndviData.data.tile_url, {
        opacity: 0.7,
        attribution: 'Google Earth Engine - Sentinel-2'
      });

      ndviLayerRef.current.addTo(mapInstanceRef.current);

      // Fit bounds to Amazon region
      if (ndviData.data.bounds) {
        const bounds = ndviData.data.bounds.coordinates[0];
        mapInstanceRef.current.fitBounds([
          [bounds[0][1], bounds[0][0]],
          [bounds[2][1], bounds[2][0]]
        ]);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [ndviData, onMapClick]);

  return (
    <div className="map-container">
      <div 
        ref={mapRef} 
        className="leaflet-map"
        style={{ height: '500px', width: '100%', borderRadius: '10px' }}
      />
      {loading && (
        <div className="map-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Loading NDVI data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
function App() {
  const [ndviData, setNdviData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pixelInfo, setPixelInfo] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  });
  const [showTimeSeries, setShowTimeSeries] = useState(false);

  // Load NDVI data
  const loadNDVIData = async (date) => {
    setLoading(true);
    setError(null);
    
    try {
      const startDate = `${date}-01`;
      const endOfMonth = new Date(date + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endDate = endOfMonth.toISOString().slice(0, 10);

      const response = await axios.get(`${API_BASE_URL}/api/ndvi`, {
        params: { start_date: startDate, end_date: endDate },
        timeout: 30000
      });

      setNdviData(response.data);
      
      if (response.data.demo_mode) {
        setError('Demo Mode: Google Earth Engine not available. Showing Amazon region boundary.');
      }
      
    } catch (err) {
      console.error('Error loading NDVI data:', err);
      setError(`Error loading data: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle map clicks
  const handleMapClick = async (latlng) => {
    setPixelInfo({ loading: true, coordinates: latlng });
    
    try {
      // Get pixel value
      const startDate = `${selectedDate}-01`;
      const endOfMonth = new Date(selectedDate + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endDate = endOfMonth.toISOString().slice(0, 10);

      const pixelResponse = await axios.post(`${API_BASE_URL}/api/pixel-value`, {
        lat: latlng.lat,
        lng: latlng.lng,
        start_date: startDate,
        end_date: endDate
      });

      setPixelInfo({
        loading: false,
        coordinates: latlng,
        ...pix
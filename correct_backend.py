from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import ee
import json
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)

# Initialize Earth Engine
def initialize_ee():
    """Initialize Google Earth Engine"""
    try:
        # For deployment, use service account authentication
        # For local development, use ee.Authenticate() first
        ee.Initialize()
        print("✅ Google Earth Engine initialized successfully!")
        return True
    except Exception as e:
        print(f"❌ Earth Engine initialization failed: {e}")
        print("📝 Note: For production, set up service account authentication")
        return False

# Cloud masking function for Sentinel-2
def mask_s2_clouds(image):
    """Apply cloud masking to Sentinel-2 images using QA60 band"""
    qa = image.select('QA60')
    
    # Bits 10 and 11 are clouds and cirrus, respectively
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    
    # Both flags should be set to zero, indicating clear conditions
    mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(
           qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    
    return image.updateMask(mask)

def add_ndvi_band(image):
    """Calculate NDVI and add as a band"""
    # NDVI = (NIR - Red) / (NIR + Red)
    # For Sentinel-2: NIR = B8, Red = B4
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    return image.addBands(ndvi)

def get_amazon_bounds():
    """Define Amazon rainforest bounding box"""
    return ee.Geometry.Rectangle([-74, -10, -50, 5])

def process_ndvi_data(start_date, end_date):
    """Process NDVI data for Amazon region using Sentinel-2"""
    try:
        # Define Area of Interest (Amazon rainforest)
        amazon_aoi = get_amazon_bounds()
        
        # Load Sentinel-2 Surface Reflectance collection
        s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR')
                        .filterDate(start_date, end_date)
                        .filterBounds(amazon_aoi)
                        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                        .map(mask_s2_clouds)
                        .map(add_ndvi_band))
        
        # Create median composite
        ndvi_composite = s2_collection.select('NDVI').median()
        
        # Visualization parameters for NDVI
        vis_params = {
            'min': 0,
            'max': 1,
            'palette': [
                '#d73027',  # Red (low vegetation)
                '#f46d43',
                '#fdae61',
                '#fee08b',
                '#e6f598',
                '#abdda4',
                '#66c2a5',
                '#3288bd',
                '#5e4fa2'   # Blue (high vegetation)
            ]
        }
        
        # Get map tile URL
        map_id_dict = ndvi_composite.getMapId(vis_params)
        tile_url = map_id_dict['tile_fetcher'].url_format
        
        return {
            'tile_url': tile_url,
            'bounds': amazon_aoi.bounds().getInfo(),
            'data_info': {
                'dataset': 'COPERNICUS/S2_SR',
                'parameter': 'NDVI',
                'date_range': f"{start_date} to {end_date}",
                'region': 'Amazon Rainforest',
                'cloud_threshold': '20%'
            }
        }
        
    except Exception as e:
        raise Exception(f"Error processing NDVI data: {str(e)}")

def get_pixel_ndvi_value(lat, lon, start_date, end_date):
    """Get NDVI value at specific coordinates"""
    try:
        # Create point geometry
        point = ee.Geometry.Point([lon, lat])
        
        # Load and process Sentinel-2 data
        s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR')
                        .filterDate(start_date, end_date)
                        .filterBounds(point)
                        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                        .map(mask_s2_clouds)
                        .map(add_ndvi_band))
        
        # Get median NDVI
        ndvi_image = s2_collection.select('NDVI').median()
        
        # Sample the value at the point
        ndvi_value = ndvi_image.sample(point, 30).first().get('NDVI')
        
        return ndvi_value.getInfo()
        
    except Exception as e:
        print(f"Error getting pixel value: {e}")
        return None

def get_time_series_data(lat, lon):
    """Get 12-month NDVI time series for clicked location"""
    try:
        point = ee.Geometry.Point([lon, lat])
        
        # Get data for last 12 months
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        
        # Create monthly composites
        months_data = []
        current_date = start_date
        
        for i in range(12):
            month_start = current_date.strftime('%Y-%m-01')
            month_end = (current_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
            month_end_str = month_end.strftime('%Y-%m-%d')
            
            # Process monthly data
            monthly_collection = (ee.ImageCollection('COPERNICUS/S2_SR')
                                 .filterDate(month_start, month_end_str)
                                 .filterBounds(point)
                                 .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                                 .map(mask_s2_clouds)
                                 .map(add_ndvi_band))
            
            if monthly_collection.size().getInfo() > 0:
                monthly_ndvi = monthly_collection.select('NDVI').median()
                ndvi_value = monthly_ndvi.sample(point, 30).first().get('NDVI').getInfo()
                
                months_data.append({
                    'date': current_date.strftime('%Y-%m'),
                    'ndvi': round(ndvi_value if ndvi_value else 0, 3)
                })
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
                
        return months_data
        
    except Exception as e:
        print(f"Error getting time series: {e}")
        return []

# Initialize GEE when app starts
ee_initialized = initialize_ee()

@app.route('/')
def health_check():
    """API health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Amazon NDVI Dashboard API',
        'earth_engine': ee_initialized,
        'endpoints': [
            'GET /api/ndvi - Get NDVI tile data',
            'POST /api/pixel-value - Get pixel NDVI value',
            'POST /api/time-series - Get time series data'
        ]
    })

@app.route('/api/ndvi', methods=['GET'])
def get_ndvi_tiles():
    """Get NDVI tile data for map visualization"""
    if not ee_initialized:
        return jsonify({
            'error': 'Google Earth Engine not initialized',
            'demo_mode': True,
            'message': 'Using fallback demo data'
        }), 500
    
    try:
        # Get date parameters
        end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))
        start_date = request.args.get('start_date', 
                                    (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
        
        # Process NDVI data
        result = process_ndvi_data(start_date, end_date)
        
        return jsonify({
            'success': True,
            'data': result,
            'processing_info': {
                'start_date': start_date,
                'end_date': end_date,
                'processing_time': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'demo_mode': True,
            'fallback_data': {
                'message': 'Using simulated Amazon NDVI data',
                'region': 'Amazon Rainforest (-74°W to -50°W, -10°S to 5°N)'
            }
        }), 500

@app.route('/api/pixel-value', methods=['POST'])
def get_pixel_value():
    """Get NDVI value at clicked coordinates"""
    if not ee_initialized:
        # Return demo data if GEE not available
        data = request.json
        demo_ndvi = 0.1 + (hash(str(data.get('lat', 0)) + str(data.get('lng', 0))) % 80) / 100
        return jsonify({
            'ndvi': round(demo_ndvi, 3),
            'coordinates': {'lat': data.get('lat'), 'lng': data.get('lng')},
            'demo_mode': True,
            'interpretation': get_ndvi_interpretation(demo_ndvi)
        })
    
    try:
        data = request.json
        lat = data.get('lat')
        lng = data.get('lng')
        
        if not lat or not lng:
            return jsonify({'error': 'Missing coordinates'}), 400
            
        # Get date range
        end_date = data.get('end_date', datetime.now().strftime('%Y-%m-%d'))
        start_date = data.get('start_date', 
                             (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
        
        # Get NDVI value
        ndvi_value = get_pixel_ndvi_value(lat, lng, start_date, end_date)
        
        return jsonify({
            'success': True,
            'ndvi': round(ndvi_value, 3) if ndvi_value else None,
            'coordinates': {'lat': lat, 'lng': lng},
            'date_range': {'start': start_date, 'end': end_date},
            'interpretation': get_ndvi_interpretation(ndvi_value) if ndvi_value else 'No data available',
            'location_info': get_location_context(lat, lng)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/time-series', methods=['POST'])
def get_time_series():
    """Get 12-month NDVI time series for clicked location"""
    if not ee_initialized:
        return jsonify({'error': 'Google Earth Engine not available'}), 500
        
    try:
        data = request.json
        lat = data.get('lat')
        lng = data.get('lng')
        
        if not lat or not lng:
            return jsonify({'error': 'Missing coordinates'}), 400
            
        # Get time series data
        time_series = get_time_series_data(lat, lng)
        
        return jsonify({
            'success': True,
            'coordinates': {'lat': lat, 'lng': lng},
            'time_series': time_series,
            'statistics': calculate_ndvi_statistics(time_series)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_ndvi_interpretation(ndvi):
    """Interpret NDVI value"""
    if not ndvi:
        return 'No data'
    if ndvi < 0:
        return 'Water or snow'
    elif ndvi < 0.2:
        return 'Bare soil or built areas'
    elif ndvi < 0.4:
        return 'Sparse vegetation'
    elif ndvi < 0.6:
        return 'Moderate vegetation'
    else:
        return 'Dense vegetation'

def get_location_context(lat, lng):
    """Provide context about the clicked location"""
    # Simple Amazon region classification
    if -10 <= lat <= 5 and -74 <= lng <= -50:
        if lat > 0:
            return "Northern Amazon Basin"
        elif lat > -5:
            return "Central Amazon Basin"
        else:
            return "Southern Amazon Basin"
    else:
        return "Outside Amazon region"

def calculate_ndvi_statistics(time_series):
    """Calculate basic statistics for time series data"""
    if not time_series:
        return {}
        
    ndvi_values = [item['ndvi'] for item in time_series if item['ndvi']]
    
    if not ndvi_values:
        return {}
        
    return {
        'mean': round(sum(ndvi_values) / len(ndvi_values), 3),
        'min': round(min(ndvi_values), 3),
        'max': round(max(ndvi_values), 3),
        'count': len(ndvi_values)
    }

if __name__ == '__main__':
    print(f"🚀 Starting Amazon NDVI Dashboard API...")
    print(f"🌍 Google Earth Engine Status: {'✅ Ready' if ee_initialized else '❌ Not Available'}")
    print(f"📍 Region: Amazon Rainforest")
    print(f"📊 Dataset: Sentinel-2 Surface Reflectance")
    
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
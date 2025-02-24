const { createClient } = require('@supabase/supabase-js');
const mongoose = require('mongoose');

// Create Supabase client
const supabase = createClient(
  "https://vnyygeccunmwcpjqnyjt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueXlnZWNjdW5td2NwanFueWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjQ0MTcsImV4cCI6MjA1NTc0MDQxN30.wZKQGKDtmu4eB66RThoelIyGDMxfvCinfDvDDd1EVyc"
);

// Define health thresholds for anomaly detection
const HEALTH_THRESHOLDS = {
  heart_rate: {
    min: 80,
    max: 120,
    critical_min: 70,
    critical_max: 130,
    name: "Heart Rate",
    unit: "BPM"
  },
  spo2: {
    min: 93,
    max: 100,
    critical_min: 90,
    critical_max: 100,
    name: "SpO2",
    unit: "%"
  },
  temperature: {
    min: 36.5,
    max: 37.5,
    critical_min: 35.0,
    critical_max: 39.0,
    name: "Temperature",
    unit: "°C"
  }
};

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ai-prescription', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Define Alert Schema
const AlertSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['CRITICAL', 'WARNING'] },
  severity: { type: String, required: true, enum: ['high', 'medium', 'low'] },
  message: { type: String, required: true },
  parameter: { type: String, required: true },
  value: { type: Number, required: true },
  threshold: { type: Number, required: true }
});

// Enhanced HealthData Schema with alerts
const HealthDataSchema = new mongoose.Schema({
  heart_rate: { type: Number, required: true },
  spo2: { type: Number, required: true },
  temperature: { type: Number, required: true },
  steps: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
  alerts: [AlertSchema] // Use the AlertSchema for the alerts array
});

const HealthData = mongoose.model('HealthData', HealthDataSchema);

// Base values for simulation
let currentSteps = 0;
let lastHeartRate = 75;
let lastSpO2 = 98;
let lastTemperature = 36.8;
let lastUpdateTime = null;

// Set to track shown alerts
const shownAlerts = new Set();

// Helper function to get random value with max change
function getNextValue(current, min, max, maxChange) {
  const change = (Math.random() * maxChange * 2) - maxChange;
  const next = current + change;
  return Math.min(Math.max(next, min), max);
}

// Function to check for anomalies and generate alerts
function checkAnomalies(data) {
  const alerts = [];

  for (const [param, value] of Object.entries(data)) {
    if (param === 'steps' || param === 'created_at') continue;

    const thresholds = HEALTH_THRESHOLDS[param];
    if (!thresholds) continue;

    let alertKey = '';
    let alert = null;

    if (value < thresholds.critical_min || value > thresholds.critical_max) {
      alertKey = `${param}_critical_${value < thresholds.critical_min ? 'low' : 'high'}`;
      if (!shownAlerts.has(alertKey)) {
        alert = {
          type: 'CRITICAL',
          severity: 'high',
          message: `Critical ${thresholds.name} level detected: ${value}${thresholds.unit}`,
          parameter: param,
          value: value,
          threshold: value < thresholds.critical_min ? thresholds.critical_min : thresholds.critical_max
        };
      }
    } else if (value < thresholds.min || value > thresholds.max) {
      alertKey = `${param}_warning_${value < thresholds.min ? 'low' : 'high'}`;
      if (!shownAlerts.has(alertKey)) {
        alert = {
          type: 'WARNING',
          severity: 'medium',
          message: `Abnormal ${thresholds.name} level detected: ${value}${thresholds.unit}`,
          parameter: param,
          value: value,
          threshold: value < thresholds.min ? thresholds.min : thresholds.max
        };
      }
    }

    if (alert && alertKey) {
      shownAlerts.add(alertKey);
      alerts.push(alert);
      
      // Send browser notification for critical alerts
      if (alert.type === 'CRITICAL') {
        try {
          // Check if we're in a browser environment
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification('Health Alert', {
                body: alert.message,
                icon: '/images/alert-icon.png'
              });
            }
          }
        } catch (error) {
          console.log('Notification not supported in this environment');
        }
      }
    }
  }

  return alerts;
}

// Generate random health data with realistic patterns
function generateMockData() {
  // Update values with realistic changes
  lastHeartRate = getNextValue(lastHeartRate, 80, 120, 3);
  lastSpO2 = getNextValue(lastSpO2, 93, 100, 1);
  lastTemperature = getNextValue(lastTemperature, 36.5, 37.5, 0.2);
  
  // Occasionally generate anomalies (10% chance)
  if (Math.random() < 0.1) {
    const anomalyType = Math.floor(Math.random() * 3);
    switch (anomalyType) {
      case 0:
        lastHeartRate = Math.random() < 0.5 ? 65 : 135; // Critical heart rate
        break;
      case 1:
        lastSpO2 = 88; // Critical SpO2
        break;
      case 2:
        lastTemperature = Math.random() < 0.5 ? 34.5 : 39.5; // Critical temperature
        break;
    }
  }
  
  // Increment steps more realistically (0-500 steps per 10 seconds)
  const newSteps = Math.floor(Math.random() * 500);
  currentSteps += newSteps;

  const mockData = {
    heart_rate: Math.round(lastHeartRate),
    spo2: Math.round(lastSpO2),
    temperature: parseFloat(lastTemperature.toFixed(1)),
    steps: currentSteps,
    created_at: new Date()
  };

  // Check for anomalies and add them to the data
  const alerts = checkAnomalies(mockData);
  if (alerts.length > 0) {
    mockData.alerts = alerts;
  }

  return mockData;
}

// Insert mock data every 10 seconds
async function startMockDataGeneration() {
  console.log('Starting ESP8266 mock data generation with anomaly detection (10-second intervals)...');
  console.log('Next update will be in 10 seconds...');
  
  // Reset shown alerts at midnight along with steps
  const midnightCheck = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      currentSteps = 0;
      shownAlerts.clear(); // Reset shown alerts
      console.log('Steps and alerts reset at midnight');
    }
  }, 60000); // Check every minute

  // Generate and insert data every 10 seconds
  const updateInterval = setInterval(async () => {
    const currentTime = new Date();
    const mockData = generateMockData();
    
    try {
      // Store in Supabase
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('health_data')
        .insert([mockData]);
        
      if (supabaseError) {
        console.error('Error inserting data to Supabase:', supabaseError);
      }

      // Create a new HealthData document with the mock data
      const healthData = new HealthData(mockData);
      await healthData.save();
      
      const timeSinceLastUpdate = lastUpdateTime 
        ? Math.round((currentTime - lastUpdateTime) / 1000) 
        : 0;
      
      lastUpdateTime = currentTime;
      
      console.log(`[${currentTime.toLocaleTimeString()}] Data updated (${timeSinceLastUpdate}s since last update)`);
      console.log('Values:', {
        'Heart Rate': mockData.heart_rate + ' BPM',
        'SpO2': mockData.spo2 + '%',
        'Temperature': mockData.temperature + '°C',
        'Steps': mockData.steps
      });

      // Log alerts if any
      if (mockData.alerts && mockData.alerts.length > 0) {
        console.log('\nALERTS DETECTED:');
        mockData.alerts.forEach(alert => {
          console.log(`[${alert.type}] ${alert.message}`);
        });
      }

      console.log('Data stored in both Supabase and MongoDB');
      console.log('Next update in 10 seconds...\n');
    } catch (err) {
      console.error('Failed to insert data:', err);
      console.error('Error details:', err.message);
    }
  }, 10000); // Exactly 10 seconds

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    clearInterval(updateInterval);
    clearInterval(midnightCheck);
    console.log('\nStopping data generation...');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  });
}

// Start generating mock data
startMockDataGeneration(); 
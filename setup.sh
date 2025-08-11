#!/bin/bash

echo "🚀 Setting up DDoS Protection Panel..."

# Create server directory if it doesn't exist
mkdir -p server

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create database directory
mkdir -p server/data

# Set permissions for log files (common locations)
echo "🔧 Setting up log file permissions..."

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root - setting up log file access..."
    
    # Common log file locations
    LOG_FILES=(
        "/var/log/nginx/access.log"
        "/var/log/apache2/access.log"
        "/var/log/httpd/access_log"
    )
    
    for log_file in "${LOG_FILES[@]}"; do
        if [ -f "$log_file" ]; then
            echo "✅ Found log file: $log_file"
            chmod 644 "$log_file"
        fi
    done
else
    echo "ℹ️  Not running as root. You may need to adjust log file permissions manually."
    echo "   Run: sudo chmod 644 /var/log/nginx/access.log"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the DDoS Protection Panel:"
echo "   npm run start:full"
echo ""
echo "📊 Then add your log files:"
echo "   curl -X POST http://localhost:3001/api/monitor \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"logPath\":\"/var/log/nginx/access.log\"}'"
echo ""
echo "🌐 Dashboard will be available at: http://localhost:5173"
echo "🔌 API will be available at: http://localhost:3001"
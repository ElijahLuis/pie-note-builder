#!/bin/bash

# PIE Note Builder - Simple Start Script
# Starts a local web server to run the application

PORT=8080
URL="http://localhost:$PORT"

echo "🏥 Starting PIE Note Builder..."
echo ""
echo "Server will be available at: $URL"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "----------------------------------------"

# Try Python 3 first, then Python 2
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m http.server $PORT
else
    echo "❌ Error: Python is not installed."
    echo ""
    echo "Please install Python or use one of these alternatives:"
    echo "  - Open index.html directly in your browser"
    echo "  - Use VS Code Live Server extension"
    echo ""
    exit 1
fi

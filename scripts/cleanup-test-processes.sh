#!/bin/bash

# Cleanup script for test processes and ports
# Useful when tests get stuck or leave processes running

echo "🧹 Cleaning up test processes and ports..."

# Kill any lingering test processes
echo "  → Killing test processes..."
pkill -f "node.*vitest" 2>/dev/null && echo "    ✅ Killed vitest processes" || echo "    ℹ️  No vitest processes found"
pkill -f "node.*test" 2>/dev/null && echo "    ✅ Killed test processes" || echo "    ℹ️  No test processes found"

# Wait for processes to fully terminate
sleep 2

# Check for any remaining Node processes that might be holding ports
echo "  → Checking for remaining Node processes..."
REMAINING_PROCESSES=$(ps aux | grep -E "node.*(test|vitest)" | grep -v grep | wc -l)
if [ "$REMAINING_PROCESSES" -gt 0 ]; then
    echo "    ⚠️  Found $REMAINING_PROCESSES remaining processes"
    ps aux | grep -E "node.*(test|vitest)" | grep -v grep | head -5
    echo "    💡 You may need to kill these manually with: kill -9 <PID>"
else
    echo "    ✅ No remaining test processes found"
fi

# Check for ports in use in the test range (3000-4000)
echo "  → Checking for ports in use in test range (3000-4000)..."
PORTS_IN_USE=$(lsof -i :3000-4000 2>/dev/null | grep LISTEN | wc -l)
if [ "$PORTS_IN_USE" -gt 0 ]; then
    echo "    ⚠️  Found $PORTS_IN_USE ports in use in test range"
    echo "    📋 Ports currently in use:"
    lsof -i :3000-4000 2>/dev/null | grep LISTEN | awk '{print "      Port " $9 " - PID " $2 " (" $1 ")"}'
    echo "    💡 These may be leftover from tests or other applications"
else
    echo "    ✅ No ports in use in test range"
fi

echo ""
echo "✅ Cleanup complete! You can now run tests safely."
echo ""
echo "💡 Usage tips:"
echo "  • Run this script if tests fail with port conflicts"
echo "  • Use 'npm test' to run tests normally"
echo "  • Use 'npm run test:watch' for watch mode"
echo ""
pkill -f tsx
sleep 2
node dist/server.cjs &
PID=$!
sleep 3
echo "Health:"
curl -s http://localhost:3000/api/health
echo "\nHerbs:"
curl -s http://localhost:3000/api/herbs | head -c 100
echo "\nGemini Plate:"
curl -s -X POST http://localhost:3000/api/gemini -H "Content-Type: application/json" -d '{"functionName": "analyzePlate", "args": ["", "image/jpeg", null]}' | head -c 100
kill $PID

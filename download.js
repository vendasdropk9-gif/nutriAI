const https = require('https');
const fs = require('fs');
fs.mkdirSync('src/assets/audio', {recursive: true});
const file = fs.createWriteStream('src/assets/audio/nutriai_voice.mp3');
https.get('https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=pt-BR&q=Nutri%20ei%20ai', function(response) {
  response.pipe(file);
});

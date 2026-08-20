const https = require('https');
const fs = require('fs');

// Nutri AI em PT-BR com sotaque americano em "AI"
const text = encodeURIComponent('Nútri Ei Ái.');
const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=pt-BR&q=${text}`;

const file = fs.createWriteStream('src/assets/audio/nutriai_voice.mp3');
https.get(url, function(response) {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download completed.');
  });
}).on('error', (err) => {
  console.error('Error:', err);
});

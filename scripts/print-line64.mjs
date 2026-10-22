import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:\\Users\\Angel Lae Martinez\\.gemini\\antigravity-ide\\brain\\957656c2-020b-4d92-a4e2-1c9b6ce44a6b\\.system_generated\\logs\\transcript_full.jsonl');

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (lineNum === 64) {
    const parsed = JSON.parse(line);
    console.log(parsed.content);
  }
});

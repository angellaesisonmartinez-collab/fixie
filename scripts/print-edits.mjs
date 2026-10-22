import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:\\Users\\Angel Lae Martinez\\.gemini\\antigravity-ide\\brain\\957656c2-020b-4d92-a4e2-1c9b6ce44a6b\\.system_generated\\logs\\transcript_full.jsonl');

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

let lineNum = 0;
const targetLines = new Set([281, 283, 289, 293]);

rl.on('line', (line) => {
  lineNum++;
  if (targetLines.has(lineNum)) {
    const parsed = JSON.parse(line);
    const tc = parsed.tool_calls?.[0];
    console.log(`\n=================== LINE ${lineNum} (${tc?.args?.TargetFile}) ===================`);
    console.log('Instruction:', tc?.args?.Instruction);
    console.log('TargetContent:\n', tc?.args?.TargetContent);
    console.log('ReplacementContent:\n', tc?.args?.ReplacementContent);
  }
});

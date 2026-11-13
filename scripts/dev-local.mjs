import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 4174);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('PORT debe ser un número entero entre 1024 y 65535.');
  process.exit(1);
}

const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const child = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: 'inherit',
});
child.on('error', (error) => {
  console.error('No se pudo iniciar Vite:', error.message);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

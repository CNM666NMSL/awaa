'use strict';

// The portable launcher runs the existing game server in this process.
// Closing its console also closes the server, without leaving a background copy.
const { spawn } = require('node:child_process');
const os = require('node:os');

process.chdir(__dirname);
let openBrowser = true;
let practice = false;
let requestedPort = 3010;
let explicitPort = false;
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--no-open') openBrowser = false;
  else if (arg === '--practice=noble') practice = true;
  else if (arg === '--port' || arg.startsWith('--port=')) {
    const value = arg === '--port' ? args[++i] : arg.slice(7);
    if (!/^\d+$/.test(value || '') || Number(value) > 65535) {
      console.error('端口必须是 0 到 65535 的整数。');
      process.exit(1);
    }
    requestedPort = Number(value);
    explicitPort = true;
  } else {
    console.error('未知参数：' + arg);
    process.exit(1);
  }
}

process.env.PORT = String(requestedPort);
const server = require('./server.js');
let retried = false;
const startupTimeout = setTimeout(() => {
  console.error('游戏启动超时，请检查启动窗口中的错误信息。');
  process.exit(1);
}, 15000);

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && !explicitPort && !retried) {
    retried = true;
    console.log('默认端口正在使用，自动选择其他空闲端口。');
    server.listen(0, '0.0.0.0');
    return;
  }
  clearTimeout(startupTimeout);
  console.error('游戏启动失败：' + error.message);
  process.exit(1);
});

server.once('listening', () => {
  clearTimeout(startupTimeout);
  const port = server.address().port;
  const suffix = practice ? '/?practice=noble' : '/';
  const url = 'http://127.0.0.1:' + port + suffix;
  console.log('\n百兽夜行 · 贵族 V3');
  console.log('游戏地址：' + url);
  console.log('贵族练习：http://127.0.0.1:' + port + '/?practice=noble');
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.')) {
        console.log('局域网地址：http://' + entry.address + ':' + port + '/');
      }
    }
  }
  console.log('\n游戏期间请保留此窗口；关闭窗口或按 Ctrl+C 即可停止。');
  if (!openBrowser) return;
  let command, browserArgs;
  if (process.platform === 'win32') {
    command = process.env.ComSpec || 'cmd.exe';
    browserArgs = ['/d', '/s', '/c', 'start "" "' + url + '"'];
  } else {
    command = process.platform === 'darwin' ? 'open' : 'xdg-open';
    browserArgs = [url];
  }
  const browser = spawn(command, browserArgs, { stdio: 'ignore', windowsHide: true });
  browser.on('error', () => console.log('请在浏览器中手动打开上面的游戏地址。'));
  browser.on('exit', (code) => {
    if (code) console.log('请在浏览器中手动打开上面的游戏地址。');
  });
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
});

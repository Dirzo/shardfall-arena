import net from 'node:net';
import crypto from 'node:crypto';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = +(process.env.PORT || 8080);

function encodeClientText(text) {
  const payload = Buffer.from(text, 'utf8');
  const mask = crypto.randomBytes(4);
  let head;
  if (payload.length < 126) {
    head = Buffer.alloc(2);
    head[0] = 0x81;
    head[1] = 0x80 | payload.length;
  } else if (payload.length < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x81;
    head[1] = 0x80 | 126;
    head.writeUInt16BE(payload.length, 2);
  } else {
    throw new Error('Smoke-test payload unexpectedly large');
  }
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i & 3];
  return Buffer.concat([head, mask, masked]);
}

function decodeServerFrame(buf) {
  if (buf.length < 2) return null;
  const op = buf[0] & 0x0f;
  let len = buf[1] & 0x7f;
  let off = 2;
  if (len === 126) {
    if (buf.length < 4) return null;
    len = buf.readUInt16BE(2); off = 4;
  } else if (len === 127) {
    if (buf.length < 10) return null;
    const n = buf.readBigUInt64BE(2);
    if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Frame too large');
    len = Number(n); off = 10;
  }
  if (buf.length < off + len) return null;
  return { op, payload: buf.subarray(off, off + len), rest: buf.subarray(off + len) };
}

const socket = net.createConnection({ host: HOST, port: PORT });
const key = crypto.randomBytes(16).toString('base64');
const absoluteTimeout = setTimeout(() => finish(new Error('Timed out waiting for lobby response')), 5000);
let phase = 'handshake';
let buf = Buffer.alloc(0);
let done = false;

function finish(err) {
  if (done) return;
  done = true;
  clearTimeout(absoluteTimeout);
  try { socket.destroy(); } catch {}
  if (err) {
    console.error('WS SMOKE FAIL:', err.message || err);
    process.exit(1);
  }
  console.log('WS SMOKE PASS: create-room lobby received');
  process.exit(0);
}

socket.on('connect', () => {
  socket.write([
    'GET /ws HTTP/1.1',
    `Host: ${HOST}:${PORT}`,
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Key: ${key}`,
    'Sec-WebSocket-Version: 13',
    '\r\n'
  ].join('\r\n'));
});

socket.on('data', chunk => {
  buf = Buffer.concat([buf, chunk]);
  if (phase === 'handshake') {
    const i = buf.indexOf('\r\n\r\n');
    if (i < 0) return;
    const head = buf.subarray(0, i + 4).toString('utf8');
    if (!/^HTTP\/1\.1 101 /m.test(head)) {
      return finish(new Error('WebSocket upgrade failed: ' + head.split('\r\n')[0]));
    }
    buf = buf.subarray(i + 4);
    phase = 'frames';
    socket.write(encodeClientText(JSON.stringify({ t: 'create', name: 'Smoke' })));
  }
  while (phase === 'frames') {
    const frame = decodeServerFrame(buf);
    if (!frame) break;
    buf = frame.rest;
    if (frame.op === 0x1) {
      const m = JSON.parse(frame.payload.toString('utf8'));
      if (m.t === 'lobby') {
        if (!/^[A-Z]{4}$/.test(m.code || '')) return finish(new Error('Lobby missing valid room code'));
        if (!m.slots?.[m.you]?.host) return finish(new Error('Creator is not host'));
        return finish();
      }
    }
  }
});

socket.on('error', err => finish(err));
socket.on('close', () => {
  if (!done) finish(new Error('Socket closed before lobby response'));
});

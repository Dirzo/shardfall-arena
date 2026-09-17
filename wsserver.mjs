/* Minimal WebSocket (RFC 6455) server — no external dependencies.
   Supports text + binary frames, fragmentation, ping/pong and close. */
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_MESSAGE = 1 << 20; // 1 MiB

export class WSConnection extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.open = true;
    this.buf = Buffer.alloc(0);
    this.frags = [];
    this.fragOp = 0;
    this.alive = true;
    socket.on('data', d => this._data(d));
    socket.on('close', () => this._closed());
    socket.on('error', () => this._closed());
    socket.setNoDelay(true);
  }
  _closed() {
    if (!this.open) return;
    this.open = false;
    this.emit('close');
  }
  _data(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    for (;;) {
      const f = this._frame();
      if (!f) break;
      this._handle(f);
      if (!this.open) break;
    }
  }
  _frame() {
    const b = this.buf;
    if (b.length < 2) return null;
    const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return null; const big = b.readBigUInt64BE(2); if (big > BigInt(MAX_MESSAGE)) { this.close(1009); return null; } len = Number(big); off = 10; }
    if (masked) { if (b.length < off + 4) return null; }
    const maskOff = off; if (masked) off += 4;
    if (b.length < off + len) return null;
    let payload = b.subarray(off, off + len);
    if (masked) {
      const m = b.subarray(maskOff, maskOff + 4), out = Buffer.allocUnsafe(len);
      for (let i = 0; i < len; i++) out[i] = payload[i] ^ m[i & 3];
      payload = out;
    } else payload = Buffer.from(payload);
    this.buf = b.subarray(off + len);
    return { fin, op, payload };
  }
  _handle(f) {
    if (f.op === 0x8) { this.close(1000); return; }
    if (f.op === 0x9) { this._send(0xa, f.payload); return; }
    if (f.op === 0xa) { this.alive = true; return; }
    if (f.op === 0x0) {
      this.frags.push(f.payload);
    } else {
      this.frags = [f.payload];
      this.fragOp = f.op;
    }
    if (!f.fin) {
      if (this.frags.reduce((n, x) => n + x.length, 0) > MAX_MESSAGE) this.close(1009);
      return;
    }
    const data = this.frags.length === 1 ? this.frags[0] : Buffer.concat(this.frags);
    this.frags = [];
    if (this.fragOp === 0x1) this.emit('message', data.toString('utf8'));
    else if (this.fragOp === 0x2) this.emit('binary', data);
  }
  _send(op, payload) {
    if (!this.open) return;
    const len = payload.length;
    let head;
    if (len < 126) { head = Buffer.allocUnsafe(2); head[1] = len; }
    else if (len < 65536) { head = Buffer.allocUnsafe(4); head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.allocUnsafe(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
    head[0] = 0x80 | op;
    try { this.socket.write(Buffer.concat([head, payload])); } catch { this._closed(); }
  }
  send(text) { this._send(0x1, Buffer.from(text, 'utf8')); }
  ping() { this.alive = false; this._send(0x9, Buffer.alloc(0)); }
  close(code = 1000) {
    if (!this.open) return;
    const b = Buffer.allocUnsafe(2); b.writeUInt16BE(code, 0);
    this._send(0x8, b);
    this.open = false;
    try { this.socket.end(); } catch { }
    this.emit('close');
  }
}

/* Attach to a node http server; calls onConnection(conn, req) for each upgrade. */
export function attachWebSocket(server, onConnection, path = '/ws') {
  server.on('upgrade', (req, socket) => {
    if (req.headers.upgrade?.toLowerCase() !== 'websocket' || !req.url.startsWith(path)) {
      socket.destroy(); return;
    }
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
    onConnection(new WSConnection(socket), req);
  });
  // drop half-open sockets
  setInterval(() => {
    for (const c of server.__conns || []) {
      if (!c.open) continue;
      if (!c.alive) { c.close(1001); continue; }
      c.ping();
    }
  }, 20000).unref();
}

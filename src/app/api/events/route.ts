export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest } from 'next/server';
import { eventBus } from '@/lib/eventBus';

// GET /api/events - Real-time Server-Sent Events (SSE) pipeline for instant live sync
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection handshake
      controller.enqueue(encoder.encode(`event: connected\ndata: ${Date.now()}\n\n`));

      const onSync = (data: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: sync\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          isClosed = true;
        }
      };

      eventBus.on('sync', onSync);

      // Keepalive heartbeat ping every 15 seconds to prevent proxy timeouts
      const keepAlive = setInterval(() => {
        if (isClosed) {
          clearInterval(keepAlive);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          isClosed = true;
          clearInterval(keepAlive);
        }
      }, 15000);

      request.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(keepAlive);
        eventBus.off('sync', onSync);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disables Nginx buffering on Hostinger/VPS
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { db, PrinterRecord } from '@/lib/db-store';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const deviceId = request.headers.get('x-device-id');
    const shopId = request.headers.get('x-shop-id');
    const body = await request.json();
    const { printers, agent_version } = body;

    if (!deviceId || !shopId) {
      return NextResponse.json({ error: 'Device credentials required' }, { status: 401 });
    }

    const device = db.devices.get(deviceId);
    if (device) {
      device.last_heartbeat_at = new Date().toISOString();
      device.is_active = true;
      if (agent_version) device.agent_version = agent_version;
    }

    // Synchronize printers sent by Windows Agent
    if (Array.isArray(printers)) {
      for (const p of printers) {
        // Find existing printer with same name under this shop
        let existingPrinter = Array.from(db.printers.values()).find(
          ep => ep.shop_id === shopId && ep.name === p.name
        );

        if (existingPrinter) {
          existingPrinter.status = p.status || 'ready';
          existingPrinter.driver_name = p.driver_name || existingPrinter.driver_name;
          existingPrinter.port_name = p.port_name || existingPrinter.port_name;
          existingPrinter.is_color_supported = Boolean(p.is_color_supported);
          existingPrinter.is_duplex_supported = Boolean(p.is_duplex_supported);
          existingPrinter.last_seen_at = new Date().toISOString();
        } else {
          const newPrinterId = crypto.randomUUID();
          const newPrinter: PrinterRecord = {
            id: newPrinterId,
            shop_id: shopId,
            device_id: deviceId,
            name: p.name,
            driver_name: p.driver_name || 'Generic Windows Driver',
            port_name: p.port_name || 'USB/Network',
            is_color_supported: Boolean(p.is_color_supported),
            is_duplex_supported: Boolean(p.is_duplex_supported),
            supported_paper_sizes: p.supported_paper_sizes || ['A4'],
            is_default: Boolean(p.is_default),
            status: p.status || 'ready',
            last_seen_at: new Date().toISOString()
          };
          db.printers.set(newPrinterId, newPrinter);
        }
      }
    }

    return NextResponse.json({
      success: true,
      server_time: new Date().toISOString(),
      active_printers_count: db.getPrinters(shopId).length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db, DeviceRecord } from '@/lib/db-store';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { pairing_pin, device_name, device_fingerprint, agent_version } = await request.json();

    if (!pairing_pin) {
      return NextResponse.json({ error: 'Pairing PIN is required' }, { status: 400 });
    }

    // Check pairing pin against stored active pins or seed demo PINs
    let matchedShopId: string | null = null;

    // Check active memory pairing pins
    const pinData = db.pairingPins.get(pairing_pin);
    if (pinData && pinData.expires_at > Date.now()) {
      matchedShopId = pinData.shop_id;
    } else {
      // Check devices registered with demo PINs (e.g. 482910, 192837)
      for (const dev of Array.from(db.devices.values())) {
        if (dev.pairing_pin === pairing_pin) {
          matchedShopId = dev.shop_id;
          break;
        }
      }
    }

    // Default fallback to Shop 1 if pairing PIN is standard demo "123456"
    if (!matchedShopId && pairing_pin === '123456') {
      matchedShopId = '11111111-1111-1111-1111-111111111111';
    }

    if (!matchedShopId) {
      return NextResponse.json(
        { error: 'Invalid or expired pairing PIN. Please generate a new PIN from the Shop Dashboard.' },
        { status: 401 }
      );
    }

    const shop = db.getShopById(matchedShopId);
    if (!shop) {
      return NextResponse.json({ error: 'Associated shop not found' }, { status: 404 });
    }

    const deviceId = crypto.randomUUID();
    const deviceToken = crypto.randomBytes(32).toString('hex');

    const deviceRecord: DeviceRecord = {
      id: deviceId,
      shop_id: matchedShopId,
      device_name: device_name || 'WINDOWS-PRINT-PC',
      device_fingerprint: device_fingerprint || 'WIN-FP-DEFAULT',
      pairing_pin: pairing_pin,
      pin_expires_at: new Date(Date.now() + 864000000).toISOString(),
      device_token_hash: crypto.createHash('sha256').update(deviceToken).digest('hex'),
      is_active: true,
      last_heartbeat_at: new Date().toISOString(),
      agent_version: agent_version || '1.0.0'
    };

    db.devices.set(deviceId, deviceRecord);

    return NextResponse.json({
      success: true,
      device_id: deviceId,
      device_token: deviceToken,
      shop_id: matchedShopId,
      shop_name: shop.name,
      message: `Device successfully paired with ${shop.name}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

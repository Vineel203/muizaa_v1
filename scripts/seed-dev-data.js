'use strict';

const { STAGES, STAGE_LABELS } = require('../config/permissions');
const { formatDocumentNumber } = require('../utils/helpers');

const SEED_USER = 'seed@muizaa.com';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, count) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < count && copy.length; i += 1) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function hoursAfter(base, hours) {
  const d = new Date(base);
  d.setHours(d.getHours() + hours);
  return d;
}

async function insertRow(client, table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const result = await client.query(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return result.rows[0];
}

async function reserveSequence(client, documentType, year, month, lastSerial) {
  await client.query(
    `INSERT INTO document_sequences (document_type, year, month, last_serial)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (document_type, year, month)
     DO UPDATE SET last_serial = GREATEST(document_sequences.last_serial, EXCLUDED.last_serial)`,
    [documentType, year, month, lastSerial]
  );
}

async function seedMasterData(client) {
  const locations = [
    'Hyderabad', 'Vijayawada', 'Bangalore', 'Chennai', 'Mumbai',
    'Pune', 'Visakhapatnam', 'Guntur', 'Nellore', 'Tirupati',
    'Warangal', 'Kakinada', 'Rajahmundry', 'Nagpur', 'Coimbatore',
  ];

  const consignors = [
    'Sri Lakshmi Traders', 'Andhra Cement Works', 'Vijay Steel Depot',
    'Metro Agro Products', 'South India Rice Mills', 'Guntur Spices Co',
    'Hyderabad Hardware Mart', 'Coastal Fisheries Export', 'Telangana Plywoods',
    'Deccan Auto Parts', 'Krishna Fertilizers', 'Peninsula Textiles',
  ];

  const consignees = [
    'Chennai Distribution Hub', 'Mumbai Wholesale Mart', 'Bangalore Retail Chain',
    'Pune Industrial Supplies', 'Vizag Port Logistics', 'Nellore Agro Depot',
    'Tirupati Construction Co', 'Warangal Building Materials', 'Kakinada Exports',
    'Rajahmundry Merchants', 'Nagpur Grain Storage', 'Coimbatore Textile Mills',
  ];

  const bankingRows = [
    { bank_name: 'State Bank of India', account_number: '30123456789', ifsc: 'SBIN0001234' },
    { bank_name: 'HDFC Bank', account_number: '50234567890', ifsc: 'HDFC0002345' },
    { bank_name: 'ICICI Bank', account_number: '60345678901', ifsc: 'ICIC0003456' },
    { bank_name: 'Axis Bank', account_number: '70456789012', ifsc: 'UTIB0004567' },
    { bank_name: 'Andhra Bank', account_number: '80567890123', ifsc: 'ANDB0005678' },
    { bank_name: 'Canara Bank', account_number: '90678901234', ifsc: 'CNRB0006789' },
  ];

  const transporterDefs = [
    {
      name: 'Sai Krishna Transport', phone_number: '9848012345',
      address: 'Plot 12, IDA Uppal, Hyderabad', operating_routes: 'Hyderabad – Vijayawada – Chennai',
      notes: 'Preferred for cement loads',
    },
    {
      name: 'Andhra Lorry Service', phone_number: '9849023456',
      address: 'NH-16, Guntur', operating_routes: 'Guntur – Vizag – Kakinada',
      notes: '24x7 operations',
    },
    {
      name: 'Deccan Freight Carriers', phone_number: '9848034567',
      address: 'Balanagar, Hyderabad', operating_routes: 'Hyderabad – Bangalore – Mumbai',
    },
    {
      name: 'Peninsula Roadlines', phone_number: '9848045678',
      address: 'Tambaram, Chennai', operating_routes: 'Chennai – Bangalore – Coimbatore',
    },
    {
      name: 'Krishna Valley Logistics', phone_number: '9848056789',
      address: 'Vijayawada Bypass', operating_routes: 'Vijayawada – Nellore – Tirupati',
    },
    {
      name: 'South Coast Movers', phone_number: '9848067890',
      address: 'Madhurawada, Visakhapatnam', operating_routes: 'Vizag – Rajahmundry – Kakinada',
    },
    {
      name: 'Metro Express Transport', phone_number: '9848078901',
      address: 'Pune – Solapur Highway', operating_routes: 'Pune – Mumbai – Nagpur',
    },
    {
      name: 'Telangana Cargo Movers', phone_number: '9848089012',
      address: 'Shamshabad, Hyderabad', operating_routes: 'Hyderabad – Warangal – Nizamabad',
    },
  ];

  const driverDefs = [
    { name: 'Ramesh Kumar', number: '9876543210' },
    { name: 'Suresh Reddy', number: '9988776655' },
    { name: 'Venkat Rao', number: '9123456780' },
    { name: 'Rajesh Naidu', number: '9234567891' },
    { name: 'Prakash Singh', number: '9345678902' },
    { name: 'Anil Sharma', number: '9456789013' },
    { name: 'Mohan Das', number: '9567890124' },
    { name: 'Kiran Babu', number: '9678901235' },
    { name: 'Naveen Goud', number: '9789012346' },
    { name: 'Srinivas Rao', number: '9890123457' },
    { name: 'Chandra Sekhar', number: '9901234568' },
    { name: 'Vijay Kumar', number: '9012345679' },
  ];

  const ownerDefs = [
    { name: 'Suresh Transport Co', number: '9988776655' },
    { name: 'Lakshmi Fleet Services', number: '9876501234' },
    { name: 'Ramaiah Trucking', number: '9765432109' },
    { name: 'Naidu Logistics', number: '9654321098' },
    { name: 'Reddy Haulage', number: '9543210987' },
    { name: 'Goud Transport', number: '9432109876' },
    { name: 'Sharma Fleet', number: '9321098765' },
    { name: 'Das Roadlines', number: '9210987654' },
    { name: 'Babu Carriers', number: '9109876543' },
    { name: 'Kumar Transport', number: '9098765432' },
  ];

  const truckDefs = [
    { number: 'AP39AB1234', capacity: 16 },
    { number: 'AP39CD5678', capacity: 20 },
    { number: 'AP40EF9012', capacity: 14 },
    { number: 'TS09GH3456', capacity: 18 },
    { number: 'TS10IJ7890', capacity: 22 },
    { number: 'KA05KL2345', capacity: 16 },
    { number: 'TN07MN6789', capacity: 20 },
    { number: 'MH12OP0123', capacity: 24 },
    { number: 'AP39QR4567', capacity: 12 },
    { number: 'TS09ST8901', capacity: 18 },
    { number: 'KA05UV2346', capacity: 16 },
    { number: 'TN07WX6780', capacity: 20 },
  ];

  const goodsDescriptions = [
    'Cement Bags (50kg)', 'Rice (25kg bags)', 'Steel Rods (TMT)', 'Plywood Sheets',
    'Fertilizer Bags', 'Cotton Bales', 'Marble Slabs', 'Electronic Goods',
    'Spices (Cardamom)', 'Auto Parts', 'Tiles (Ceramic)', 'Edible Oil Drums',
    'Wheat Flour', 'Copper Wire Coils', 'Packaged Snacks', 'Industrial Chemicals',
  ];

  const locationIds = {};
  for (const name of locations) {
    const row = await insertRow(client, 'locations', { name });
    locationIds[name] = row.id;
  }

  const consignorIds = {};
  for (const name of consignors) {
    const row = await insertRow(client, 'consignors', { name });
    consignorIds[name] = row.id;
  }

  const consigneeIds = {};
  for (const name of consignees) {
    const row = await insertRow(client, 'consignees', { name });
    consigneeIds[name] = row.id;
  }

  const bankingIds = [];
  for (const bank of bankingRows) {
    const row = await insertRow(client, 'banking_details', bank);
    bankingIds.push(row.id);
  }

  const transporterIds = [];
  for (let i = 0; i < transporterDefs.length; i += 1) {
    const def = transporterDefs[i];
    const row = await insertRow(client, 'transporters', {
      ...def,
      banking_detail_id: bankingIds[i % bankingIds.length],
    });
    transporterIds.push(row.id);
  }

  const driverIds = [];
  for (const def of driverDefs) {
    const row = await insertRow(client, 'drivers', def);
    driverIds.push(row.id);
  }

  const ownerIds = [];
  for (const def of ownerDefs) {
    const row = await insertRow(client, 'truck_owners', def);
    ownerIds.push(row.id);
  }

  const truckIds = [];
  for (let i = 0; i < truckDefs.length; i += 1) {
    const def = truckDefs[i];
    const row = await insertRow(client, 'trucks', {
      number: def.number,
      capacity: def.capacity,
      default_driver_id: driverIds[i % driverIds.length],
      default_owner_id: ownerIds[i % ownerIds.length],
    });
    truckIds.push(row.id);
  }

  return {
    locationIds,
    consignorIds,
    consigneeIds,
    bankingIds,
    transporterIds,
    driverIds,
    ownerIds,
    truckIds,
    locations,
    consignors,
    consignees,
    goodsDescriptions,
    driverDefs,
    ownerDefs,
    truckDefs,
  };
}

function buildBookingFinance(stage, totalCompanyFreight, totalAdvance) {
  const commission = Math.round(totalCompanyFreight * (0.03 + Math.random() * 0.04));
  const localDriverCharges = 500 + Math.floor(Math.random() * 1500);
  const gumastaCharges = 200 + Math.floor(Math.random() * 300);
  const weightKattaCharges = 300 + Math.floor(Math.random() * 500);
  const lorryFreightPaid = totalAdvance + Math.floor(Math.random() * 5000);
  const roughBalance = totalCompanyFreight - totalAdvance - commission;

  const base = {
    commission,
    local_driver_charges: localDriverCharges,
    gumasta_charges: gumastaCharges,
    weight_katta_charges: weightKattaCharges,
    rough_balance: roughBalance,
    lorry_freight_paid: lorryFreightPaid,
    finance_remark: 'Seeded finance data',
  };

  if ([STAGES.UNLOAD, STAGES.DONE, STAGES.ARCHIVED].includes(stage)) {
    return {
      ...base,
      is_finance_complete: stage !== STAGES.UNLOAD || Math.random() > 0.3,
      finance_edited_flag: Math.random() > 0.7,
    };
  }

  if (stage === STAGES.ON_ROAD && Math.random() > 0.5) {
    return { commission, local_driver_charges: localDriverCharges };
  }

  return {};
}

function buildGoodsItemFinance(stage) {
  if (stage === STAGES.PARKING_LOT) return { package_name: pick(['Bags', 'Boxes', 'Drums', 'Cartons', 'Bundles']) };

  const companyFreight = 8000 + Math.floor(Math.random() * 12000);
  const advance = Math.round(companyFreight * (0.2 + Math.random() * 0.3));
  const loadingHamali = 400 + Math.floor(Math.random() * 600);
  const unloadingHamali = 400 + Math.floor(Math.random() * 600);
  const balance = companyFreight - advance - loadingHamali - unloadingHamali;

  if ([STAGES.UNLOAD, STAGES.DONE, STAGES.ARCHIVED, STAGES.ON_ROAD].includes(stage)) {
    return {
      package_name: pick(['Bags', 'Boxes', 'Drums', 'Cartons', 'Bundles']),
      advance,
      loading_hamali: loadingHamali,
      unloading_hamali: unloadingHamali,
      company_freight: companyFreight,
      balance,
    };
  }

  return { package_name: pick(['Bags', 'Boxes', 'Drums', 'Cartons', 'Bundles']) };
}

async function createBooking(client, master, options) {
  const {
    stage,
    createdAt,
    onRoadTime,
    unloadTime,
    bookingId,
    gdmNumber,
    invoiceId,
    index,
  } = options;

  const transporterId = pick(master.transporterIds);
  const truckIdx = index % master.truckIds.length;
  const truckId = master.truckIds[truckIdx];
  const driverId = master.driverIds[(index + 1) % master.driverIds.length];
  const ownerId = master.ownerIds[(index + 2) % master.ownerIds.length];
  const bankingId = pick(master.bankingIds);

  const itemCount = 1 + Math.floor(Math.random() * 2);
  let totalCompanyFreight = 0;
  let totalAdvance = 0;
  const goodsFinanceRows = [];
  for (let g = 0; g < itemCount; g += 1) {
    const goodsFinance = buildGoodsItemFinance(stage);
    totalCompanyFreight += goodsFinance.company_freight || 0;
    totalAdvance += goodsFinance.advance || 0;
    goodsFinanceRows.push(goodsFinance);
  }

  const finance = buildBookingFinance(stage, totalCompanyFreight, totalAdvance);
  const isUnloadComplete = [STAGES.DONE, STAGES.ARCHIVED].includes(stage)
    || (stage === STAGES.UNLOAD && Math.random() > 0.25);

  const isFinanceComplete = [STAGES.DONE, STAGES.ARCHIVED].includes(stage)
    || (stage === STAGES.UNLOAD && finance.is_finance_complete);

  const booking = await insertRow(client, 'bookings', {
    booking_id: bookingId || null,
    gdm_number: gdmNumber || null,
    stage,
    invoice_id: invoiceId || null,
    transporter_id: transporterId,
    driver_id: driverId,
    truck_id: truckId,
    truck_owner_id: ownerId,
    banking_detail_id: bankingId,
    goods_remark: pick([
      'Handle with care', 'Fragile goods', 'Urgent delivery',
      'Night unloading preferred', 'Contact consignee before delivery',
    ]),
    serial_number: `SN-${String(1000 + index).padStart(4, '0')}`,
    management_remark: index % 3 === 0 ? 'Priority customer load' : null,
    on_road_time: onRoadTime || null,
    unload_time: unloadTime || null,
    is_unload_complete: isUnloadComplete,
    is_finance_complete: isFinanceComplete || false,
    company_unload: isUnloadComplete ? pick(['Self', 'Company', 'Transporter']) : null,
    unload_quantity: isUnloadComplete ? 100 + Math.floor(Math.random() * 400) : null,
    unloaded_weight_kgs: isUnloadComplete ? 5000 + Math.floor(Math.random() * 15000) : null,
    created_at: createdAt,
    updated_at: unloadTime || onRoadTime || createdAt,
    created_by: SEED_USER,
    updated_by: SEED_USER,
    ...finance,
  });

  const fromLoc = pick(master.locations);
  let toLoc = pick(master.locations);
  while (toLoc === fromLoc) toLoc = pick(master.locations);

  await insertRow(client, 'booking_pickups', {
    booking_id: booking.id,
    sort_order: 0,
    location_id: master.locationIds[fromLoc],
    consignor_id: master.consignorIds[pick(master.consignors)],
  });

  if (Math.random() > 0.6) {
    const fromLoc2 = pick(master.locations);
    await insertRow(client, 'booking_pickups', {
      booking_id: booking.id,
      sort_order: 1,
      location_id: master.locationIds[fromLoc2],
      consignor_id: master.consignorIds[pick(master.consignors)],
    });
  }

  await insertRow(client, 'booking_deliveries', {
    booking_id: booking.id,
    sort_order: 0,
    location_id: master.locationIds[toLoc],
    consignee_id: master.consigneeIds[pick(master.consignees)],
  });

  if (Math.random() > 0.65) {
    let toLoc2 = pick(master.locations);
    while (toLoc2 === toLoc) toLoc2 = pick(master.locations);
    await insertRow(client, 'booking_deliveries', {
      booking_id: booking.id,
      sort_order: 1,
      location_id: master.locationIds[toLoc2],
      consignee_id: master.consigneeIds[pick(master.consignees)],
    });
  }

  for (let g = 0; g < goodsFinanceRows.length; g += 1) {
    const packages = 50 + Math.floor(Math.random() * 200);
    const weight = packages * (20 + Math.floor(Math.random() * 30));
    await insertRow(client, 'booking_goods_items', {
      booking_id: booking.id,
      sort_order: g,
      description: pick(master.goodsDescriptions),
      packages,
      weight_kgs: weight,
      unload_packages: isUnloadComplete ? packages - Math.floor(Math.random() * 3) : null,
      unload_weight_kgs: isUnloadComplete ? weight - Math.floor(Math.random() * 100) : null,
      ...goodsFinanceRows[g],
    });
  }

  await seedBookingHistory(client, booking.id, stage, createdAt, onRoadTime, unloadTime);

  return booking;
}

async function seedBookingHistory(client, bookingId, stage, createdAt, onRoadTime, unloadTime) {
  const transitions = [
  { stage: STAGES.PARKING_LOT, at: createdAt, remark: 'Parking lot entry created' },
  ];

  if ([STAGES.ON_ROAD, STAGES.UNLOAD, STAGES.DONE, STAGES.ARCHIVED].includes(stage)) {
    transitions.push({
      stage: STAGES.ON_ROAD,
      at: onRoadTime,
      remark: 'Vehicle dispatched on road',
    });
  }
  if ([STAGES.UNLOAD, STAGES.DONE, STAGES.ARCHIVED].includes(stage)) {
    transitions.push({
      stage: STAGES.UNLOAD,
      at: unloadTime,
      remark: 'Arrived at destination for unloading',
    });
  }
  if ([STAGES.DONE, STAGES.ARCHIVED].includes(stage)) {
    transitions.push({
      stage: STAGES.DONE,
      at: hoursAfter(unloadTime || onRoadTime, 24),
      remark: 'Booking marked as done',
    });
  }
  if (stage === STAGES.ARCHIVED) {
    transitions.push({
      stage: STAGES.ARCHIVED,
      at: hoursAfter(unloadTime || onRoadTime, 72),
      remark: 'Archived after settlement',
    });
  }

  await insertRow(client, 'booking_history', {
    booking_id: bookingId,
    changed_by: SEED_USER,
    timestamp: createdAt,
    action_description: 'Parking lot entry created',
    field_name: 'stage',
    old_value: null,
    new_value: STAGE_LABELS[STAGES.PARKING_LOT],
    stage_from: null,
    stage_to: STAGES.PARKING_LOT,
    remark: 'Parking lot entry created',
  });

  for (let i = 1; i < transitions.length; i += 1) {
    const prev = transitions[i - 1];
    const curr = transitions[i];
    await insertRow(client, 'booking_history', {
      booking_id: bookingId,
      changed_by: SEED_USER,
      timestamp: curr.at,
      action_description: `Stage changed from ${STAGE_LABELS[prev.stage]} to ${STAGE_LABELS[curr.stage]}`,
      field_name: 'stage',
      old_value: STAGE_LABELS[prev.stage],
      new_value: STAGE_LABELS[curr.stage],
      stage_from: prev.stage,
      stage_to: curr.stage,
      remark: curr.remark,
    });
  }
}

async function seedBookings(client, master) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const yy = String(year).slice(-2);

  let bookingSerial = 0;
  let gdmSerial = 0;
  const bookings = [];

  const stagePlan = [
    { stage: STAGES.PARKING_LOT, count: 6, daysBack: [1, 2, 3, 4, 5, 6] },
    { stage: STAGES.ON_ROAD, count: 6, daysBack: [7, 8, 10, 12, 14, 16] },
    { stage: STAGES.UNLOAD, count: 6, daysBack: [18, 20, 22, 24, 26, 28] },
    { stage: STAGES.DONE, count: 6, daysBack: [30, 32, 35, 38, 40, 42] },
    { stage: STAGES.ARCHIVED, count: 6, daysBack: [45, 50, 55, 60, 65, 70] },
  ];

  let globalIndex = 0;

  for (const plan of stagePlan) {
    for (let i = 0; i < plan.count; i += 1) {
      const createdAt = daysAgo(plan.daysBack[i]);
      let bookingId = null;
      let gdmNumber = null;
      let onRoadTime = null;
      let unloadTime = null;

      if (plan.stage !== STAGES.PARKING_LOT) {
        bookingSerial += 1;
        bookingId = formatDocumentNumber('BOOKING', year, month, bookingSerial);
        onRoadTime = hoursAfter(createdAt, 4 + Math.floor(Math.random() * 20));
        gdmSerial += 1;
        gdmNumber = formatDocumentNumber('GDM', year, month, gdmSerial);
      }

      if ([STAGES.UNLOAD, STAGES.DONE, STAGES.ARCHIVED].includes(plan.stage)) {
        unloadTime = hoursAfter(onRoadTime, 24 + Math.floor(Math.random() * 48));
      }

      const booking = await createBooking(client, master, {
        stage: plan.stage,
        createdAt,
        onRoadTime,
        unloadTime,
        bookingId,
        gdmNumber,
        index: globalIndex,
      });

      bookings.push(booking);
      globalIndex += 1;
    }
  }

  await reserveSequence(client, 'BOOKING', year, month, bookingSerial);
  await reserveSequence(client, 'GDM', year, month, gdmSerial);

  return { bookings, year, month, yy };
}

async function seedInvoices(client, bookings, year, month) {
  const eligible = bookings.filter(
    (b) => [STAGES.DONE, STAGES.ARCHIVED].includes(b.stage) && b.booking_id
  );

  const recipients = [
    'M/s. Coastal Trading Corporation\n12, Industrial Estate, Chennai – 600032\nGSTIN: 33AABCC1234D1Z5',
    'Peninsula Logistics Pvt Ltd\nPlot 45, Gachibowli, Hyderabad – 500032\nGSTIN: 36AABCP5678E1Z9',
    'Southern Agro Distributors\nNH-16, Vijayawada – 520001\nGSTIN: 37AABCS9012F1Z3',
    'Metro Wholesale Mart\nMIDC Area, Pune – 411057\nGSTIN: 27AABCM3456G1Z7',
  ];

  const usedIds = new Set();
  const take = (count) => {
    const available = eligible.filter((b) => !usedIds.has(b.id));
    const group = pickN(available, count);
    group.forEach((b) => usedIds.add(b.id));
    return group;
  };

  const groups = [
    take(3),
    take(2),
    take(4),
  ].filter((g) => g.length >= 2);

  let invoiceSerial = 0;
  const invoices = [];

  for (let i = 0; i < groups.length; i += 1) {
    invoiceSerial += 1;
    const invoiceNumber = formatDocumentNumber('INVOICE', year, month, invoiceSerial);
    const createdAt = daysAgo(20 + i * 5);

    const invoice = await insertRow(client, 'invoices', {
      invoice_number: invoiceNumber,
      recipient_details: recipients[i % recipients.length],
      created_at: createdAt,
      updated_at: createdAt,
      created_by: SEED_USER,
      updated_by: SEED_USER,
    });

    for (const booking of groups[i]) {
      await client.query(
        'UPDATE bookings SET invoice_id = $1, updated_at = $2 WHERE id = $3',
        [invoice.id, createdAt, booking.id]
      );
    }

    invoices.push(invoice);
  }

  await reserveSequence(client, 'INVOICE', year, month, invoiceSerial);
  return invoices;
}

async function seedDevData(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('  Seeding master data...');
    const master = await seedMasterData(client);

    console.log('  Seeding bookings (30 across all stages)...');
    const { bookings, year, month } = await seedBookings(client, master);

    console.log('  Seeding invoices...');
    const invoices = await seedInvoices(client, bookings, year, month);

    await client.query('COMMIT');

    console.log(`  Master: ${master.locations.length} locations, ${master.truckIds.length} trucks, ${master.transporterIds.length} transporters`);
    console.log(`  Bookings: ${bookings.length} (${bookings.filter((b) => b.stage === STAGES.PARKING_LOT).length} parking, ${bookings.filter((b) => b.stage === STAGES.ON_ROAD).length} on road, etc.)`);
    console.log(`  Invoices: ${invoices.length}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seedDevData };

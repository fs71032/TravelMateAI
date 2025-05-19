/**
 * ERD akademik TravelMateAI — i strukturuar për shpjegim te profesori.
 * Run: node backend/scripts/generate_er_diagram.js
 */
const fs = require('fs');
const path = require('path');

const AUDIT_COLS = new Set(['created_by', 'updated_by', 'created_at', 'updated_at']);

/** Numërimi 1–24: së pari 10 të detyrueshme + files, pastaj 14 të domenit */
const TABLE_CATALOG = [
  { n: 1, name: 'roles', zone: 'mandatory', sq: 'Rolet (Admin, User…)' },
  { n: 2, name: 'permissions', zone: 'mandatory', sq: 'Lejet e aksesit' },
  { n: 3, name: 'role_permissions', zone: 'mandatory', sq: 'Leje ↔ Rol (N:N)' },
  { n: 4, name: 'user_roles', zone: 'mandatory', sq: 'Përdorues ↔ Rol (N:N)' },
  { n: 5, name: 'users', zone: 'mandatory', sq: 'Llogaritë e përdoruesve' },
  { n: 6, name: 'refresh_tokens', zone: 'mandatory', sq: 'Sesionet / JWT refresh' },
  { n: 7, name: 'settings', zone: 'mandatory', sq: 'Konfigurime sistemi' },
  { n: 8, name: 'notifications', zone: 'mandatory', sq: 'Njoftimet në platformë' },
  { n: 9, name: 'audit_logs', zone: 'mandatory', sq: 'Gjurmë auditimi' },
  { n: 10, name: 'files', zone: 'mandatory', sq: 'Skedarë (avatar, PDF…)' },
  { n: 11, name: 'destinations', zone: 'domain', sq: 'Destinacionet' },
  { n: 12, name: 'trip_plans', zone: 'domain', sq: 'Planet e udhëtimit' },
  { n: 13, name: 'itinerary_items', zone: 'domain', sq: 'Ditët e itinerarit' },
  { n: 14, name: 'booking_suppliers', zone: 'domain', sq: 'Furnizuesit (hotel, etj.)' },
  { n: 15, name: 'bookings', zone: 'domain', sq: 'Rezervimet' },
  { n: 16, name: 'invoices', zone: 'domain', sq: 'Faturat' },
  { n: 17, name: 'payments', zone: 'domain', sq: 'Pagesat' },
  { n: 18, name: 'guides', zone: 'domain', sq: 'Guidat lokale' },
  { n: 19, name: 'travel_groups', zone: 'domain', sq: 'Grupet e udhëtimit' },
  { n: 20, name: 'group_members', zone: 'domain', sq: 'Anëtarët e grupit' },
  { n: 21, name: 'chat_rooms', zone: 'domain', sq: 'Dhomat e chat-it' },
  { n: 22, name: 'messages', zone: 'domain', sq: 'Mesazhet' },
  { n: 23, name: 'reviews', zone: 'domain', sq: 'Vlerësimet (polimorfike)' },
  { n: 24, name: 'favorites', zone: 'domain', sq: 'Të preferuarat (polimorfike)' }
];

/** Kolonat kryesore për shfaqje (profesori sheh thelbin, jo çdo detaj) */
const KEY_COLUMNS = {
  roles: ['name', 'description'],
  permissions: ['name', 'description'],
  role_permissions: ['role_id', 'permission_id'],
  user_roles: ['user_id', 'role_id', 'assigned_at'],
  users: ['first_name', 'last_name', 'email', 'password_hash', 'is_active'],
  refresh_tokens: ['user_id', 'token_hash', 'expires_at', 'revoked_at'],
  settings: ['user_id', 'key', 'value', 'description'],
  notifications: ['user_id', 'type', 'title', 'is_read'],
  audit_logs: ['user_id', 'action', 'entity', 'entity_id', 'ip_address'],
  files: ['entity', 'entity_id', 'filename', 'file_path', 'uploaded_by'],
  destinations: ['name', 'location', 'category', 'rating'],
  trip_plans: ['name', 'destination_id', 'user_id', 'days', 'planned_date'],
  itinerary_items: ['trip_plan_id', 'day', 'title', 'order_index'],
  booking_suppliers: ['name', 'type', 'email'],
  bookings: ['trip_plan_id', 'supplier_id', 'type', 'status', 'amount'],
  invoices: ['user_id', 'booking_id', 'amount', 'status'],
  payments: ['user_id', 'booking_id', 'amount', 'method'],
  guides: ['name', 'language', 'specialty', 'rating'],
  travel_groups: ['name', 'owner_id', 'description'],
  group_members: ['travel_group_id', 'user_id', 'role'],
  chat_rooms: ['name', 'is_private'],
  messages: ['room', 'from_user_id', 'to_user_id', 'content'],
  reviews: ['entity', 'entity_id', 'user_id', 'rating'],
  favorites: ['user_id', 'entity', 'entity_id']
};

/** Pozicion absolut — 2 seksione horizontale */
const POSITIONS = {
  roles: { x: 50, y: 150 },
  permissions: { x: 50, y: 340 },
  role_permissions: { x: 50, y: 530 },
  user_roles: { x: 300, y: 240 },
  users: { x: 300, y: 430 },
  refresh_tokens: { x: 560, y: 150 },
  settings: { x: 560, y: 310 },
  notifications: { x: 560, y: 470 },
  audit_logs: { x: 560, y: 630 },
  files: { x: 560, y: 830 },

  destinations: { x: 860, y: 150 },
  trip_plans: { x: 860, y: 350 },
  itinerary_items: { x: 860, y: 560 },
  guides: { x: 860, y: 760 },
  booking_suppliers: { x: 1120, y: 150 },
  bookings: { x: 1120, y: 350 },
  invoices: { x: 1120, y: 560 },
  payments: { x: 1120, y: 720 },
  travel_groups: { x: 1380, y: 150 },
  group_members: { x: 1380, y: 330 },
  chat_rooms: { x: 1380, y: 510 },
  messages: { x: 1380, y: 690 },
  reviews: { x: 1380, y: 870 },
  favorites: { x: 1380, y: 1050 }
};

/** Lidhjet kryesore për shpjegim (linja të plota) */
const PRIMARY_RELATIONS = [
  { from: 'permissions', to: 'role_permissions', label: 'N:N' },
  { from: 'roles', to: 'role_permissions', label: '' },
  { from: 'roles', to: 'user_roles', label: '' },
  { from: 'users', to: 'user_roles', label: 'N:N' },
  { from: 'users', to: 'refresh_tokens', label: '1:N' },
  { from: 'users', to: 'settings', label: '1:N' },
  { from: 'users', to: 'notifications', label: '1:N' },
  { from: 'users', to: 'audit_logs', label: '1:N' },
  { from: 'users', to: 'files', label: 'uploaded_by' },
  { from: 'destinations', to: 'trip_plans', label: '1:N' },
  { from: 'users', to: 'trip_plans', label: '1:N' },
  { from: 'trip_plans', to: 'itinerary_items', label: '1:N' },
  { from: 'booking_suppliers', to: 'bookings', label: '1:N' },
  { from: 'trip_plans', to: 'bookings', label: '1:N' },
  { from: 'bookings', to: 'invoices', label: '1:N' },
  { from: 'bookings', to: 'payments', label: '1:N' },
  { from: 'users', to: 'travel_groups', label: 'owner' },
  { from: 'travel_groups', to: 'group_members', label: '1:N' },
  { from: 'users', to: 'group_members', label: '1:N' },
  { from: 'chat_rooms', to: 'messages', label: '1:N' },
  { from: 'users', to: 'messages', label: 'from/to' },
  { from: 'users', to: 'reviews', label: '1:N' },
  { from: 'users', to: 'favorites', label: '1:N' }
];

const TABLE_W = 220;
const ROW_H = 21;
const HEADER_H = 30;
const ZONE_COLORS = {
  mandatory: { header: '#4a86c7', stroke: '#1c4587', fill: '#e8f0fe', text: '#ffffff' },
  domain: { header: '#6aa84f', stroke: '#38761d', fill: '#e8f5e9', text: '#ffffff' }
};

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadSchema(db) {
  const tables = {};
  for (const entry of TABLE_CATALOG) {
    const table = entry.name;
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${table})`).all();
    const fkByColumn = {};
    for (const fk of foreignKeys) fkByColumn[fk.from] = fk.table;

    const keySet = new Set(KEY_COLUMNS[table] || []);
    const display = [];

    display.push(columns.find((c) => c.pk === 1) || { name: 'id', pk: 1, type: 'TEXT' });

    for (const colName of KEY_COLUMNS[table] || []) {
      const col = columns.find((c) => c.name === colName);
      if (col && !col.pk) {
        display.push({
          name: col.name,
          type: col.type,
          pk: false,
          fk: fkByColumn[col.name] || null
        });
      }
    }

    display.push({ separator: true, label: 'audit: created_by, updated_by, created_at, updated_at' });

    tables[table] = {
      meta: entry,
      displayColumns: display,
      foreignKeys
    };
  }
  return tables;
}

function assignLayout(schema) {
  const positioned = {};
  for (const entry of TABLE_CATALOG) {
    const pos = POSITIONS[entry.name];
    const def = schema[entry.name];
    const rows = def.displayColumns;
    const height = HEADER_H + rows.length * ROW_H + 6;
    const colors = ZONE_COLORS[entry.zone];

    positioned[entry.name] = {
      x: pos.x,
      y: pos.y,
      height,
      columns: rows,
      meta: entry,
      colors,
      title: `${String(entry.n).padStart(2, '0')}. ${entry.name}`
    };
  }
  return positioned;
}

function tableXml(name, def) {
  const rows = def.columns;
  const { header, stroke } = def.colors;
  const parts = [];

  parts.push(
    `<mxCell id="${name}" parent="1" value="${esc(def.title)}" style="shape=table;startSize=${HEADER_H};container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=0;columnLines=1;fontStyle=1;align=center;resizeLast=1;html=1;fillColor=${header};strokeColor=${stroke};fontColor=#ffffff;rounded=1;shadow=1;" vertex="1">`,
    `<mxGeometry x="${def.x}" y="${def.y}" width="${TABLE_W}" height="${def.height}" as="geometry"/>`,
    `</mxCell>`
  );

  rows.forEach((col, index) => {
    const rowId = `${name}_r${index}`;
    const y = HEADER_H + index * ROW_H;
    let keyLabel = '';
    if (col.separator) keyLabel = '∗';
    else if (col.pk) keyLabel = 'PK';
    else if (col.fk) keyLabel = 'FK';

    const label = col.separator ? col.label : col.fk ? `${col.name} → ${col.fk}` : col.name;
    const italic = col.separator ? 'fontStyle=2;fontSize=9;fontColor=#64748b;' : col.pk ? 'fontStyle=4;' : 'fontSize=10;';

    parts.push(
      `<mxCell id="${rowId}" parent="${name}" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=#ffffff;collapsible=0;strokeColor=${stroke};" vertex="1">`,
      `<mxGeometry y="${y}" width="${TABLE_W}" height="${ROW_H}" as="geometry"/>`,
      `</mxCell>`,
      `<mxCell id="${rowId}_k" parent="${rowId}" value="${esc(keyLabel)}" style="shape=partialRectangle;connectable=0;fillColor=none;align=center;fontStyle=1;fontSize=9;strokeColor=${stroke};" vertex="1">`,
      `<mxGeometry width="30" height="${ROW_H}" as="geometry"/>`,
      `</mxCell>`,
      `<mxCell id="${rowId}_n" parent="${rowId}" value="${esc(label)}" style="shape=partialRectangle;connectable=0;fillColor=none;align=left;spacingLeft=6;strokeColor=${stroke};${italic}" vertex="1">`,
      `<mxGeometry x="30" width="${TABLE_W - 30}" height="${ROW_H}" as="geometry"/>`,
      `</mxCell>`
    );
  });

  return parts.join('\n');
}

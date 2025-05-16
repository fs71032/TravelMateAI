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
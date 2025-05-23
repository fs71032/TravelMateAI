/**
 * Generates backend/openapi.json from routes/index.js.
 * Run: node scripts/generate_openapi.js
 */
const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '..', 'routes', 'index.js');
const outPath = path.join(__dirname, '..', 'openapi.json');

const TAG_LABELS = {
  health: 'Health',
  auth: 'Authentication',
  'refresh-tokens': 'Authentication',
  itinerary: 'Itinerary',
  notifications: 'Notifications',
  chat: 'Chat',
  destinations: 'Destinations',
  bookings: 'Bookings',
  users: 'Users',
  roles: 'RBAC',
  permissions: 'RBAC',
  'role-permissions': 'RBAC',
  'user-roles': 'RBAC',
  settings: 'Platform',
  guides: 'Guides',
  'travel-groups': 'Travel Groups',
  'group-members': 'Travel Groups',
  'booking-suppliers': 'Suppliers',
  invoices: 'Billing',
  payments: 'Billing',
  files: 'Files',
  reviews: 'Reviews',
  favorites: 'Favorites',
  search: 'Search',
  export: 'Data Export/Import',
  import: 'Data Export/Import',
  reports: 'Reports',
  'audit-logs': 'Audit'
};

function tagFor(routePath) {
  const segment = routePath.split('/').filter(Boolean)[0];
  return TAG_LABELS[segment] || 'API';
}

function toOpenApiPath(routePath) {
  return `/api${routePath.startsWith('/') ? routePath : `/${routePath}`}`;
}

function summaryFor(method, routePath, handler) {
  const resource = routePath.replace(/^\//, '').replace(/:[^/]+/g, '{id}');
  const action = {
    get: routePath.includes(':') ? 'Get by ID' : 'List',
    post: 'Create',
    patch: 'Update',
    put: 'Update',
    delete: 'Delete'
  }[method];
  return `${action} ${resource}`.replace(/\s+/g, ' ').trim();
}

function parseRoutes(source) {
  const re = /router\.(get|post|patch|put|delete)\(\s*'([^']+)'/g;
  const routes = [];
  let match;
  while ((match = re.exec(source)) !== null) {
    const method = match[1];
    const routePath = match[2];
    const line = source.slice(match.index, source.indexOf('\n', match.index));
    const requiresAuth = line.includes('requireAuth');
    const adminMatch = line.match(/requireRole\(\s*'([^']+)'\s*\)/);
    routes.push({
      method,
      routePath,
      requiresAuth,
      adminRole: adminMatch ? adminMatch[1] : null,
      handler: (line.match(/(\w+Controller\.\w+)/) || [])[1] || 'handler'
    });
  }
  return routes;
}

function securityFor(route) {
  if (!route.requiresAuth) return [];
  return [{ bearerAuth: [] }];
}

function parametersFor(routePath, method) {
  const params = [];
  const pathParams = routePath.match(/:([A-Za-z0-9_]+)/g) || [];
  for (const p of pathParams) {
    const name = p.slice(1);
    params.push({
      name,
      in: 'path',
      required: true,
      schema: { type: name === 'table' ? 'string' : 'integer' },
      description: name === 'table' ? 'Table name to export/import' : `${name} identifier`
    });
  }

  if (method === 'get' && routePath === '/search') {
    params.push(
      { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search query' },
      { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
      { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
      { name: 'fts', in: 'query', schema: { type: 'boolean' }, description: 'Use full-text search' }
    );
  }

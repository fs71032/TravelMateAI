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

  if (method === 'get' && !routePath.includes(':') && !['/health', '/search', '/itinerary/status', '/chat/history'].includes(routePath)) {
    params.push(
      { name: 'limit', in: 'query', schema: { type: 'integer' } },
      { name: 'offset', in: 'query', schema: { type: 'integer' } }
    );
  }

  return params.length ? params : undefined;
}

function requestBodyFor(method, routePath) {
  if (!['post', 'patch', 'put'].includes(method)) return undefined;
  if (method === 'post' && routePath.startsWith('/import/')) {
    return {
      required: true,
      content: {
        'application/json': { schema: { type: 'object', additionalProperties: true } },
        'text/csv': { schema: { type: 'string' } }
      }
    };
  }
  return {
    required: true,
    content: {
      'application/json': {
        schema: { type: 'object', additionalProperties: true }
      }
    }
  };
}

function responsesFor(method) {
  const base = {
    200: { description: 'Success' },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized — JWT required or invalid' },
    403: { description: 'Forbidden — insufficient role' },
    404: { description: 'Not found' },
    500: { description: 'Server error' }
  };
  if (method === 'post') base[201] = { description: 'Created' };
  if (method === 'delete') base[204] = { description: 'Deleted' };
  return base;
}

function buildSpec(routes) {
  const paths = {};

  for (const route of routes) {
    const apiPath = toOpenApiPath(route.routePath);
    if (!paths[apiPath]) paths[apiPath] = {};

    const op = {
      tags: [tagFor(route.routePath)],
      summary: summaryFor(route.method, route.routePath, route.handler),
      operationId: `${route.method}_${route.routePath.replace(/[/:]/g, '_').replace(/^_/, '')}`,
      responses: responsesFor(route.method)
    };

    const sec = securityFor(route);
    if (sec.length) op.security = sec;

    if (route.adminRole) {
      op.description = `Requires authenticated user with role: ${route.adminRole}`;
    } else if (route.requiresAuth) {
      op.description = 'Requires valid JWT access token (Authorization: Bearer …)';
    }

    const params = parametersFor(route.routePath, route.method);
    if (params) op.parameters = params;

    const body = requestBodyFor(route.method, route.routePath);
    if (body) op.requestBody = body;

    paths[apiPath][route.method] = op;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'TravelMate AI Backend API',
      version: '1.0.0',
      description:
        'REST API for TravelMate AI — travel planning, bookings, chat, RBAC, and platform services.\n\n' +
        '**Authentication:** Most endpoints require `Authorization: Bearer <accessToken>` from `POST /api/auth/login`.\n\n' +
        '**Interactive docs:** When the backend is running, open [http://localhost:4000/api/docs](http://localhost:4000/api/docs).\n\n' +
        '**Default admin (dev):** `admin@travelmate.ai` / `Test1234`'
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local development' }],
    tags: [...new Set(routes.map((r) => tagFor(r.routePath)))].sort().map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from POST /api/auth/login or /api/auth/refresh'
        }
      }
    }
  };
}

const source = fs.readFileSync(routesPath, 'utf8');
const routes = parseRoutes(source);
const spec = buildSpec(routes);
fs.writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');

console.log(`[openapi] Wrote ${routes.length} operations to ${outPath}`);

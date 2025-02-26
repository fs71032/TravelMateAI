function sendServiceResult(res, result, options = {}) {
  if (result.error) {
    const payload = { message: result.error.message };
    if (result.error.details) payload.error = result.error.details;
    return res.status(result.error.status).json(payload);
  }

  if (result.status === 204) {
    return res.status(204).send();
  }

  const status = result.status || 200;

  if (result.headers && result.data !== undefined && typeof result.data === 'string') {
    Object.entries(result.headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.send(result.data);
  }

  if (result.format === 'excel') {
    return res.status(status).json(result.data);
  }

  if (options.mergeBody && result.data !== undefined) {
    return res.status(status).json({ ...result.data, ...options.mergeBody });
  }

  if (result.data !== undefined) {
    return res.status(status).json(result.data);
  }

  return res.sendStatus(status);
}

async function sendServiceResultAsync(res, promise, options = {}) {
  try {
    const result = await promise;
    if (result.format === 'excel' && result.data && options.buildExcel) {
      const buffer = await options.buildExcel(result.data.table || 'export', result.data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.data.table || 'export'}.xlsx"`);
      return res.send(Buffer.from(buffer));
    }
    return sendServiceResult(res, result, options);
  } catch (error) {
    console.error('[controller]', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = { sendServiceResult, sendServiceResultAsync };

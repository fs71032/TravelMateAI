const destinationRepository = require('../repositories/destinationRepository');

function list() {
  return { data: destinationRepository.listDestinations() };
}

function sync() {
  destinationRepository.syncDestinations();
}

module.exports = { list, sync };

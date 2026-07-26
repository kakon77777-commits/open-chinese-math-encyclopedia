import Ajv2020 from 'ajv/dist/2020.js'

export function createMkoValidator(schema) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: false,
  })
  return ajv.compile(schema)
}

export function formatSchemaErrors(objectId, errors = []) {
  return errors.map(error => {
    const path = error.instancePath || '/'
    const params = Object.keys(error.params || {}).length ? ` ${JSON.stringify(error.params)}` : ''
    return `${objectId}: schema ${path} ${error.message || 'validation error'}${params}`
  })
}

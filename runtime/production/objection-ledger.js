export function mergeVerificationIntoLedger(previousLedger, verificationReport) {
  if (!Array.isArray(previousLedger)) throw new TypeError('previousLedger must be an array')
  if (!Array.isArray(verificationReport?.objections)) throw new TypeError('verificationReport.objections must be an array')

  const nextLedger = structuredClone(previousLedger)
  const seen = new Set(nextLedger.map(item => item.objection_id))

  for (const objection of verificationReport.objections) {
    if (seen.has(objection.objection_id)) {
      throw new Error(`duplicate objection_id ${objection.objection_id}`)
    }
    seen.add(objection.objection_id)
    nextLedger.push(structuredClone(objection))
  }

  return nextLedger
}

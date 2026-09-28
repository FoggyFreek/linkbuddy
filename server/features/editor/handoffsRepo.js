// Single-use bookkeeping for GigBuddy handoff tokens.

// True when this call consumed the nonce; false when it was already used.
export async function consumeHandoffNonce(executor, nonce, expSeconds) {
  const { rowCount } = await executor.query(
    `INSERT INTO consumed_handoffs (nonce, expires_at)
     VALUES ($1, to_timestamp($2))
     ON CONFLICT (nonce) DO NOTHING`,
    [nonce, expSeconds],
  )
  return rowCount > 0
}

export async function purgeConsumedHandoffs(executor) {
  const { rowCount } = await executor.query('DELETE FROM consumed_handoffs WHERE expires_at < NOW()')
  return rowCount
}

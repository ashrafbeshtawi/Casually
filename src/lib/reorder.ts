/**
 * Persist the new order of items to the database by calling PATCH on each item.
 *
 * @param items - The items in their new order. Each must have an `id` field.
 * @param apiBase - The base API path, e.g. '/api/long-term-tasks'
 */
export async function reorderItems(
  items: Array<{ id: string }>,
  apiBase: string
) {
  await Promise.all(
    items.map((item, index) =>
      fetch(`${apiBase}/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: index }),
      })
    )
  )
}

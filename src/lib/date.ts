/**
 * Data LOCAL do jogador no formato yyyy-mm-dd.
 *
 * As colunas de prazo (`due_date`) são `date`, sem fuso. Comparar com
 * `new Date().toISOString().slice(0, 10)` usa o dia em UTC, que no Brasil
 * (UTC-3) já é "amanhã" a partir das 21h — e uma tarefa com prazo de hoje
 * passa a contar como vencida, perdendo o bônus de prazo.
 */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

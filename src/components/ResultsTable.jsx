function ResultsTable({ className, results, finalists = [], wildcards = [], showDenOrigin = false, avgKey = 'avgExceptSlowest' }) {
  if (!results || results.length === 0) {
    return null
  }

  const isFinalist = (racerId) => finalists.includes(racerId)
  const isWildcard = (racerId) => wildcards.includes(racerId)

  return (
    <div>
      <h3 className="text-center font-medium text-gray-800 mb-1">{className}</h3>
      <table className="results-table w-full text-sm">
        <thead>
          <tr>
            <th className="w-8"></th>
            <th className="w-4"></th>
            <th className="text-left">Scout (Car Number)</th>
            <th className="text-center">Avg</th>
            <th className="text-center">Best</th>
            <th className="text-center">Worst</th>
          </tr>
        </thead>
        <tbody>
          {results.map((racer, index) => {
            const place = index + 1
            const placeClass = place <= 3 ? `place-${place}` : ''
            const label = isFinalist(racer.racerId) 
              ? 'finalist' 
              : isWildcard(racer.racerId) 
                ? 'wildcard' 
                : ''
            
            // Use the specified average key
            const avgTime = racer[avgKey] || racer.avgTime || 0
            
            return (
              <tr key={racer.racerId}>
                <td className={`text-center ${placeClass}`}>
                  {place <= 3 ? place : ''}
                </td>
                <td></td>
                <td>
                  {racer.firstName} {racer.lastName} (#{racer.carNumber})
                  {label && <span className="text-xs italic text-gray-500 ml-2">{label}</span>}
                  {showDenOrigin && racer.originalClass && (
                    <span className="text-xs italic text-gray-500 ml-2">{racer.originalClass} finalist</span>
                  )}
                </td>
                <td className="text-right font-mono">{avgTime.toFixed(4)}</td>
                <td className="text-right font-mono">{racer.bestTime.toFixed(3)}</td>
                <td className="text-right font-mono">{racer.worstTime.toFixed(3)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ResultsTable

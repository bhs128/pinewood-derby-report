function ResultsTable({ 
  className, 
  results, 
  finalists = [], 
  wildcards = [], 
  showDenOrigin = false, 
  avgKey = 'avgExceptSlowest',
  excludedGrandFinalsWinners = []  // Array of racer keys (name|carNumber) who won grand finals
}) {
  if (!results || results.length === 0) {
    return null
  }

  const isFinalist = (racerId) => finalists.includes(racerId)
  const isWildcard = (racerId) => wildcards.includes(racerId)
  
  // Check if a racer is a grand finals winner (excluded from den rankings)
  const isGrandFinalsWinner = (racer) => {
    const key = `${racer.firstName}|${racer.lastName}|${racer.carNumber}`
    return excludedGrandFinalsWinners.includes(key)
  }

  // Calculate adjusted places - grand finals winners are skipped for 1st/2nd/3rd
  // but they still appear in the list with no place number
  const getAdjustedPlace = (index, results) => {
    // Count how many GF winners appear before this index
    let gfWinnersBefore = 0
    for (let i = 0; i < index; i++) {
      if (isGrandFinalsWinner(results[i])) {
        gfWinnersBefore++
      }
    }
    // If this racer is a GF winner, they don't get a place
    if (isGrandFinalsWinner(results[index])) {
      return null
    }
    // Adjusted place = index - GF winners before + 1
    return index - gfWinnersBefore + 1
  }

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
            const adjustedPlace = getAdjustedPlace(index, results)
            const placeClass = adjustedPlace && adjustedPlace <= 3 ? `place-${adjustedPlace}` : ''
            const gfWinner = isGrandFinalsWinner(racer)
            
            const label = gfWinner
              ? 'GF winner'
              : isFinalist(racer.racerId) 
                ? 'finalist' 
                : isWildcard(racer.racerId) 
                  ? 'wildcard' 
                  : ''
            
            // Use the specified average key
            const avgTime = racer[avgKey] || racer.avgTime || 0
            
            return (
              <tr key={racer.racerId} className={gfWinner ? 'opacity-60' : ''}>
                <td className={`text-center ${placeClass}`}>
                  {adjustedPlace && adjustedPlace <= 3 ? adjustedPlace : ''}
                </td>
                <td></td>
                <td>
                  {racer.firstName} {racer.lastName} (#{racer.carNumber})
                  {label && <span className={`text-xs italic ml-2 ${gfWinner ? 'text-yellow-600 font-medium' : 'text-gray-500'}`}>{label}</span>}
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

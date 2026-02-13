import { applyClassMapping, performSanityCheck, STANDARD_DEN_NAMES } from './sqliteParser'

/**
 * Format time for display
 * @param {number} time - Time in seconds
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted time
 */
export function formatTime(time, decimals = 3) {
  if (!time || time <= 0) return '-'
  return time.toFixed(decimals)
}

/**
 * Columns to include in CSV/HTML export (in order)
 */
const EXPORT_COLUMNS = [
  'Year', 'FirstName', 'LastName', 'CarNumber', 'CarName', 'Class', 'OriginalClass',
  'RoundID', 'Heat', 'Lane', 'Completed', 'FinishTime', 'FinishPlace',
  'FullName', 'KidCarYear'
]

/**
 * Convert merged data to CSV string
 * @param {Array} mergedData - The merged intermediate data records
 * @returns {string} - CSV formatted string
 */
export function mergedDataToCSV(mergedData) {
  if (!mergedData || mergedData.length === 0) return ''
  
  // Use defined columns, filter to those that exist in data
  const existingColumns = EXPORT_COLUMNS.filter(col => 
    mergedData.some(record => record[col] !== undefined)
  )
  
  // Build CSV
  const rows = [existingColumns.join(',')]
  
  mergedData.forEach(record => {
    const values = existingColumns.map(col => {
      const val = record[col]
      if (val === null || val === undefined) return ''
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const strVal = String(val)
      if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
        return `"${strVal.replace(/"/g, '""')}"`
      }
      return strVal
    })
    rows.push(values.join(','))
  })
  
  return rows.join('\n')
}

/**
 * Download merged data as CSV file
 * @param {Array} mergedData - The merged intermediate data records
 * @param {string} filename - The filename to use (without extension)
 */
export function downloadMergedDataCSV(mergedData, filename = 'merged_race_data') {
  const csv = mergedDataToCSV(mergedData)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Open merged data in a new window as an HTML table
 * @param {Array} mergedData - The merged intermediate data records
 * @param {string} title - Title for the window
 */
export function viewMergedDataAsHTML(mergedData, title = 'Merged Race Data') {
  if (!mergedData || mergedData.length === 0) {
    alert('No data to display')
    return
  }
  
  // Use defined columns, filter to those that exist in data
  const existingColumns = EXPORT_COLUMNS.filter(col => 
    mergedData.some(record => record[col] !== undefined)
  )
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
    h1 { color: #1e40af; margin-bottom: 10px; }
    .stats { color: #666; margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th { background: #1e40af; color: white; padding: 8px 12px; text-align: left; position: sticky; top: 0; }
    td { border: 1px solid #ddd; padding: 6px 10px; }
    tr:nth-child(even) { background: #f9fafb; }
    tr:hover { background: #e5e7eb; }
    .number { text-align: right; font-family: monospace; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="stats">${mergedData.length} records</p>
  <table>
    <thead>
      <tr>${existingColumns.map(col => `<th>${col}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${mergedData.map(record => 
        `<tr>${existingColumns.map(col => {
          const val = record[col]
          const displayVal = val === null || val === undefined ? '' : val
          const isNumber = typeof val === 'number'
          return `<td class="${isNumber ? 'number' : ''}">${displayVal}</td>`
        }).join('')}</tr>`
      ).join('\n      ')}
    </tbody>
  </table>
</body>
</html>
  `
  
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(html)
    newWindow.document.close()
  } else {
    alert('Unable to open new window. Please allow popups for this site.')
  }
}

/**
 * Process race data from intermediate format with class mapping
 * This is the new recommended approach for handling multiple SQLite files
 * @param {Array} intermediateDataSets - Array of { rawRecords, uniqueClasses, year }
 * @param {Object} classMapping - Map from raw class name to standard den name
 * @param {number} year - The year for all data
 * @returns {Object} - Processed race data with statistics and sanity check results
 */
export function processIntermediateData(intermediateDataSets, classMapping, year) {
  // Apply class mapping to all records from all files and merge into single data table
  // This mergedData is the canonical data source for all further processing/display
  const mergedData = []
  
  intermediateDataSets.forEach(({ rawRecords }) => {
    const mappedRecords = applyClassMapping(rawRecords, classMapping, year)
    mergedData.push(...mappedRecords)
  })
  
  // Perform sanity check
  const sanityCheck = performSanityCheck(mergedData, 'Grand Finals')
  
  // Get unique standard classes that have data
  const classesWithData = [...new Set(mergedData.map(r => r.Class))]
  
  // Create classes array in correct den order
  const denOrder = STANDARD_DEN_NAMES
  const classes = classesWithData
    .sort((a, b) => denOrder.indexOf(a) - denOrder.indexOf(b))
    .map((name, i) => ({
      id: i + 1,
      name: name
    }))
  
  // Extract unique racers from mergedData
  const racerMap = new Map()
  mergedData.forEach(record => {
    const key = record.KidCarYear
    if (!racerMap.has(key)) {
      racerMap.set(key, {
        racerId: key, // Use KidCarYear as unique ID
        firstName: record.FirstName,
        lastName: record.LastName,
        carNumber: record.CarNumber,
        carName: record.CarName || '',
        fullName: record.FullName,
        kidCarYear: record.KidCarYear,
        year: record.Year
      })
    }
  })
  const racers = Array.from(racerMap.values())
  
  // Convert mergedData to race results format for statistics calculation
  const raceResults = mergedData
    .filter(r => r.FinishTime && r.FinishTime > 0)
    .map(r => ({
      racerId: r.KidCarYear,
      firstName: r.FirstName,
      lastName: r.LastName,
      carNumber: r.CarNumber,
      carName: r.CarName || '',
      classId: classes.find(c => c.name === r.Class)?.id || 0,
      className: r.Class,
      roundId: r.RoundID,
      heat: r.Heat,
      lane: r.Lane,
      finishTime: r.FinishTime,
      finishPlace: r.FinishPlace,
      completed: r.Completed,
      kidCarYear: r.KidCarYear
    }))
  
  // Collect all finish times for histogram
  const allTimes = raceResults.map(r => ({
    time: r.finishTime,
    classId: r.classId,
    className: r.className
  }))
  
  // Calculate statistics per racer per class
  const racerStats = calculateRacerStatsFromMapped(raceResults)
  
  // Group results by class
  const resultsByClass = {}
  classes.forEach(cls => {
    const classResults = racerStats.filter(r => r.className === cls.name)
    // Sort by average time (excluding slowest)
    classResults.sort((a, b) => a.avgExceptSlowest - b.avgExceptSlowest)
    // Use lowercase name as key for compatibility with existing code
    const classKey = cls.name.toLowerCase()
    resultsByClass[classKey] = classResults
  })
  
  // Identify finalists (top 1 from each den)
  const finalists = []
  const wildcards = []
  
  const denClasses = classes.filter(c => c.name !== 'Grand Finals')
  
  denClasses.forEach(cls => {
    const classKey = cls.name.toLowerCase()
    const results = resultsByClass[classKey]
    if (results && results.length > 0) {
      finalists.push(results[0].racerId)
    }
  })
  
  // Identify wildcards (fastest non-finalists)
  const allDenResults = denClasses.flatMap(cls => resultsByClass[cls.name.toLowerCase()] || [])
  const nonFinalists = allDenResults.filter(r => !finalists.includes(r.racerId))
  nonFinalists.sort((a, b) => a.avgExceptSlowest - b.avgExceptSlowest)
  
  // Top wildcards to fill grand finals
  const wildcardCount = Math.max(0, 12 - finalists.length)
  nonFinalists.slice(0, wildcardCount).forEach(r => {
    wildcards.push(r.racerId)
  })
  
  // Get grand finals results
  const grandFinalsResults = resultsByClass['grand finals'] || []
  
  // Calculate totals
  const totalHeats = new Set(raceResults.map(r => `${r.classId}-${r.heat}`)).size
  const totalRaces = raceResults.length
  
  return {
    classes,
    racers,
    allTimes,
    resultsByClass,
    finalists,
    wildcards,
    grandFinalsResults,
    totalHeats,
    totalRaces,
    sanityCheck, // Include sanity check results
    mergedData // The canonical merged intermediate data table for all display/analysis
  }
}

/**
 * Calculate statistics for each racer from mapped records
 * @param {Array} raceResults - Race results with mapped class names
 * @returns {Array} - Racer statistics
 */
function calculateRacerStatsFromMapped(raceResults) {
  // Group by kidCarYear + className
  const groups = new Map()
  
  raceResults.forEach(result => {
    const key = `${result.kidCarYear}|${result.className}`
    if (!groups.has(key)) {
      groups.set(key, {
        racerId: result.racerId,
        firstName: result.firstName,
        lastName: result.lastName,
        carNumber: result.carNumber,
        carName: result.carName,
        classId: result.classId,
        className: result.className,
        kidCarYear: result.kidCarYear,
        times: []
      })
    }
    groups.get(key).times.push(result.finishTime)
  })
  
  // Calculate stats for each group
  return Array.from(groups.values()).map(group => {
    const times = group.times.filter(t => t > 0)
    const n = times.length
    
    if (n === 0) {
      return {
        ...group,
        avgTime: 0,
        avgExceptSlowest: 0,
        bestTime: 0,
        worstTime: 0,
        median: 0,
        stdDev: 0,
        raceCount: 0
      }
    }
    
    const sorted = [...times].sort((a, b) => a - b)
    const sum = times.reduce((a, b) => a + b, 0)
    const avg = sum / n
    const max = Math.max(...times)
    const min = Math.min(...times)
    
    // Average excluding slowest time
    const avgExceptSlowest = n > 1 
      ? (sum - max) / (n - 1)
      : avg
    
    // Median
    const median = n % 2 === 0
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2
      : sorted[Math.floor(n/2)]
    
    // Standard deviation
    const squaredDiffs = times.map(t => Math.pow(t - avg, 2))
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / n
    const stdDev = Math.sqrt(avgSquaredDiff)
    
    return {
      racerId: group.racerId,
      firstName: group.firstName,
      lastName: group.lastName,
      carNumber: group.carNumber,
      carName: group.carName,
      classId: group.classId,
      className: group.className,
      kidCarYear: group.kidCarYear,
      avgTime: avg,
      avgExceptSlowest,
      bestTime: min,
      worstTime: max,
      median,
      stdDev,
      raceCount: n
    }
  })
}

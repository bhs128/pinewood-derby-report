import { extractRaceData } from './sqliteParser'

/**
 * Process race data from multiple databases and compute statistics
 * @param {Array} databases - Array of database objects
 * @returns {Object} - Processed race data with statistics
 */
export function processRaceData(databases) {
  // Extract data from all databases
  const allData = databases.map(({ db }) => extractRaceData(db))
  
  // Merge classes (deduplicate by name)
  const classMap = new Map()
  allData.forEach(data => {
    data.classes.forEach(cls => {
      if (!classMap.has(cls.name.toLowerCase())) {
        classMap.set(cls.name.toLowerCase(), cls)
      }
    })
  })
  const classes = Array.from(classMap.values())
  
  // Merge racers (deduplicate by name + car number)
  const racerMap = new Map()
  allData.forEach(data => {
    data.racers.forEach(racer => {
      const key = `${racer.firstName}|${racer.lastName}|${racer.carNumber}`
      if (!racerMap.has(key)) {
        racerMap.set(key, racer)
      }
    })
  })
  const racers = Array.from(racerMap.values())
  
  // Merge all race results
  const allRaceResults = allData.flatMap(data => data.raceResults)
  
  // Collect all finish times for histogram
  const allTimes = allRaceResults.map(r => ({
    time: r.finishTime,
    classId: r.classId,
    className: r.className
  }))
  
  // Calculate statistics per racer per class
  const racerStats = calculateRacerStats(allRaceResults)
  
  // Group results by class
  const resultsByClass = {}
  classes.forEach(cls => {
    const classResults = racerStats.filter(r => 
      r.className.toLowerCase() === cls.name.toLowerCase()
    )
    // Sort by average time (excluding slowest)
    classResults.sort((a, b) => a.avgExceptSlowest - b.avgExceptSlowest)
    resultsByClass[cls.id] = classResults
  })
  
  // Identify finalists (top 1 from each den)
  const finalists = []
  const wildcards = []
  
  const denClasses = classes.filter(c => 
    !c.name.toLowerCase().includes('grand') && 
    !c.name.toLowerCase().includes('sibling')
  )
  
  denClasses.forEach(cls => {
    const results = resultsByClass[cls.id]
    if (results && results.length > 0) {
      finalists.push(results[0].racerId)
    }
  })
  
  // Identify wildcards (fastest non-finalists)
  const allDenResults = denClasses.flatMap(cls => resultsByClass[cls.id] || [])
  const nonFinalists = allDenResults.filter(r => !finalists.includes(r.racerId))
  nonFinalists.sort((a, b) => a.avgExceptSlowest - b.avgExceptSlowest)
  
  // Top 6 or so wildcards (adjust based on typical grand finals size)
  const wildcardCount = Math.max(0, 12 - finalists.length)
  nonFinalists.slice(0, wildcardCount).forEach(r => {
    wildcards.push(r.racerId)
  })
  
  // Get grand finals results
  const grandFinalsClass = classes.find(c => 
    c.name.toLowerCase().includes('grand')
  )
  const grandFinalsResults = grandFinalsClass 
    ? resultsByClass[grandFinalsClass.id] 
    : []
  
  // Calculate totals
  const totalHeats = new Set(allRaceResults.map(r => `${r.classId}-${r.heat}`)).size
  const totalRaces = allRaceResults.length
  
  return {
    classes,
    racers,
    allTimes,
    resultsByClass,
    finalists,
    wildcards,
    grandFinalsResults,
    totalHeats,
    totalRaces
  }
}

/**
 * Calculate statistics for each racer
 * @param {Array} raceResults - All race results
 * @returns {Array} - Racer statistics
 */
function calculateRacerStats(raceResults) {
  // Group by racer + class
  const groups = new Map()
  
  raceResults.forEach(result => {
    const key = `${result.racerId}|${result.classId}`
    if (!groups.has(key)) {
      groups.set(key, {
        racerId: result.racerId,
        firstName: result.firstName,
        lastName: result.lastName,
        carNumber: result.carNumber,
        carName: result.carName,
        classId: result.classId,
        className: result.className,
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
    
    // Average excluding slowest time (as used in the R analysis)
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

// Cache the SQL.js initialization
let SQL = null

/**
 * Standard den names for mapping
 */
export const STANDARD_DEN_NAMES = [
  "Lion Den",
  "Tiger Den", 
  "Wolf Den",
  "Bear Den",
  "Webelos Den",
  "Arrow of Light",
  "Grand Finals"
]

/**
 * Best-guess mapping from raw class names to standard den names
 */
export function guessStandardDenName(rawClassName) {
  const lower = rawClassName.toLowerCase()
  
  if (lower.includes('lion')) return 'Lion Den'
  if (lower.includes('tiger')) return 'Tiger Den'
  if (lower.includes('wolf') || lower.includes('wolves')) return 'Wolf Den'
  if (lower.includes('bear')) return 'Bear Den'
  if (lower.includes('webelos')) return 'Webelos Den'
  if (lower.includes('arrow') || lower.includes('aol')) return 'Arrow of Light'
  if (lower.includes('grand') || lower.includes('final')) return 'Grand Finals'
  
  // No match - return null to indicate user must map manually
  return null
}

/**
 * Load sql.js from CDN dynamically
 */
function loadSqlJsScript() {
  return new Promise((resolve, reject) => {
    if (window.initSqlJs) {
      resolve(window.initSqlJs)
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js'
    script.onload = () => resolve(window.initSqlJs)
    script.onerror = () => reject(new Error('Failed to load sql.js'))
    document.head.appendChild(script)
  })
}

/**
 * Initialize sql.js (loads the WASM file)
 */
async function initSQL() {
  if (SQL) return SQL
  
  const initSqlJs = await loadSqlJsScript()
  
  SQL = await initSqlJs({
    locateFile: () => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm'
  })
  
  return SQL
}

/**
 * Parse a SQLite database file and return the database object
 * @param {File} file - The SQLite file to parse
 * @returns {Object} - Database object with query methods
 */
export async function parseDatabase(file) {
  const SQL = await initSQL()
  
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  
  // Create database from file
  const db = new SQL.Database(uint8Array)
  
  return {
    name: file.name,
    
    /**
     * Execute a SQL query and return results as array of objects
     */
    query(sql) {
      const results = db.exec(sql)
      if (results.length === 0) return []
      
      const { columns, values } = results[0]
      return values.map(row => {
        const obj = {}
        columns.forEach((col, i) => {
          obj[col] = row[i]
        })
        return obj
      })
    },
    
    /**
     * Get all tables in the database
     */
    getTables() {
      return this.query(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).map(r => r.name)
    },
    
    /**
     * Get raw database object for advanced operations
     */
    getRaw() {
      return db
    },
    
    /**
     * Close the database connection
     */
    close() {
      db.close()
    }
  }
}

/**
 * Extract race data using the standardized intermediate format
 * @param {Object} db - Database object from parseDatabase
 * @param {number} year - The year to use for this database
 * @returns {Object} - Extracted race data with standardized fields
 */
export function extractIntermediateData(db, year) {
  const query = `
    SELECT 
      "${year}" as Year, 
      FirstName, 
      LastName, 
      CarNumber, 
      Class, 
      RoundID, 
      Heat, 
      Lane, 
      Completed, 
      FinishTime, 
      FinishPlace,
      (FirstName || " " || LastName) as FullName,
      (FirstName || " " || LastName || " (#" || CarNumber || "'" || "${year}" || ") - " || Class) as KidCarYear
    FROM RegistrationInfo, RaceChart, Classes 
    WHERE RaceChart.RacerID = RegistrationInfo.RacerID 
      AND RaceChart.ClassID = Classes.ClassID
  `
  
  const results = db.query(query)
  
  // Get unique class names for mapping
  const uniqueClasses = [...new Set(results.map(r => r.Class))]
  
  return {
    rawRecords: results,
    uniqueClasses,
    year
  }
}

/**
 * Apply class name mapping to intermediate data
 * @param {Array} records - Raw records from extractIntermediateData
 * @param {Object} classMapping - Map from raw class name to standard den name
 * @param {number} year - The year for this data
 * @returns {Array} - Records with mapped class names
 */
export function applyClassMapping(records, classMapping, year) {
  return records.map(record => {
    const mappedClass = classMapping[record.Class] || record.Class
    const kidCarYear = `${record.FirstName} ${record.LastName} (#${record.CarNumber}'${year}) - ${mappedClass}`
    
    return {
      ...record,
      OriginalClass: record.Class,
      Class: mappedClass,
      KidCarYear: kidCarYear
    }
  })
}

/**
 * Perform sanity check on merged data
 * Ensures each KidCarYear appears in exactly one den race (excluding Grand Finals)
 * @param {Array} mergedRecords - All merged records with mapped classes
 * @returns {Object} - Sanity check results with warnings
 */
export function performSanityCheck(mergedRecords, grandFinalsClass = 'Grand Finals') {
  const warnings = []
  
  // Get all unique KidCarYear values
  const kidCarYears = [...new Set(mergedRecords.map(r => r.KidCarYear))]
  
  // For each KidCarYear, check which dens they appear in (excluding Grand Finals)
  const denParticipation = new Map()
  
  kidCarYears.forEach(kcy => {
    const participantRecords = mergedRecords.filter(r => r.KidCarYear === kcy)
    const dens = [...new Set(participantRecords.map(r => r.Class))]
      .filter(cls => cls !== grandFinalsClass)
    
    denParticipation.set(kcy, dens)
  })
  
  // Check for issues
  const multiDenRacers = []
  const noDenRacers = []
  
  denParticipation.forEach((dens, kcy) => {
    if (dens.length > 1) {
      multiDenRacers.push({ kidCarYear: kcy, dens })
    } else if (dens.length === 0) {
      // Only in Grand Finals - might be an issue or might be intentional
      noDenRacers.push({ kidCarYear: kcy })
    }
  })
  
  if (multiDenRacers.length > 0) {
    warnings.push({
      type: 'multi-den',
      severity: 'error',
      message: `${multiDenRacers.length} racer(s) appear in multiple den races`,
      details: multiDenRacers
    })
  }
  
  if (noDenRacers.length > 0) {
    warnings.push({
      type: 'no-den',
      severity: 'warning',
      message: `${noDenRacers.length} racer(s) appear only in Grand Finals without a den race`,
      details: noDenRacers
    })
  }
  
  // Check for Grand Finals participants who aren't in a den race
  const grandFinalsKCYs = [...new Set(
    mergedRecords
      .filter(r => r.Class === grandFinalsClass)
      .map(r => r.KidCarYear)
  )]
  
  const gfNotInDen = grandFinalsKCYs.filter(kcy => {
    const dens = denParticipation.get(kcy) || []
    return dens.length === 0
  })
  
  if (gfNotInDen.length > 0 && noDenRacers.length === 0) {
    warnings.push({
      type: 'gf-no-den',
      severity: 'info',
      message: `${gfNotInDen.length} Grand Finals participant(s) have no den race data`,
      details: gfNotInDen.map(kcy => ({ kidCarYear: kcy }))
    })
  }
  
  return {
    isValid: warnings.filter(w => w.severity === 'error').length === 0,
    warnings,
    denParticipation: Object.fromEntries(denParticipation)
  }
}


// Cache the SQL.js initialization
let SQL = null

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
 * Extract race data from a GrandPrix Race Manager database
 * @param {Object} db - Database object from parseDatabase
 * @returns {Object} - Extracted race data
 */
export function extractRaceData(db) {
  // Get classes
  const classes = db.query('SELECT ClassID, Class FROM Classes ORDER BY ClassID')
  
  // Get registration info
  const racers = db.query(`
    SELECT 
      RacerID, CarNumber, CarName, LastName, FirstName, ClassID, RankID
    FROM RegistrationInfo
    WHERE Exclude = 0
    ORDER BY ClassID, LastName, FirstName
  `)
  
  // Get race results with all details
  const raceResults = db.query(`
    SELECT 
      r.RacerID,
      r.FirstName,
      r.LastName,
      r.CarNumber,
      r.CarName,
      c.ClassID,
      c.Class,
      rc.RoundID,
      rc.Heat,
      rc.Lane,
      rc.FinishTime,
      rc.FinishPlace,
      rc.Completed
    FROM RegistrationInfo r
    JOIN RaceChart rc ON r.RacerID = rc.RacerID
    JOIN Classes c ON rc.ClassID = c.ClassID
    WHERE rc.FinishTime IS NOT NULL AND rc.FinishTime > 0
    ORDER BY c.ClassID, rc.Heat, rc.Lane
  `)
  
  return {
    classes: classes.map(c => ({
      id: c.ClassID,
      name: c.Class
    })),
    racers: racers.map(r => ({
      racerId: r.RacerID,
      carNumber: r.CarNumber,
      carName: r.CarName,
      lastName: r.LastName,
      firstName: r.FirstName,
      classId: r.ClassID
    })),
    raceResults: raceResults.map(r => ({
      racerId: r.RacerID,
      firstName: r.FirstName,
      lastName: r.LastName,
      carNumber: r.CarNumber,
      carName: r.CarName,
      classId: r.ClassID,
      className: r.Class,
      roundId: r.RoundID,
      heat: r.Heat,
      lane: r.Lane,
      finishTime: r.FinishTime,
      finishPlace: r.FinishPlace,
      completed: r.Completed
    }))
  }
}

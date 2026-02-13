import { useState, useCallback, useMemo, useEffect } from 'react'
import { STANDARD_DEN_NAMES, guessStandardDenName } from '../utils/sqliteParser'

function ClassMapping({ 
  intermediateData, 
  year, 
  onMappingComplete, 
  onBack 
}) {
  // Collect all unique class names across all files
  const allUniqueClasses = useMemo(() => {
    const classSet = new Set()
    intermediateData.forEach(({ uniqueClasses }) => {
      uniqueClasses.forEach(cls => classSet.add(cls))
    })
    return Array.from(classSet)
  }, [intermediateData])

  // Initialize mapping with best guesses
  const initialMapping = useMemo(() => {
    const mapping = {}
    allUniqueClasses.forEach(cls => {
      mapping[cls] = guessStandardDenName(cls) || ''
    })
    return mapping
  }, [allUniqueClasses])

  const [classMapping, setClassMapping] = useState(initialMapping)
  const [sanityWarnings, setSanityWarnings] = useState([])
  const [showWarningDetails, setShowWarningDetails] = useState({})

  // Check if all classes are mapped
  const allMapped = useMemo(() => {
    return allUniqueClasses.every(cls => classMapping[cls])
  }, [allUniqueClasses, classMapping])

  // Count how many classes are mapped to each standard name
  const mappingCounts = useMemo(() => {
    const counts = {}
    STANDARD_DEN_NAMES.forEach(name => counts[name] = 0)
    Object.values(classMapping).forEach(mapped => {
      if (mapped && counts[mapped] !== undefined) {
        counts[mapped]++
      }
    })
    return counts
  }, [classMapping])

  const handleMappingChange = useCallback((rawClass, standardName) => {
    setClassMapping(prev => ({
      ...prev,
      [rawClass]: standardName
    }))
  }, [])

  const handleContinue = useCallback(() => {
    onMappingComplete(classMapping)
  }, [classMapping, onMappingComplete])

  // Get color styling for mapping status
  const getMappingStatusColor = (rawClass) => {
    const mapped = classMapping[rawClass]
    if (!mapped) return 'border-red-300 bg-red-50'
    return 'border-green-300 bg-green-50'
  }

  // Get warning color for standard den (if mapped multiple times)
  const getStandardDenWarning = (standardName) => {
    const count = mappingCounts[standardName]
    if (count > 1) return 'text-amber-600'
    return ''
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Map Class Names to Standard Dens</h2>
        <p className="text-gray-600 mb-6">
          Match each class name from your database to the corresponding standard den name. 
          This ensures consistent data when merging multiple files.
        </p>

        {/* Year Display */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded">
          <span className="font-medium text-blue-800">Year: {year}</span>
          <span className="text-blue-600 ml-2 text-sm">
            (Change this in the next step if needed)
          </span>
        </div>

        {/* Mapping Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 border-b font-medium text-gray-700">
                  Original Class Name
                </th>
                <th className="text-left p-3 border-b font-medium text-gray-700">
                  → Map To Standard Den
                </th>
                <th className="text-center p-3 border-b font-medium text-gray-700 w-24">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {allUniqueClasses.map((rawClass, index) => (
                <tr 
                  key={rawClass} 
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="p-3 border-b">
                    <span className="font-mono text-gray-800">{rawClass}</span>
                  </td>
                  <td className="p-3 border-b">
                    <select
                      value={classMapping[rawClass] || ''}
                      onChange={(e) => handleMappingChange(rawClass, e.target.value)}
                      className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-derby-blue ${getMappingStatusColor(rawClass)}`}
                    >
                      <option value="">-- Select Standard Den --</option>
                      {STANDARD_DEN_NAMES.map(name => (
                        <option 
                          key={name} 
                          value={name}
                          className={getStandardDenWarning(name)}
                        >
                          {name} {mappingCounts[name] > 0 && classMapping[rawClass] !== name ? `(${mappingCounts[name]} mapped)` : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 border-b text-center">
                    {classMapping[rawClass] ? (
                      <span className="inline-flex items-center text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-red-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Warning about duplicate mappings */}
        {Object.entries(mappingCounts).some(([name, count]) => count > 1) && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded">
            <h4 className="font-medium text-amber-800 mb-2">⚠️ Multiple Classes Mapped to Same Den</h4>
            <p className="text-amber-700 text-sm">
              The following standard dens have multiple original classes mapped to them. 
              This may cause issues if racers appear in multiple classes:
            </p>
            <ul className="mt-2 text-sm text-amber-700">
              {Object.entries(mappingCounts)
                .filter(([_, count]) => count > 1)
                .map(([name, count]) => (
                  <li key={name}>• {name}: {count} classes mapped</li>
                ))
              }
            </ul>
          </div>
        )}

        {/* Sanity Warnings Display */}
        {sanityWarnings.length > 0 && (
          <div className="mb-6 space-y-3">
            {sanityWarnings.map((warning, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded border ${
                  warning.severity === 'error' 
                    ? 'bg-red-50 border-red-300' 
                    : warning.severity === 'warning'
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`font-medium ${
                      warning.severity === 'error' 
                        ? 'text-red-800' 
                        : warning.severity === 'warning'
                        ? 'text-amber-800'
                        : 'text-blue-800'
                    }`}>
                      {warning.severity === 'error' ? '❌' : warning.severity === 'warning' ? '⚠️' : 'ℹ️'} {warning.message}
                    </h4>
                  </div>
                  {warning.details && warning.details.length > 0 && (
                    <button
                      onClick={() => setShowWarningDetails(prev => ({
                        ...prev,
                        [idx]: !prev[idx]
                      }))}
                      className="text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      {showWarningDetails[idx] ? 'Hide' : 'Show'} details
                    </button>
                  )}
                </div>
                {showWarningDetails[idx] && warning.details && (
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    <ul className="text-sm text-gray-700">
                      {warning.details.map((detail, i) => (
                        <li key={i} className="py-1 border-b border-gray-200 last:border-0">
                          {detail.kidCarYear}
                          {detail.dens && (
                            <span className="text-gray-500 ml-2">
                              (in: {detail.dens.join(', ')})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
          <h4 className="font-medium text-gray-700 mb-2">Standard Den Names</h4>
          <div className="flex flex-wrap gap-2">
            {STANDARD_DEN_NAMES.map(name => (
              <span 
                key={name} 
                className={`px-3 py-1 rounded-full text-sm ${
                  mappingCounts[name] > 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {name} {mappingCounts[name] > 0 && `(${mappingCounts[name]})`}
              </span>
            ))}
          </div>
        </div>

        {/* Not Mapped Warning */}
        {!allMapped && (
          <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded">
            <p className="text-red-700">
              <strong>⚠️ Warning:</strong> Some classes are not mapped. 
              Please select a standard den for all classes before continuing.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleContinue}
            disabled={!allMapped}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              allMapped
                ? 'bg-derby-blue text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClassMapping

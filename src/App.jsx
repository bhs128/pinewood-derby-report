import { useState, useCallback } from 'react'
import FileUpload from './components/FileUpload'
import ClassMapping from './components/ClassMapping'
import ReportSettings from './components/ReportSettings'
import ReportPreview from './components/ReportPreview'
import { parseDatabase, extractIntermediateData } from './utils/sqliteParser'
import { processIntermediateData, downloadMergedDataCSV, viewMergedDataAsHTML } from './utils/dataProcessor'

function App() {
  const [step, setStep] = useState(1)
  const [databases, setDatabases] = useState([])
  const [intermediateData, setIntermediateData] = useState([])
  const [raceData, setRaceData] = useState(null)
  const [classMapping, setClassMapping] = useState(null)
  const [sanityWarnings, setSanityWarnings] = useState([])
  const [settings, setSettings] = useState({
    title: 'Pack Pinewood Derby',
    year: new Date().getFullYear(),
    date: '',
    location: '',
    designAwards: [],
    carPhotos: []
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFilesUploaded = useCallback(async (files) => {
    setLoading(true)
    setError(null)
    
    try {
      const parsedDatabases = []
      const intermediateDataSets = []
      const currentYear = settings.year
      
      for (const file of files) {
        const db = await parseDatabase(file)
        parsedDatabases.push({
          name: file.name,
          db: db
        })
        
        // Extract intermediate data with year
        const intermediate = extractIntermediateData(db, currentYear)
        intermediateDataSets.push({
          ...intermediate,
          fileName: file.name
        })
      }
      
      setDatabases(parsedDatabases)
      setIntermediateData(intermediateDataSets)
      
      // Move to class mapping step
      setStep(2)
    } catch (err) {
      setError(`Error processing file: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [settings.year])

  const handleMappingComplete = useCallback((mapping) => {
    setLoading(true)
    setError(null)
    
    try {
      setClassMapping(mapping)
      
      // Process all data with the mapping
      const processed = processIntermediateData(
        intermediateData,
        mapping,
        settings.year
      )
      
      setRaceData(processed)
      
      // Store sanity warnings separately for display
      if (processed.sanityCheck) {
        setSanityWarnings(processed.sanityCheck.warnings)
      }
      
      // Auto-detect some settings from data
      if (processed.classes.length > 0) {
        setSettings(prev => ({
          ...prev,
          racerCount: processed.racers.length
        }))
      }
      
      setStep(3)
    } catch (err) {
      setError(`Error processing data: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [intermediateData, settings.year])

  const handleSettingsComplete = useCallback((newSettings) => {
    // If year changed, re-process data
    if (newSettings.year !== settings.year && classMapping) {
      setLoading(true)
      try {
        // Re-extract intermediate data with new year
        const intermediateDataSets = []
        for (const { db, name } of databases) {
          const intermediate = extractIntermediateData(db, newSettings.year)
          intermediateDataSets.push({
            ...intermediate,
            fileName: name
          })
        }
        setIntermediateData(intermediateDataSets)
        
        // Re-process with new year
        const processed = processIntermediateData(
          intermediateDataSets,
          classMapping,
          newSettings.year
        )
        setRaceData(processed)
        
        if (processed.sanityCheck) {
          setSanityWarnings(processed.sanityCheck.warnings)
        }
      } catch (err) {
        setError(`Error re-processing data: ${err.message}`)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    setSettings(prev => ({ ...prev, ...newSettings }))
    setStep(4)
  }, [classMapping, databases, settings.year])

  const handleBack = useCallback(() => {
    setStep(prev => Math.max(1, prev - 1))
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-derby-blue text-white py-4 shadow-lg no-print">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold">🏎️ Pinewood Derby Report Generator</h1>
          <p className="text-blue-200 text-sm">Generate professional PDF reports from GrandPrix Race Manager data</p>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b no-print">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center space-x-4">
            {[
              { num: 1, label: 'Upload Data' },
              { num: 2, label: 'Map Classes' },
              { num: 3, label: 'Configure' },
              { num: 4, label: 'Preview & Export' }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step >= s.num ? 'bg-derby-blue text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {s.num}
                </div>
                <span className={`ml-2 ${step >= s.num ? 'text-derby-blue font-medium' : 'text-gray-400'}`}>
                  {s.label}
                </span>
                {i < 3 && <div className={`w-16 h-1 mx-4 ${step > s.num ? 'bg-derby-blue' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 no-print">
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-derby-blue mx-auto"></div>
              <p className="mt-4 text-gray-600">Processing database...</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <FileUpload onFilesUploaded={handleFilesUploaded} />
        )}

        {step === 2 && intermediateData.length > 0 && (
          <ClassMapping
            intermediateData={intermediateData}
            year={settings.year}
            onMappingComplete={handleMappingComplete}
            onBack={handleBack}
          />
        )}

        {step === 3 && raceData && (
          <>
            {/* Sanity Check Warnings */}
            {sanityWarnings.length > 0 && (
              <div className="mb-6 max-w-5xl mx-auto">
                {sanityWarnings.map((warning, idx) => (
                  <div 
                    key={idx}
                    className={`mb-3 p-4 rounded border ${
                      warning.severity === 'error' 
                        ? 'bg-red-50 border-red-300' 
                        : warning.severity === 'warning'
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <h4 className={`font-medium ${
                      warning.severity === 'error' 
                        ? 'text-red-800' 
                        : warning.severity === 'warning'
                        ? 'text-amber-800'
                        : 'text-blue-800'
                    }`}>
                      {warning.severity === 'error' ? '❌' : warning.severity === 'warning' ? '⚠️' : 'ℹ️'} {warning.message}
                    </h4>
                    {warning.details && warning.details.length > 0 && warning.details.length <= 5 && (
                      <ul className="mt-2 text-sm text-gray-600">
                        {warning.details.map((detail, i) => (
                          <li key={i}>
                            {detail.kidCarYear}
                            {detail.dens && ` (in: ${detail.dens.join(', ')})`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Merged Data Export Options */}
            {raceData.mergedData && raceData.mergedData.length > 0 && (
              <div className="mb-6 max-w-5xl mx-auto p-4 bg-gray-50 border border-gray-200 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-700">Merged Data Table</h4>
                    <p className="text-sm text-gray-500">
                      {raceData.mergedData.length} records from all uploaded files
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => viewMergedDataAsHTML(raceData.mergedData, `Race Data - ${settings.year}`)}
                      className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Table
                    </button>
                    <button
                      onClick={() => downloadMergedDataCSV(raceData.mergedData, `pinewood_derby_${settings.year}`)}
                      className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download CSV
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <ReportSettings 
              raceData={raceData}
              settings={settings}
              onComplete={handleSettingsComplete}
              onBack={handleBack}
            />
          </>
        )}

        {step === 4 && raceData && (
          <ReportPreview 
            raceData={raceData}
            settings={settings}
            onBack={handleBack}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-4 mt-8 no-print">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>Open source project - <a href="https://github.com/yourusername/pinewood-derby-report" className="text-blue-400 hover:underline">View on GitHub</a></p>
          <p className="mt-1">Data is processed entirely in your browser. Your files are never uploaded to any server.</p>
        </div>
      </footer>
    </div>
  )
}

export default App

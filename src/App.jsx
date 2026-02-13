import { useState, useCallback } from 'react'
import FileUpload from './components/FileUpload'
import ReportSettings from './components/ReportSettings'
import ReportPreview from './components/ReportPreview'
import { parseDatabase } from './utils/sqliteParser'
import { processRaceData } from './utils/dataProcessor'

function App() {
  const [step, setStep] = useState(1)
  const [databases, setDatabases] = useState([])
  const [raceData, setRaceData] = useState(null)
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
      
      for (const file of files) {
        const db = await parseDatabase(file)
        parsedDatabases.push({
          name: file.name,
          db: db
        })
      }
      
      setDatabases(parsedDatabases)
      
      // Process all databases into unified race data
      const processed = processRaceData(parsedDatabases)
      setRaceData(processed)
      
      // Auto-detect some settings from data
      if (processed.classes.length > 0) {
        setSettings(prev => ({
          ...prev,
          racerCount: processed.racers.length
        }))
      }
      
      setStep(2)
    } catch (err) {
      setError(`Error processing file: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSettingsComplete = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
    setStep(3)
  }, [])

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
              { num: 2, label: 'Configure' },
              { num: 3, label: 'Preview & Export' }
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
                {i < 2 && <div className={`w-16 h-1 mx-4 ${step > s.num ? 'bg-derby-blue' : 'bg-gray-200'}`} />}
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

        {step === 2 && raceData && (
          <ReportSettings 
            raceData={raceData}
            settings={settings}
            onComplete={handleSettingsComplete}
            onBack={handleBack}
          />
        )}

        {step === 3 && raceData && (
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
